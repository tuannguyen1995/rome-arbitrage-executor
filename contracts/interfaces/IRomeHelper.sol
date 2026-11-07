// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IRomeHelper
 * @notice Interface for Rome Protocol Helper Precompile (0xFF00000000000000000000000000000000000009).
 * Provides utilities for Associated Token Account (ATA) derivation, PDA calculation,
 * lamport conversion, and single-state SPL token operations.
 */
interface IRomeHelper {
    function create_ata(address user) external;
    function create_ata(address user, bytes32 mint) external;
    function create_ata_for_key(bytes32 wallet, bytes32 mint) external;
    function create_pda(address user) external;
    function create_pda(address user, uint64 lamports) external;
    function swap_gas_to_lamports(uint64 lamports) external;
    function transfer_lamports(address to, uint64 lamports) external;
    function transfer_spl(address to, uint64 tokens) external;
    function transfer_spl(bytes32 to_ata, uint64 tokens) external;
    function transfer_spl(address to, uint64 tokens, bytes32 mint) external;
    function transfer_spl(bytes32 to_ata, uint64 tokens, bytes32 mint) external;
    function transfer_spl(bytes32 src_ata, bytes32 to_ata, uint64 tokens, bytes32 mint) external;
    function transfer_spl(address from, address to, uint64 tokens, bytes32 mint) external;
    function approve_spl(address spender, uint64 amount, bytes32 mint) external;
    function approve_spl_raw_delegate(bytes32 src_ata, bytes32 delegate, uint64 amount, bytes32 mint, uint8 decimals) external;
    function mint_spl(address to, uint64 amount, bytes32 mint) external;

    function pda(address user) external view returns (bytes32);
    function pda_with_salt(address user, bytes32 salt) external view returns (bytes32);
    function ata(address user) external view returns (bytes32);
    function ata(address user, bytes32 mint) external view returns (bytes32);
    function user_balance(address account, bytes32 mint) external view returns (uint64);
    function allowance_of(address owner, address spender, bytes32 mint) external view returns (uint64);
}
