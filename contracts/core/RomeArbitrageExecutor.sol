// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IRomeCPI.sol";
import "../interfaces/IRomeHelper.sol";
import "../interfaces/IERC20.sol";

/**
 * @title RomeArbitrageExecutor
 * @notice Dual-VM Atomic Arbitrage Vault & CPI Dispatcher for Rome Protocol.
 * Executes cross-market arbitrage legs between Rome EVM AMMs (Uniswap V3 / Rome DEX)
 * and native Solana DAMMs (Meteora / Orca / Raydium) within a SINGLE atomic Solana transaction.
 *
 * If net profit is less than `minProfit`, the entire transaction reverts,
 * rolling back both EVM state and Solana program state atomically via Rome's single-state engine.
 */
contract RomeArbitrageExecutor {
    // ─── Protocol Constants & Precompile Addresses ───────────────────────────
    address public constant DEFAULT_CPI_PROGRAM = address(0xFF00000000000000000000000000000000000008);
    address public constant DEFAULT_SYSTEM_PROGRAM = address(0xfF00000000000000000000000000000000000007);
    address public constant DEFAULT_HELPER_PROGRAM = address(0xff00000000000000000000000000000000000009);

    IRomeCPI public cpiProgram;
    IRomeHelper public helperProgram;

    // ─── Access Control & State ──────────────────────────────────────────────
    address public owner;
    mapping(address => bool) public isKeeper;

    // Reentrancy guard state
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    // ─── Structs ─────────────────────────────────────────────────────────────
    struct ArbitrageParams {
        address evmRouter;
        bytes evmSwapData;
        bytes32 solanaProgramId;
        IRomeCPI.AccountMeta[] solanaAccounts;
        bytes solanaInstructionData;
        bytes32[] salts; // For signed CPI derivation if PDA signs
        address inputToken;
        uint256 inputAmount;
        uint256 minProfit;
    }

    // ─── Events ──────────────────────────────────────────────────────────────
    event ArbitrageExecuted(
        address indexed keeper,
        address indexed inputToken,
        uint256 inputAmount,
        uint256 netProfit,
        uint256 timestamp
    );
    event KeeperUpdated(address indexed keeper, bool active);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event PrecompileAddressesUpdated(address cpi, address helper);
    event TokensRescued(address indexed token, address indexed to, uint256 amount);
    event NativeRescued(address indexed to, uint256 amount);
    event LamportsRescued(address indexed to, uint64 lamports);

    // ─── Modifiers ───────────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "RomeArbitrage: Caller is not owner");
        _;
    }

    modifier onlyAuthorized() {
        require(msg.sender == owner || isKeeper[msg.sender], "RomeArbitrage: Unauthorized keeper");
        _;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "RomeArbitrage: ReentrancyGuard reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    // ─── Constructor ─────────────────────────────────────────────────────────
    constructor(address _customCpi, address _customHelper) {
        owner = msg.sender;
        _status = _NOT_ENTERED;

        address cpiAddr = _customCpi != address(0) ? _customCpi : DEFAULT_CPI_PROGRAM;
        address helperAddr = _customHelper != address(0) ? _customHelper : DEFAULT_HELPER_PROGRAM;

        cpiProgram = IRomeCPI(cpiAddr);
        helperProgram = IRomeHelper(helperAddr);

        isKeeper[msg.sender] = true;
        emit KeeperUpdated(msg.sender, true);
    }

    // ─── Core Execution Logic ────────────────────────────────────────────────

    /**
     * @notice Primary atomic cross-market arbitrage executor.
     * Executes EVM swap and Solana DAMM swap atomically in one single transaction.
     * @param params Arbitrage parameters including routers, calldata, accounts, and profit thresholds.
     * @return netProfit Realized net profit in units of inputToken.
     */
    function executeAtomicArbitrage(ArbitrageParams calldata params)
        external
        onlyAuthorized
        nonReentrant
        returns (uint256 netProfit)
    {
        require(params.inputToken != address(0), "RomeArbitrage: Invalid input token");
        require(params.inputAmount > 0, "RomeArbitrage: Input amount must be > 0");

        IERC20 token = IERC20(params.inputToken);

        // 1. Record starting balance of inputToken in vault
        uint256 initialBalance = token.balanceOf(address(this));
        require(initialBalance >= params.inputAmount, "RomeArbitrage: Insufficient vault balance");

        // 2. Execute EVM Swap leg (e.g. Uniswap V3 / Rome DEX router)
        if (params.evmRouter != address(0) && params.evmSwapData.length > 0) {
            // Approve EVM router to spend input token
            token.approve(params.evmRouter, 0); // Clear allowance for USDT/USDC safety
            token.approve(params.evmRouter, params.inputAmount);

            // Execute the EVM trade
            (bool evmSuccess, bytes memory returnData) = params.evmRouter.call(params.evmSwapData);
            if (!evmSuccess) {
                if (returnData.length > 0) {
                    assembly {
                        let returndata_size := mload(returnData)
                        revert(add(32, returnData), returndata_size)
                    }
                } else {
                    revert("RomeArbitrage: EVM swap leg failed");
                }
            }

            // Reset approval
            token.approve(params.evmRouter, 0);
        }

        // 3. Prepare and invoke Solana leg via Rome CPI Precompile
        if (params.solanaProgramId != bytes32(0) && params.solanaInstructionData.length > 0) {
            if (params.salts.length > 0) {
                // Signed CPI: Signs using the contract's external-authority PDA
                cpiProgram.invoke_signed(
                    params.solanaProgramId,
                    params.solanaAccounts,
                    params.solanaInstructionData,
                    params.salts
                );
            } else {
                // Unsigned CPI: Direct invocation
                cpiProgram.invoke(
                    params.solanaProgramId,
                    params.solanaAccounts,
                    params.solanaInstructionData
                );
            }
        }

        // 4. Query final balance & Enforce Minimum Profitability
        uint256 finalBalance = token.balanceOf(address(this));
        uint256 targetBalance = initialBalance + params.minProfit;

        require(
            finalBalance >= targetBalance,
            "Arbitrage: Unprofitable"
        );

        netProfit = finalBalance - initialBalance;

        emit ArbitrageExecuted(
            msg.sender,
            params.inputToken,
            params.inputAmount,
            netProfit,
            block.timestamp
        );

        return netProfit;
    }

    /**
     * @notice Alternative entrypoint: caller funds the trade, execution runs, and profit + principal returns to caller.
     */
    function executeArbitrageWithTransfer(ArbitrageParams calldata params)
        external
        onlyAuthorized
        nonReentrant
        returns (uint256 netProfit)
    {
        IERC20 token = IERC20(params.inputToken);
        require(
            token.transferFrom(msg.sender, address(this), params.inputAmount),
            "RomeArbitrage: Funding transferFrom failed"
        );

        uint256 initialBalance = token.balanceOf(address(this)) - params.inputAmount;

        // Execute EVM leg
        if (params.evmRouter != address(0) && params.evmSwapData.length > 0) {
            token.approve(params.evmRouter, params.inputAmount);
            (bool evmSuccess, ) = params.evmRouter.call(params.evmSwapData);
            require(evmSuccess, "RomeArbitrage: EVM swap leg failed");
            token.approve(params.evmRouter, 0);
        }

        // Execute Solana CPI leg
        if (params.solanaProgramId != bytes32(0) && params.solanaInstructionData.length > 0) {
            if (params.salts.length > 0) {
                cpiProgram.invoke_signed(
                    params.solanaProgramId,
                    params.solanaAccounts,
                    params.solanaInstructionData,
                    params.salts
                );
            } else {
                cpiProgram.invoke(
                    params.solanaProgramId,
                    params.solanaAccounts,
                    params.solanaInstructionData
                );
            }
        }

        uint256 currentBalance = token.balanceOf(address(this));
        uint256 targetBalance = initialBalance + params.inputAmount + params.minProfit;
        require(currentBalance >= targetBalance, "Arbitrage: Unprofitable");

        netProfit = currentBalance - (initialBalance + params.inputAmount);

        // Return principal + profit to keeper
        require(
            token.transfer(msg.sender, params.inputAmount + netProfit),
            "RomeArbitrage: Return transfer failed"
        );

        emit ArbitrageExecuted(
            msg.sender,
            params.inputToken,
            params.inputAmount,
            netProfit,
            block.timestamp
        );

        return netProfit;
    }

    // ─── Administration & Whitelist ──────────────────────────────────────────

    function setKeeper(address keeper, bool active) external onlyOwner {
        require(keeper != address(0), "RomeArbitrage: Zero address keeper");
        isKeeper[keeper] = active;
        emit KeeperUpdated(keeper, active);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "RomeArbitrage: Zero address owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setPrecompiles(address _cpi, address _helper) external onlyOwner {
        if (_cpi != address(0)) cpiProgram = IRomeCPI(_cpi);
        if (_helper != address(0)) helperProgram = IRomeHelper(_helper);
        emit PrecompileAddressesUpdated(address(cpiProgram), address(helperProgram));
    }

    // ─── Emergency Rescue Functions ──────────────────────────────────────────

    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        require(to != address(0), "RomeArbitrage: Invalid recipient");
        IERC20(token).transfer(to, amount);
        emit TokensRescued(token, to, amount);
    }

    function rescueNative(address payable to, uint256 amount) external onlyOwner {
        require(to != address(0), "RomeArbitrage: Invalid recipient");
        (bool sent, ) = to.call{value: amount}("");
        require(sent, "RomeArbitrage: Native rescue failed");
        emit NativeRescued(to, amount);
    }

    function rescueSolanaLamports(address to, uint64 lamports) external onlyOwner {
        require(to != address(0), "RomeArbitrage: Invalid recipient");
        helperProgram.transfer_lamports(to, lamports);
        emit LamportsRescued(to, lamports);
    }

    // Allow contract to receive native gas tokens (USDC on Hadrian)
    receive() external payable {}
}
