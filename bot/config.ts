import dotenv from "dotenv";
dotenv.config();

export interface BotConfig {
  chainId: number;
  networkName: string;
  evmRpcUrl: string;
  solanaRpcUrl: string;
  gasToken: string;
  gasDecimals: number;
  executorContractAddress: string;
  privateKey: `0x${string}`;
  minProfitUsdc: number; // in USDC (e.g. 0.50 USDC)
  minSpreadPercent: number; // e.g. 0.3%
  maxSlippageBps: number; // e.g. 50 bps = 0.5%
  pollIntervalMs: number;
  precompiles: {
    cpi: `0x${string}`;
    system: `0x${string}`;
    helper: `0x${string}`;
  };
  contracts: {
    uniswapV3Factory: `0x${string}`;
    uniswapV3Router: `0x${string}`;
    meteoraDammFactory: `0x${string}`;
    wusdc: `0x${string}`;
    wsol: `0x${string}`;
  };
  solanaPrograms: {
    romeEvmProgramId: string;
    meteoraDammProgramId: string;
    splTokenProgramId: string;
  };
}

export const CONFIG: BotConfig = {
  chainId: Number(process.env.CHAIN_ID || 200010),
  networkName: process.env.NETWORK_NAME || "Hadrian Testnet",
  evmRpcUrl: process.env.EVM_RPC_URL || "https://hadrian.testnet.romeprotocol.xyz/",
  solanaRpcUrl: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
  gasToken: "USDC",
  gasDecimals: 6,
  executorContractAddress: (process.env.EXECUTOR_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  privateKey: (process.env.PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80") as `0x${string}`,
  minProfitUsdc: Number(process.env.MIN_PROFIT_USDC || 0.1), // 0.10 USDC minimum net profit
  minSpreadPercent: Number(process.env.MIN_SPREAD_PERCENT || 0.25), // 0.25% min spread
  maxSlippageBps: Number(process.env.MAX_SLIPPAGE_BPS || 50), // 50 bps
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS || 2500),
  precompiles: {
    cpi: "0xFF00000000000000000000000000000000000008",
    system: "0xFF00000000000000000000000000000000000007",
    helper: "0xFF00000000000000000000000000000000000009",
  },
  contracts: {
    uniswapV3Factory: "0xD9E32308c160e1B5300B7d3129486c9A47a3D5bD",
    uniswapV3Router: "0x680b7645d0340000000000000000000000000000",
    meteoraDammFactory: "0xd68b355fa3c4488319be740e5ecbe94aa820a3c4",
    wusdc: "0x0952d2330000000000000000000000000000f9b3",
    wsol: "0xc4e29e0f0000000000000000000000000000a113",
  },
  solanaPrograms: {
    romeEvmProgramId: "RPTWwELXAY4KC9ZPHhaxp7Sq1hHtU3HNEgLbSegCcWf",
    meteoraDammProgramId: "Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB", // Meteora Dynamic AMM Program
    splTokenProgramId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  },
};
