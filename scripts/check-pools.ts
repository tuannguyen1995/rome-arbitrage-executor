import { createPublicClient, http, parseAbi } from "viem";

async function main() {
  const client = createPublicClient({ transport: http("https://hadrian.testnet.romeprotocol.xyz/") });
  
  const V2_FACTORY = "0x4296dfa207223e74a87c14a2fbfd591dfaa5b861";
  const V3_FACTORY = "0x9c0d3B1EBe19592ecd584023bEd0D607FfeebcCA";
  const WSOL = "0x39f36444fcb79b3e691544aee2a832ebef54ca9f";
  const WUSDC = "0xbce339ba4c3a8de3bb8af1c5539e6ac11da3112d";

  const v2Abi = parseAbi(["function getPair(address, address) external view returns (address)"]);
  const v3Abi = parseAbi(["function getPool(address, address, uint24) external view returns (address)"]);

  const pairV2 = await client.readContract({
    address: V2_FACTORY,
    abi: v2Abi,
    functionName: "getPair",
    args: [WSOL, WUSDC],
  });
  console.log("Uniswap V2 Pair for WSOL/WUSDC on Hadrian:", pairV2);

  for (const fee of [500, 3000, 10000]) {
    const poolV3 = await client.readContract({
      address: V3_FACTORY,
      abi: v3Abi,
      functionName: "getPool",
      args: [WSOL, WUSDC, fee],
    });
    console.log(`Uniswap V3 Pool (${fee/10000}%) on Hadrian:`, poolV3);
  }
}

main().catch(console.error);
