import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("══════════════════════════════════════════════════════════════");
  console.log("   ROME ARBITRAGE EXECUTOR - DUAL-VM CONTRACT DEPLOYMENT");
  console.log("══════════════════════════════════════════════════════════════\n");

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log(`🌐 Target Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`👤 Deployer Address: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Deployer Balance (Gas token): ${ethers.formatUnits(balance, 6)} USDC\n`);

  // Protocol precompiles on Rome Protocol
  const CPI_PRECOMPILE = "0xFF00000000000000000000000000000000000008";
  const HELPER_PRECOMPILE = "0xFF00000000000000000000000000000000000009";

  console.log("📦 Deploying RomeArbitrageExecutor...");
  const RomeArbitrageExecutor = await ethers.getContractFactory("RomeArbitrageExecutor");
  const executor = await RomeArbitrageExecutor.deploy(CPI_PRECOMPILE, HELPER_PRECOMPILE);
  await executor.waitForDeployment();
  const executorAddress = await executor.getAddress();

  console.log(`✅ RomeArbitrageExecutor deployed at: ${executorAddress}`);

  console.log("\n📦 Deploying FlashLoanReceiver...");
  const FlashLoanReceiver = await ethers.getContractFactory("FlashLoanReceiver");
  const flashLoanReceiver = await FlashLoanReceiver.deploy(executorAddress);
  await flashLoanReceiver.waitForDeployment();
  const flashLoanReceiverAddress = await flashLoanReceiver.getAddress();

  console.log(`✅ FlashLoanReceiver deployed at: ${flashLoanReceiverAddress}`);

  // Save deployment artifact
  const deploymentInfo = {
    network: network.name,
    chainId: Number(network.chainId),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      RomeArbitrageExecutor: executorAddress,
      FlashLoanReceiver: flashLoanReceiverAddress,
    },
    precompiles: {
      CPI_PROGRAM: CPI_PRECOMPILE,
      HELPER_PROGRAM: HELPER_PRECOMPILE,
    },
  };

  const outputPath = path.join(__dirname, "..", `deployment-${network.name || "network"}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Saved deployment details to: ${outputPath}`);

  console.log("\n──────────────────────────────────────────────────────────────");
  console.log("📋 POST-DEPLOYMENT VERIFICATION & ARENA REGISTRATION GUIDE");
  console.log("──────────────────────────────────────────────────────────────");
  console.log("1. Verify contract using Rome CLI:");
  console.log(`   rome verify hadrian --path solidity\n`);
  console.log("2. Verify contract using Hardhat:");
  console.log(`   npx hardhat verify --network hadrian ${executorAddress} "${CPI_PRECOMPILE}" "${HELPER_PRECOMPILE}"\n`);
  console.log("3. Register your app & link contracts on Rome Arena to start earning Laurels:");
  console.log(`   👉 https://arena.mainnet.romeprotocol.xyz/apps/new`);
  console.log("──────────────────────────────────────────────────────────────\n");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
