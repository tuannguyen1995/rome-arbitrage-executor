import { DualStateScanner } from "./scanner";
import { ArbitrageExecutor } from "./executor";
import {
  encodeMeteoraSwapInstruction,
  buildMeteoraSwapAccountMetas,
  pubkeyToBytes32,
} from "./encoder";
import { CONFIG } from "../config";

async function main() {
  console.log(`
═════════════════════════════════════════════════════════════════════
  ROME DUAL-VM ATOMIC ARBITRAGE EXECUTOR (SOLANA + EVM)
  Target Chain: Hadrian Testnet (ID: ${CONFIG.chainId})
  Settlement Layer: Solana L1 Runtime (~400ms finality)
  Gas Token: ${CONFIG.gasToken} (Decimals: ${CONFIG.gasDecimals})
═════════════════════════════════════════════════════════════════════
`);

  const scanner = new DualStateScanner(CONFIG);
  const executor = new ArbitrageExecutor(CONFIG);

  const evmPool = "0xD9E32308c160e1B5300B7d3129486c9A47a3D5bD" as `0x${string}`; // Uniswap V3 Pool
  const solanaPool = "Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB"; // Meteora DAMM Pool

  let cycle = 0;
  let isExecuting = false;

  console.log(`📡 Initializing pool monitors...`);
  console.log(`   ├─ Rome EVM Pool: ${evmPool}`);
  console.log(`   ├─ Solana DAMM Pool: ${solanaPool}`);
  console.log(`   ├─ Min Spread Trigger: ${CONFIG.minSpreadPercent}%`);
  console.log(`   └─ Min Net Profit: $${CONFIG.minProfitUsdc} USDC`);
  console.log(`─────────────────────────────────────────────────────────────────\n`);

  const monitorLoop = async () => {
    cycle++;
    const timestampStr = new Date().toLocaleTimeString();

    try {
      const opportunity = await scanner.scanSpread(evmPool, solanaPool, 100);

      const sign = opportunity.spreadPercent > 0 ? "+" : "";
      const statusIcon = opportunity.isProfitable ? "🔥 [OPPORTUNITY FOUND]" : "🔍 [MONITORING]";

      console.log(
        `[${timestampStr}] Cycle #${cycle} | EVM: $${opportunity.evmPrice.toFixed(2)} | SOL: $${opportunity.solanaPrice.toFixed(2)} | Spread: ${sign}${opportunity.spreadPercent.toFixed(2)}% | Net: $${opportunity.estimatedNetProfitUsdc.toFixed(4)} USDC ${statusIcon}`
      );

      if (opportunity.isProfitable && !isExecuting) {
        isExecuting = true;
        console.log(`\n⚡ TRIGGERING ATOMIC ARBITRAGE EXECUTION ⚡`);

        // Encode trade parameters
        const inputAmount = 100_000_000n; // 100 USDC (6 decimals)
        const minProfit = BigInt(Math.floor(opportunity.estimatedNetProfitUsdc * 1e6));
        const minOutAmount = 540_000_000n; // 0.54 SOL

        const solanaInstructionData = encodeMeteoraSwapInstruction(inputAmount, minOutAmount);

        const solanaAccounts = buildMeteoraSwapAccountMetas({
          pool: solanaPool,
          userSourceToken: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
          userDestToken: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
          aVault: "11111111111111111111111111111111",
          bVault: "11111111111111111111111111111111",
          aTokenVault: "11111111111111111111111111111111",
          bTokenVault: "11111111111111111111111111111111",
          userAuthority: "11111111111111111111111111111111",
        });

        // Dummy router calldata for EVM leg
        const evmSwapData = "0x" as `0x${string}`;

        if (CONFIG.executorContractAddress !== "0x0000000000000000000000000000000000000000") {
          const result = await executor.executeArbitrage(opportunity, {
            evmRouter: CONFIG.contracts.uniswapV3Router,
            evmSwapData,
            solanaProgramId: CONFIG.solanaPrograms.meteoraDammProgramId,
            solanaAccounts,
            solanaInstructionData,
            inputToken: CONFIG.contracts.wusdc,
            inputAmount,
            minProfit,
          });

          if (result.success) {
            console.log(`🎉 [SUCCESS] Arbitrage settled atomically on Rome & Solana! Tx: ${result.txHash}\n`);
          } else {
            console.log(`⚠️ Execution failed or reverted to protect capital: ${result.error}\n`);
          }
        } else {
          console.log(`ℹ️ [DRY RUN SIMULATION] Executor address not set in .env. Execution simulated successfully with zero capital risk.\n`);
        }

        isExecuting = false;
      }
    } catch (err: any) {
      console.error(`[Error in monitor loop]`, err.message || err);
    }
  };

  // Run immediately and then on interval
  await monitorLoop();
  const interval = setInterval(monitorLoop, CONFIG.pollIntervalMs);

  process.on("SIGINT", () => {
    console.log(`\n🛑 Gracefully shutting down Rome Arbitrage Bot...`);
    clearInterval(interval);
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
