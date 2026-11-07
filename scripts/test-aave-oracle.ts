import { createPublicClient, http, parseAbi, formatUnits } from "viem";

async function main() {
  const client = createPublicClient({ transport: http("https://hadrian.testnet.romeprotocol.xyz/") });
  const AAVE_ORACLE = "0xafb20337173c62241B9Fee64ffCd53f6a9Dd90D5";
  const WSOL = "0x39f36444fcb79b3e691544aee2a832ebef54ca9f";
  const WUSDC = "0xbce339ba4c3a8de3bb8af1c5539e6ac11da3112d";

  const abi = parseAbi([
    "function getAssetPrice(address asset) external view returns (uint256)",
  ]);

  try {
    const solPriceRaw = await client.readContract({
      address: AAVE_ORACLE,
      abi,
      functionName: "getAssetPrice",
      args: [WSOL],
    });
    console.log(`Live On-Chain SOL Price from Hadrian AaveOracle: ${formatUnits(solPriceRaw, 8)} USD`);
  } catch (e: any) {
    console.log("AaveOracle query error:", e.message);
  }
}

main().catch(console.error);
