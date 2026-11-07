import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    // Rome Protocol Hadrian Testnet (Settles on Solana Devnet)
    hadrian: {
      url: process.env.HADRIAN_RPC_URL || "https://hadrian.testnet.romeprotocol.xyz/",
      chainId: 200010,
      accounts: [PRIVATE_KEY],
      // Hadrian gas token is USDC (6 decimals)
      gasPrice: "auto",
    },
    // Rome Protocol Rubicon Mainnet (Settles on Solana Mainnet)
    rubicon: {
      url: process.env.RUBICON_RPC_URL || "https://rubicon.mainnet.romeprotocol.xyz/",
      chainId: 7531,
      accounts: [PRIVATE_KEY],
      gasPrice: "auto",
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 60000,
  },
};

export default config;
