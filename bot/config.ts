import dotenv from "dotenv";
dotenv.config();

export interface BotConfig {
  chainId: number;
  networkName: string;
  evmRpcUrl: string;
  solanaRpcUrl: string;
  gasToken: string;
  gasDecimals: number;
  executorContractAddress: `0x${string}`;
  privateKey: `0x${string}`;
  minProfitUsdc: number; // in USDC
  minSpreadPercent: number; // e.g. 0.25%
  maxSlippageBps: number; // 50 bps = 0.5%
  pollIntervalMs: number;
  precompiles: {
    cpi: `0x${string}`;
    system: `0x${string}`;
    helper: `0x${string}`;
  };
  contracts: {
    uniswapV3Factory: `0x${string}`;
    swapRouter: `0x${string}`;
    quoterV2: `0x${string}`;
    uniswapV2Factory: `0x${string}`;
    uniswapV2Router: `0x${string}`;
    meteoraDammFactory: `0x${string}`;
    multicall3: `0x${string}`;
    romeDexRouter: `0x${string}`;
    wusdc: `0x${string}`;
    wsol: `0x${string}`;
    weth: `0x${string}`;
  };
  solanaPrograms: {
    romeEvmProgramId: string;
    meteoraDammProgramId: string;
    splTokenProgramId: string;
  };
}

export const CONFIG: BotConfig = {
  chainId: Number(process.env.CHAIN_ID || 200010),
  networkName: process.env.NETWORK_NAME || "Rome Hadrian Testnet",
  evmRpcUrl: process.env.EVM_RPC_URL || "https://hadrian.testnet.romeprotocol.xyz/",
  solanaRpcUrl: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
  gasToken: "USDC",
  gasDecimals: 6,
  executorContractAddress: (process.env.EXECUTOR_ADDRESS || "0x08c1b47f9526e2aa190ba6f158a4f3a315a7135b") as `0x${string}`,
  privateKey: (process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000") as `0x${string}`,
  minProfitUsdc: Number(process.env.MIN_PROFIT_USDC || 0.1),
  minSpreadPercent: Number(process.env.MIN_SPREAD_PERCENT || 0.25),
  maxSlippageBps: Number(process.env.MAX_SLIPPAGE_BPS || 50),
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS || 2500),
  precompiles: {
    cpi: "0xFF00000000000000000000000000000000000008",
    system: "0xfF00000000000000000000000000000000000007",
    helper: "0xff00000000000000000000000000000000000009",
  },
  // Ground truth live active contracts verified directly on Rome Hadrian
  contracts: {
    uniswapV3Factory: "0xD9E323088561D40267767b52252595ea9cF1D5bD",
    swapRouter: "0x08CA15F54b2bf33AB695548B08101d7174eF83cA",
    quoterV2: "0x7BdBFbdAEB2ed0E8DA6F7FD8804bE11f86BB68dd",
    uniswapV2Factory: "0x0aE3020964F67c8bA26Cf3dd0589078d3af82572",
    uniswapV2Router: "0x2e24F6cb4d072d38b60966Fb04e698E949717B8c",
    meteoraDammFactory: "0xd68b355f62643de0ec40243cba8f699f959ea3c4",
    multicall3: "0xb7180d3c46632b582b99d9af3daae394fab9ae4c",
    romeDexRouter: "0xF78cc8B035a4dD2c8e0D914462a80AD04ADC51EC",
    wusdc: "0xbce339ba4c3a8de3bb8af1c5539e6ac11da3112d",
    wsol: "0x39f36444fcb79b3e691544aee2a832ebef54ca9f",
    weth: "0x02aeace038269f9961c93d04dcacd6fb3adfa55f",
  },
  solanaPrograms: {
    romeEvmProgramId: "RPTWwELXAY4KC9ZPHhaxp7Sq1hHtU3HNEgLbSegCcWf",
    meteoraDammProgramId: "Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB",
    splTokenProgramId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  },
};
