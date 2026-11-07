import { expect } from "chai";
import { PublicKey } from "@solana/web3.js";
import {
  pubkeyToBytes32,
  bytes32ToPubkey,
  encodeMeteoraSwapInstruction,
  buildMeteoraSwapAccountMetas,
  encodeSplTransferCheckedInstruction,
} from "../bot/src/encoder";
import { DualStateScanner } from "../bot/src/scanner";
import { CONFIG } from "../bot/config";

describe("Bot Engine Unit Tests", function () {
  it("should convert Solana PublicKey to bytes32 and back losslessly", function () {
    const originalPubkey = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
    const bytes32Hex = pubkeyToBytes32(originalPubkey);

    expect(bytes32Hex).to.be.a("string");
    expect(bytes32Hex.length).to.equal(66); // 0x + 64 hex chars = 32 bytes

    const recoveredPk = bytes32ToPubkey(bytes32Hex);
    expect(recoveredPk.toBase58()).to.equal(originalPubkey);
  });

  it("should encode Meteora swap instruction into Borsh format correctly", function () {
    const inAmount = 100_000_000n; // 100 USDC
    const minOutAmount = 550_000_000n; // 0.55 SOL

    const encoded = encodeMeteoraSwapInstruction(inAmount, minOutAmount);
    expect(encoded.startsWith("0x")).to.be.true;
    // 8 bytes discriminator + 8 bytes inAmount + 8 bytes minOutAmount = 24 bytes => 48 hex chars + 2 ('0x') = 50 chars
    expect(encoded.length).to.equal(50);
  });

  it("should encode SPL transfer checked instruction correctly", function () {
    const amount = 50_000_000n;
    const decimals = 6;
    const encoded = encodeSplTransferCheckedInstruction(amount, decimals);
    // 1 byte index + 8 bytes amount + 1 byte decimals = 10 bytes => 20 hex chars + 2 ('0x') = 22 chars
    expect(encoded.length).to.equal(22);
  });

  it("should build AccountMeta structs correctly for Rome CPI", function () {
    const metas = buildMeteoraSwapAccountMetas({
      pool: "Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB",
      userSourceToken: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      userDestToken: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      aVault: "11111111111111111111111111111111",
      bVault: "11111111111111111111111111111111",
      aTokenVault: "11111111111111111111111111111111",
      bTokenVault: "11111111111111111111111111111111",
      userAuthority: "11111111111111111111111111111111",
    });

    expect(metas.length).to.equal(9);
    expect(metas[0].pubkey.length).to.equal(66);
    expect(metas[7].is_signer).to.be.true; // userAuthority
  });

  it("should compute spread and net profit with DualStateScanner", async function () {
    const scanner = new DualStateScanner(CONFIG);
    const opportunity = await scanner.scanSpread(
      CONFIG.contracts.uniswapV3Factory,
      "Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB",
      100
    );

    expect(opportunity.pair).to.equal("SOL/USDC");
    expect(opportunity.evmPrice).to.be.above(0);
    expect(opportunity.solanaPrice).to.be.above(0);
    expect(opportunity.recommendedTradeSize).to.equal(100);
    expect(opportunity.estimatedGasCostUsdc).to.be.above(0);
  });
});
