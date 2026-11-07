import { createPublicClient, http, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const rpcUrl = "https://hadrian.testnet.romeprotocol.xyz/";
  const client = createPublicClient({ transport: http(rpcUrl) });

  const pk = process.env.PRIVATE_KEY;
  if (!pk || pk.includes("0000000000000000000000000000000000000000")) {
    console.log("No custom PRIVATE_KEY set in .env. Checking default accounts...");
    return;
  }

  const account = privateKeyToAccount(pk as `0x${string}`);
  console.log(`Checking account: ${account.address}`);

  const balance = await client.getBalance({ address: account.address });
  console.log(`Hadrian Balance: ${formatUnits(balance, 18)} USDC (Gas token)`);
}

main().catch(console.error);
