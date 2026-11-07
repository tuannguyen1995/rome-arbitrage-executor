// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IRomeCPI.sol";
import "../interfaces/IRomeHelper.sol";
import "../interfaces/IERC20.sol";

/**
 * @title MockERC20
 * @notice Test token with custom decimals and open minting for unit testing.
 */
contract MockERC20 is IERC20 {
    string public override name;
    string public override symbol;
    uint8 public override decimals;
    uint256 public override totalSupply;

    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public override allowance;

    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    function transfer(address recipient, uint256 amount) external override returns (bool) {
        require(balanceOf[msg.sender] >= amount, "MockERC20: Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[recipient] += amount;
        emit Transfer(msg.sender, recipient, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) external override returns (bool) {
        require(balanceOf[sender] >= amount, "MockERC20: Insufficient balance");
        if (allowance[sender][msg.sender] != type(uint256).max) {
            require(allowance[sender][msg.sender] >= amount, "MockERC20: Insufficient allowance");
            allowance[sender][msg.sender] -= amount;
        }
        balanceOf[sender] -= amount;
        balanceOf[recipient] += amount;
        emit Transfer(sender, recipient, amount);
        return true;
    }
}

/**
 * @title MockRomeCPI
 * @notice Simulates Rome Protocol CPI Precompile (0xFF00...08) for local unit testing.
 */
contract MockRomeCPI is IRomeCPI {
    uint256 public invokeCount;
    uint256 public invokeSignedCount;

    bytes32 public lastProgramId;
    bytes public lastInstructionData;
    bytes32[] public lastSalts;

    // Simulation hooks: when CPI is called, can trigger simulated balance transfers
    address public simulationToken;
    address public simulationBeneficiary;
    uint256 public simulationPnlAmount; // can add tokens to simulate profit
    bool public shouldFail;

    function setSimulation(
        address token,
        address beneficiary,
        uint256 pnlAmount,
        bool fail
    ) external {
        simulationToken = token;
        simulationBeneficiary = beneficiary;
        simulationPnlAmount = pnlAmount;
        shouldFail = fail;
    }

    function invoke(
        bytes32 program_id,
        AccountMeta[] memory accounts,
        bytes memory data
    ) external override {
        require(!shouldFail, "MockRomeCPI: Simulated Solana execution failure");
        invokeCount++;
        lastProgramId = program_id;
        lastInstructionData = data;

        if (simulationToken != address(0) && simulationPnlAmount > 0) {
            MockERC20(simulationToken).mint(simulationBeneficiary, simulationPnlAmount);
        }
    }

    function invoke_signed(
        bytes32 program_id,
        AccountMeta[] memory accounts,
        bytes memory data,
        bytes32[] memory seeds
    ) external override {
        require(!shouldFail, "MockRomeCPI: Simulated Solana signed execution failure");
        invokeSignedCount++;
        lastProgramId = program_id;
        lastInstructionData = data;
        lastSalts = seeds;

        if (simulationToken != address(0) && simulationPnlAmount > 0) {
            MockERC20(simulationToken).mint(simulationBeneficiary, simulationPnlAmount);
        }
    }

    function account_info(bytes32 pubkey) external pure override returns (
        uint64 lamports,
        bytes32 owner,
        bool is_signer,
        bool is_writable,
        bool executable,
        bytes memory data
    ) {
        return (1000000, bytes32(0), false, false, false, new bytes(0));
    }

    function account_data_at(bytes32, uint16, uint16 length) external pure override returns (bytes memory) {
        return new bytes(length);
    }

    function account_u64_at(bytes32, uint16) external pure override returns (uint64) {
        return 1000000;
    }

    function account_lamports(bytes32) external pure override returns (uint64) {
        return 5000000;
    }
}

/**
 * @title MockRomeHelper
 * @notice Simulates Rome Protocol Helper Precompile (0xFF00...09)
 */
contract MockRomeHelper is IRomeHelper {
    mapping(address => uint64) public pdaLamports;

    function create_ata(address) external override {}
    function create_ata(address, bytes32) external override {}
    function create_ata_for_key(bytes32, bytes32) external override {}
    function create_pda(address) external override {}
    function create_pda(address user, uint64 lamports) external override {
        pdaLamports[user] += lamports;
    }
    function swap_gas_to_lamports(uint64) external override {}
    function transfer_lamports(address to, uint64 lamports) external override {
        pdaLamports[to] += lamports;
    }
    function transfer_spl(address, uint64) external override {}
    function transfer_spl(bytes32, uint64) external override {}
    function transfer_spl(address, uint64, bytes32) external override {}
    function transfer_spl(bytes32, uint64, bytes32) external override {}
    function transfer_spl(bytes32, bytes32, uint64, bytes32) external override {}
    function transfer_spl(address, address, uint64, bytes32) external override {}
    function approve_spl(address, uint64, bytes32) external override {}
    function approve_spl_raw_delegate(bytes32, bytes32, uint64, bytes32, uint8) external override {}
    function mint_spl(address, uint64, bytes32) external override {}

    function pda(address user) external pure override returns (bytes32) {
        return bytes32(uint256(uint160(user)));
    }
    function pda_with_salt(address user, bytes32 salt) external pure override returns (bytes32) {
        return keccak256(abi.encodePacked(user, salt));
    }
    function ata(address user) external pure override returns (bytes32) {
        return keccak256(abi.encodePacked(user, "ATA"));
    }
    function ata(address user, bytes32 mint) external pure override returns (bytes32) {
        return keccak256(abi.encodePacked(user, mint));
    }
    function user_balance(address, bytes32) external pure override returns (uint64) {
        return 1000000;
    }
    function allowance_of(address, address, bytes32) external pure override returns (uint64) {
        return type(uint64).max;
    }
}

/**
 * @title MockEvmRouter
 * @notice Simulates Uniswap V3 / DEX swap router for EVM swaps
 */
contract MockEvmRouter {
    address public outputToken;
    uint256 public multiplierBps = 10000; // 10000 = 100% (1:1), 10500 = 105%

    function setRate(address _outputToken, uint256 _multiplierBps) external {
        outputToken = _outputToken;
        multiplierBps = _multiplierBps;
    }

    function swapExactTokens(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient
    ) external returns (uint256 amountOut) {
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        amountOut = (amountIn * multiplierBps) / 10000;
        require(amountOut >= minAmountOut, "MockEvmRouter: Slippage exceeded");
        MockERC20(tokenOut).mint(recipient, amountOut);
        return amountOut;
    }
}
