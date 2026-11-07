// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./RomeArbitrageExecutor.sol";
import "../interfaces/IERC20.sol";

interface IFlashBorrower {
    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external returns (bytes32);
}

/**
 * @title FlashLoanReceiver
 * @notice Optional uncollateralized execution hook for RomeArbitrageExecutor.
 * Borrows flash loan liquidity, passes it to the atomic arbitrage executor,
 * repays the flash loan + fee, and accumulates risk-free arbitrage spread in the vault.
 */
contract FlashLoanReceiver is IFlashBorrower {
    bytes32 public constant CALLBACK_SUCCESS = keccak256("ERC3156FlashBorrower.onFlashLoan");

    address public immutable owner;
    RomeArbitrageExecutor public immutable executor;

    event FlashArbitrageExecuted(address indexed token, uint256 borrowed, uint256 fee, uint256 profit);

    modifier onlyOwner() {
        require(msg.sender == owner, "FlashLoanReceiver: Not owner");
        _;
    }

    constructor(address payable _executor) {
        owner = msg.sender;
        executor = RomeArbitrageExecutor(_executor);
    }

    /**
     * @notice Callback for ERC-3156 compliant flash loan providers (Uniswap / Aave / Balancer style)
     */
    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external override returns (bytes32) {
        require(initiator == address(this) || initiator == owner, "FlashLoanReceiver: Untrusted initiator");

        // Decode the arbitrage execution parameters
        RomeArbitrageExecutor.ArbitrageParams memory params = abi.decode(
            data,
            (RomeArbitrageExecutor.ArbitrageParams)
        );

        // Approve executor to use borrowed funds
        IERC20(token).approve(address(executor), amount);

        // Execute atomic cross-market arbitrage
        uint256 profit = executor.executeArbitrageWithTransfer(params);

        // Ensure flash loan repayment: amount + fee
        uint256 totalRepayment = amount + fee;
        IERC20(token).approve(msg.sender, totalRepayment);

        emit FlashArbitrageExecuted(token, amount, fee, profit);

        return CALLBACK_SUCCESS;
    }

    /**
     * @notice Rescue residual profits accumulated in this receiver
     */
    function withdrawProfit(address token, address to) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(to, balance);
        }
    }
}
