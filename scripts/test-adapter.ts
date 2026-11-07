import { createPublicClient, http, parseAbi } from "viem";

async function main() {
  const client = createPublicClient({ transport: http("https://hadrian.testnet.romeprotocol.xyz/") });
  const pythAdapter = "0x0c9989056acf0ec225f9968e5369dea368a7c044";

  // Let's get code
  const code = await client.getBytecode({ address: pythAdapter });
  console.log("PythPullAdapterImpl bytecode length:", code?.length);
}

main().catch(console.error);
