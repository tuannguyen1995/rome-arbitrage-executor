import { PublicKey } from "@solana/web3.js";
import { keccak256, toHex } from "viem";

/**
 * AccountMeta structure matching Solidity IRomeCPI.AccountMeta:
 * struct AccountMeta {
 *     bytes32 pubkey;
 *     bool is_signer;
 *     bool is_writable;
 * }
 */
export interface RomeAccountMeta {
  pubkey: `0x${string}`;
  is_signer: boolean;
  is_writable: boolean;
}

/**
 * Convert a Solana base58 PublicKey into a 32-byte hex string (bytes32) for Solidity
 */
export function pubkeyToBytes32(pubkey: PublicKey | string): `0x${string}` {
  const pk = typeof pubkey === "string" ? new PublicKey(pubkey) : pubkey;
  const buffer = Buffer.from(pk.toBytes());
  return `0x${buffer.toString("hex")}` as `0x${string}`;
}

/**
 * Convert a 32-byte hex string (bytes32) back to a Solana base58 PublicKey
 */
export function bytes32ToPubkey(bytes32: string): PublicKey {
  const cleanHex = bytes32.startsWith("0x") ? bytes32.slice(2) : bytes32;
  const buffer = Buffer.from(cleanHex, "hex");
  if (buffer.length !== 32) {
    throw new Error(`Invalid bytes32 length: expected 32 bytes, got ${buffer.length}`);
  }
  return new PublicKey(buffer);
}

/**
 * Construct an IRomeCPI.AccountMeta object
 */
export function buildAccountMeta(
  pubkey: PublicKey | string,
  isSigner: boolean,
  isWritable: boolean
): RomeAccountMeta {
  return {
    pubkey: pubkeyToBytes32(pubkey),
    is_signer: isSigner,
    is_writable: isWritable,
  };
}

/**
 * Encode a 64-bit integer into Little-Endian bytes (standard Borsh u64)
 */
export function encodeU64LE(value: bigint | number): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(value), 0);
  return buf;
}

/**
 * Encode Meteora Dynamic AMM swap instruction:
 * Discriminator: 8 bytes (Anchor global:swap discriminator: [0xf8, 0xc6, 0x9e, 0x91, 0xe1, 0x75, 0x87, 0xc8])
 * in_amount: u64 (8 bytes LE)
 * minimum_out_amount: u64 (8 bytes LE)
 */
export function encodeMeteoraSwapInstruction(
  inAmount: bigint,
  minOutAmount: bigint
): `0x${string}` {
  // Anchor instruction discriminator for "global:swap"
  // sha256("global:swap")[0..8] = [248, 198, 158, 145, 225, 117, 135, 200]
  const discriminator = Buffer.from([0xf8, 0xc6, 0x9e, 0x91, 0xe1, 0x75, 0x87, 0xc8]);
  const inAmountBuffer = encodeU64LE(inAmount);
  const minOutAmountBuffer = encodeU64LE(minOutAmount);

  const instructionData = Buffer.concat([
    discriminator,
    inAmountBuffer,
    minOutAmountBuffer,
  ]);

  return `0x${instructionData.toString("hex")}` as `0x${string}`;
}

/**
 * Encode standard SPL Token TransferChecked instruction (Borsh format):
 * instruction_index: u8 (12 = TransferChecked)
 * amount: u64 (8 bytes LE)
 * decimals: u8 (1 byte)
 */
export function encodeSplTransferCheckedInstruction(
  amount: bigint,
  decimals: number
): `0x${string}` {
  const buffer = Buffer.alloc(1 + 8 + 1);
  buffer.writeUInt8(12, 0); // 12 = TransferChecked instruction index
  buffer.writeBigUInt64LE(BigInt(amount), 1);
  buffer.writeUInt8(decimals, 9);

  return `0x${buffer.toString("hex")}` as `0x${string}`;
}

/**
 * Helper to build Meteora DAMM account metas required for swap execution:
 * 1. pool (writable)
 * 2. user_source_token (writable)
 * 3. user_destination_token (writable)
 * 4. a_vault (writable)
 * 5. b_vault (writable)
 * 6. a_token_vault (writable)
 * 7. b_token_vault (writable)
 * 8. a_vault_lp (writable)
 * 9. b_vault_lp (writable)
 * 10. a_vault_lp_mint (writable)
 * 11. b_vault_lp_mint (writable)
 * 12. user_authority (signer, writable)
 * 13. vault_program (readonly)
 * 14. token_program (readonly)
 */
export function buildMeteoraSwapAccountMetas(params: {
  pool: string;
  userSourceToken: string;
  userDestToken: string;
  aVault: string;
  bVault: string;
  aTokenVault: string;
  bTokenVault: string;
  userAuthority: string;
  tokenProgram?: string;
}): RomeAccountMeta[] {
  const tokenProg = params.tokenProgram || "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

  return [
    buildAccountMeta(params.pool, false, true),
    buildAccountMeta(params.userSourceToken, false, true),
    buildAccountMeta(params.userDestToken, false, true),
    buildAccountMeta(params.aVault, false, true),
    buildAccountMeta(params.bVault, false, true),
    buildAccountMeta(params.aTokenVault, false, true),
    buildAccountMeta(params.bTokenVault, false, true),
    buildAccountMeta(params.userAuthority, true, true), // PDA authority signs via invoke_signed
    buildAccountMeta(tokenProg, false, false),
  ];
}
