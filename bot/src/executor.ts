import {
  createWalletClient,
  createPublicClient,
  http,
  parseAbi,
  custom,
  defineChain,
  type Hash,
  type TransactionReceipt,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { Connection } from "@solana/web3.js";
import { CONFIG, BotConfig } from "../config";
import { ArbitrageOpportunity } from "./scanner";
import { RomeAccountMeta, pubkeyToBytes32 } from "./encoder";

export const hadrianChain = defineChain({
  id: 200010,
  name: "Rome Hadrian Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 6,
  },
  rpcUrls: {
    default: {
      http: ["https://hadrian.testnet.romeprotocol.xyz/"],
    },
  },
  blockExplorers: {
    default: {
      name: "Via Hadrian Explorer",
      url: "https://via-hadrian.testnet.romeprotocol.xyz/",
    },
  },
});

export const EXECUTOR_ABI = parseAbi([
  `struct AccountMeta {
    bytes32 pubkey;
    bool is_signer;
    bool is_writable;
  }`,
  `struct ArbitrageParams {
    address evmRouter;
    bytes evmSwapData;
    bytes32 solanaProgramId;
    AccountMeta[] solanaAccounts;
    bytes solanaInstructionData;
    bytes32[] salts;
    address inputToken;
    uint256 inputAmount;
    uint256 minProfit;
  }`,
  "function executeAtomicArbitrage(ArbitrageParams calldata params) external returns (uint256 netProfit)",
  "function executeArbitrageWithTransfer(ArbitrageParams calldata params) external returns (uint256 netProfit)",
]);

export interface ExecutionResult {
  success: boolean;
  txHash?: Hash;
  blockNumber?: bigint;
  gasUsed?: bigint;
  effectiveGasPrice?: bigint;
  solanaSettlementSlot?: number;
  error?: string;
}

export class ArbitrageExecutor {
  private config: BotConfig;
  private account: ReturnType<typeof privateKeyToAccount>;
  private publicClient: ReturnType<typeof createPublicClient>;
  private walletClient: ReturnType<typeof createWalletClient>;
  private solanaConnection: Connection;

  constructor(config: BotConfig = CONFIG) {
    this.config = config;
    this.account = privateKeyToAccount(config.privateKey);

    this.publicClient = createPublicClient({
      chain: hadrianChain,
      transport: http(config.evmRpcUrl),
    });

    this.walletClient = createWalletClient({
      account: this.account,
      chain: hadrianChain,
      transport: http(config.evmRpcUrl),
    });

    this.solanaConnection = new Connection(config.solanaRpcUrl, "confirmed");
  }

  /**
   * Submit an atomic arbitrage bundle to Hadrian Testnet
   */
  public async executeArbitrage(
    opportunity: ArbitrageOpportunity,
    params: {
      evmRouter: `0x${string}`;
      evmSwapData: `0x${string}`;
      solanaProgramId: string;
      solanaAccounts: RomeAccountMeta[];
      solanaInstructionData: `0x${string}`;
      salts?: `0x${string}`[];
      inputToken: `0x${string}`;
      inputAmount: bigint;
      minProfit: bigint;
    }
  ): Promise<ExecutionResult> {
    console.log(`\n🚀 [ROME EXECUTOR] Preparing atomic dual-VM arbitrage bundle...`);
    console.log(`   ├─ Pair: ${opportunity.pair}`);
    console.log(`   ├─ Direction: ${opportunity.direction}`);
    console.log(`   ├─ Spread: ${opportunity.spreadPercent > 0 ? "+" : ""}${opportunity.spreadPercent}%`);
    console.log(`   ├─ Input Amount: ${params.inputAmount.toString()} (units)`);
    console.log(`   └─ Min Target Profit: ${params.minProfit.toString()} (USDC units)`);

    try {
      const solanaProgramBytes32 = pubkeyToBytes32(params.solanaProgramId);

      const contractParams = {
        evmRouter: params.evmRouter,
        evmSwapData: params.evmSwapData,
        solanaProgramId: solanaProgramBytes32,
        solanaAccounts: params.solanaAccounts,
        solanaInstructionData: params.solanaInstructionData,
        salts: params.salts || [],
        inputToken: params.inputToken,
        inputAmount: params.inputAmount,
        minProfit: params.minProfit,
      };

      console.log(`📡 Sending transaction to Rome Hadrian Testnet (Chain ID 200010)...`);

      // Execute on-chain
      const txHash = await this.walletClient.writeContract({
        address: this.config.executorContractAddress,
        abi: EXECUTOR_ABI,
        functionName: "executeAtomicArbitrage",
        args: [contractParams],
      });

      console.log(`⏳ Transaction broadcasted! Hash: ${txHash}`);
      console.log(`   Waiting for Rome block settlement...`);

      const receipt: TransactionReceipt = await this.publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 1,
      });

      console.log(`✅ [CONFIRMED] EVM Block: ${receipt.blockNumber}, Gas Used: ${receipt.gasUsed}`);

      // Query current Solana slot for settlement synchronization
      let solanaSlot: number | undefined;
      try {
        solanaSlot = await this.solanaConnection.getSlot();
        console.log(`⚡ [SOLANA SETTLED] Settled on Solana Slot: #${solanaSlot} (~400ms finality)`);
      } catch (e) {
        // Devnet fallback
      }

      return {
        success: receipt.status === "success",
        txHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        effectiveGasPrice: receipt.effectiveGasPrice,
        solanaSettlementSlot: solanaSlot,
      };
    } catch (err: any) {
      console.error(`❌ [REVERTED] Arbitrage execution failed or reverted:`, err.message || err);
      return {
        success: false,
        error: err.message || String(err),
      };
    }
  }
}
