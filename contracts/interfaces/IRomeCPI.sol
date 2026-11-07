// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IRomeCPI
 * @notice Interface for Rome Protocol Cross-Program Invocation Precompile (0xFF00000000000000000000000000000000000008).
 * Allows Solidity contracts to invoke Solana programs atomically within the same transaction.
 */
interface IRomeCPI {
    struct AccountMeta {
        bytes32 pubkey;       // 32-byte Solana public key
        bool is_signer;       // True if this account must sign the transaction
        bool is_writable;     // True if this account's data/lamports can be modified
    }

    struct PdaWithBump {
        bytes32 pda;
        uint8 bump;
    }

    /**
     * @notice Execute an unsigned Cross-Program Invocation to a Solana program
     * @param program_id The 32-byte public key of the target Solana program
     * @param accounts Array of Solana AccountMeta declaring all accounts read/written
     * @param data Borsh-serialized instruction data expected by the target program
     */
    function invoke(
        bytes32 program_id,
        AccountMeta[] memory accounts,
        bytes memory data
    ) external;

    /**
     * @notice Execute a signed Cross-Program Invocation using the contract's external-authority PDA
     * @param program_id The 32-byte public key of the target Solana program
     * @param accounts Array of Solana AccountMeta declaring all accounts read/written
     * @param data Borsh-serialized instruction data expected by the target program
     * @param seeds Array of 32-byte seeds used for PDA derivation
     */
    function invoke_signed(
        bytes32 program_id,
        AccountMeta[] memory accounts,
        bytes memory data,
        bytes32[] memory seeds
    ) external;

    /**
     * @notice Fetch Solana account information
     * @return lamports Lamport balance of the account
     * @return owner Program ID owning this account
     * @return is_signer Whether account is marked as signer
     * @return is_writable Whether account is marked as writable
     * @return executable Whether account contains executable program bytecode
     * @return data Raw account byte data
     */
    function account_info(bytes32 pubkey) external view returns (
        uint64 lamports,
        bytes32 owner,
        bool is_signer,
        bool is_writable,
        bool executable,
        bytes memory data
    );

    /**
     * @notice Read a slice of any Solana account's data buffer (CU-optimized)
     */
    function account_data_at(bytes32 pubkey, uint16 offset, uint16 length) external view returns (bytes memory);

    /**
     * @notice Read a u64 Little-Endian value at a known offset in a Solana account
     */
    function account_u64_at(bytes32 pubkey, uint16 offset) external view returns (uint64);

    /**
     * @notice Read lamport balance only (skips data fetch, CU-optimized)
     */
    function account_lamports(bytes32 pubkey) external view returns (uint64);
}
