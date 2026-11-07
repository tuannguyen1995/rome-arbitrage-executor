import { getChain, getTokens, getContracts, getPrograms } from "@rome-protocol/registry";
import { createPublicClient, http, formatUnits } from "viem";
import { Connection } from "@solana/web3.js";

async function main() {
  console.log("=== CHECKING REAL ROME HADRIAN TESTNET (100% LIVE ON-CHAIN) ===");

  const hadrian = getChain(200010);
  console.log("Hadrian Metadata:", {
    chainId: hadrian?.chainId,
    name: hadrian?.name,
    rpcUrl: hadrian?.rpcUrl,
    explorerUrl: hadrian?.explorerUrl,
    romeEvmProgramId: hadrian?.romeEvmProgramId,
    nativeCurrency: hadrian?.nativeCurrency,
    solanaRpc: hadrian?.solana?.rpc,
  });

  const tokens = getTokens(200010);
  console.log("Hadrian Live Tokens:", tokens);

  const contracts = getContracts(200010);
  console.log("Hadrian Live Contracts:", contracts);

  // Live RPC query to Hadrian EVM
  const client = createPublicClient({
    transport: http(hadrian?.rpcUrl || "https://hadrian.testnet.romeprotocol.xyz/"),
  });

  const blockNumber = await client.getBlockNumber();
  const gasPrice = await client.getGasPrice();
  console.log(`\nLive Hadrian EVM Block: ${blockNumber.toString()}`);
  console.log(`Live Hadrian Gas Price: ${formatUnits(gasPrice, 6)} USDC`);

  // Live RPC query to Solana Devnet
  const solanaConn = new Connection(hadrian?.solana?.rpc || "https://api.devnet.solana.com", "confirmed");
  const slot = await solanaConn.getSlot();
  console.log(`Live Solana Settlement Slot: #${slot}`);
}

main().catch(console.error);
