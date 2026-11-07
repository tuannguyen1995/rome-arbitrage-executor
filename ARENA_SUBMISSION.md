# Rome Arena — Official Builder Application Dossier
> **App Name:** RomeArb (Rome Arbitrage Collider)  
> **Category:** Solidity Apps Using Solana Liquidity  
> **Official Idea Catalogue Match:** #1 Arbitrage Engine / #2 Arbitrage Executor  
> **Target Networks:** Rome Hadrian Testnet (Chain ID `200010`) ➔ Rome Rubicon Mainnet (Chain ID `7531`)  
> **Production App URL:** [https://romearb.vercel.app](https://romearb.vercel.app)  
> **Backup URL:** [https://rome-arb.vercel.app](https://rome-arb.vercel.app)  
> **Public GitHub Repository:** [https://github.com/tuannguyen1995/rome-arbitrage-executor](https://github.com/tuannguyen1995/rome-arbitrage-executor)

---

## 1. Executive Summary & Value Proposition
RomeArb is a production-grade, Rome-native Cross-VM Atomic Arbitrage Vault and Autonomous AI Engine. It executes cross-market arbitrage between Rome EVM liquidity pools (Uniswap V3) and native Solana DAMMs (Meteora / Orca) **within a single Solana transaction (~400ms finality)**.

### Why Rome-Native?
Conventional L2s and cross-chain bridges suffer from:
- 10-20 minutes cross-chain bridging delays.
- Asynchronous execution: If Leg 2 fails, Leg 1 is already settled, causing devastating unhedged impermanent loss or liquidation.
- Fragmented state: Double accounting and bridge hack risks.

**Rome Solves This Completely:**
Because Rome executes a full EVM bytecode interpreter directly inside the Solana runtime, a Solidity contract can invoke Solana programs atomically via Precompile `0xFF00000000000000000000000000000000000008` (CPI Engine). If net profit after gas is less than the defined threshold (`minProfit`), the entire transaction reverts, safely unwinding both EVM and Solana states simultaneously with zero capital loss.

---

## 2. Core Protocol Primitives & Verified Precompiles

| Precompile | Address | Role in RomeArb |
|---|---|---|
| **CPI Engine** | `0xFF00000000000000000000000000000000000008` | Direct cross-program invocation into Solana Meteora DAMM |
| **System Program** | `0xFF00000000000000000000000000000000000007` | External-authority PDA derivation & signature verification |
| **Helper Program** | `0xFF00000000000000000000000000000000000009` | Associated Token Account (ATA) transfers & lamport management |

### Upfront AccountMeta Specification (Solana Sealevel Compliance)
All Solana accounts are declared upfront in the Solidity invocation:
1. `User wUSDC ATA` (Writable)
2. `User wSOL ATA` (Writable)
3. `Meteora DAMM Pool Account` (Writable)
4. `Pool Token A Vault` (Writable)
5. `Pool Token B Vault` (Writable)
6. `SPL Token Program` (Read-only)

---

## 3. Smart Contract Verification & Deployment Facts

- **Network:** Rome Hadrian Testnet (Chain ID `200010`)
- **Gas Token:** Native USDC (6 decimals)
- **Explorer:** `https://via-hadrian.testnet.romeprotocol.xyz/`
- **Primary Vault (`RomeArbitrageExecutor.sol`):**
  - Compiler: `Solidity 0.8.28` (200 optimizer runs)
  - Features: Safe math, reentrancy guards, keeper whitelist, emergency rescue, atomic rollback
- **Uncollateralized Hook (`FlashLoanReceiver.sol`):**
  - Standard: ERC-3156 uncollateralized execution hook

### Verification Command:
```bash
npx hardhat verify --network hadrian <CONTRACT_ADDRESS> "0xFF00000000000000000000000000000000000008" "0xFF00000000000000000000000000000000000009"
```

---

## 4. Dual-Lane Wallet Architecture
RomeArb supports simultaneous dual-runtime connectivity:
- **Solana Native Lane (Phantom):** Uses `window.phantom.solana` to connect directly without EVM network errors, facilitating native Devnet SOL airdrops.
- **EVM Lane (MetaMask):** Seamlessly adds and switches to Rome Hadrian Testnet (`0x30d4a`).

---

## 5. Live DApp Feature Highlights
1. **Interactive CPI Payload & Borsh Inspector:** Full transparent display of bytecode instructions, discriminators, and AccountMeta tables.
2. **Dual Execution Target:** Toggle between `DRY-RUN SIMULATION` and `LIVE ON-CHAIN STRIKE (METAMASK)`.
3. **1-Click Testnet Faucet:** In-app Solana Devnet SOL airdrop + Hadrian USDC claim guide.
4. **Sovereign In-Browser Deployer (Admin Mode):** Secret developer console to deploy, bind, and register vaults directly from the browser.
5. **Real-time Telemetry Stream:** Synchronized slot numbers from Solana Devnet and block numbers from Rome Hadrian EVM.

---

## 6. Laurels & Traction Milestone Roadmap
- [x] **Milestone 1:** Hadrian Testnet Deployment & Test Suite Passing (18/18 Unit Tests).
- [x] **Milestone 2:** Dual-Lane Wallet Integration (MetaMask + Phantom).
- [x] **Milestone 3:** Atomic CPI Precompile `0xFF...08` Execution Engine.
- [x] **Milestone 4:** Full Monorepo Open-Sourced & Production Vercel Deployment.
- [ ] **Milestone 5 (Next):** Register on Rome Arena (`/apps/new`), graduate to Rubicon Mainnet (`7531`), and apply for Rome Builder Grants!
