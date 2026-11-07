# 🏛️ RomeArb (Dual-VM Atomic Arbitrage)

Production-grade, Rome-native Arbitrage Engine & Executor for **Rome Protocol**'s **Hadrian Testnet** (Chain ID: `200010`) migrating to **Rubicon Mainnet** (Chain ID: `7531`).

- **Official Web App:** [https://romearb.vercel.app](https://romearb.vercel.app)
- **Mirror Link:** [https://rome-arb.vercel.app](https://rome-arb.vercel.app)
- **GitHub Repository:** [https://github.com/tuannguyen1995/rome-arbitrage-executor](https://github.com/tuannguyen1995/rome-arbitrage-executor)
- **Rome Arena App Portal:** [https://arena.mainnet.romeprotocol.xyz/apps/new](https://arena.mainnet.romeprotocol.xyz/apps/new)

---

## 1. Project Overview & Value Proposition

Traditional cross-chain or L2 arbitrage suffers from high latency, bridge bridge risks, and non-atomic settlement. If one leg fails or front-runs, capital gets stranded.

**Rome Protocol changes the paradigm:**
- Rome executes a real EVM inside the **Solana runtime**.
- A single Solana transaction (~400ms block time) can execute both EVM state transitions and native Solana Cross-Program Invocations (CPI) atomically.
- **Atomic Dual-VM Arbitrage:** `RomeArbitrageExecutor` reads price spreads between Rome EVM AMMs (Uniswap V3 / Rome DEX) and native Solana DAMMs (Meteora / Orca / Raydium), executes both legs via Rome CPI precompiles (`0xFF00...08`), and **reverts completely** if net profit after gas < minimum slippage threshold.

```
                    ┌────────────────────────────────────────────────────────┐
                    │            SINGLE SOLANA RUNTIME TRANSACTION          │
                    │               (~400ms Atomic Settlement)               │
                    └────────────────────────────────────────────────────────┘
                                   │                           │
                    ┌──────────────▼──────────┐ ┌──────────────▼──────────┐
                    │       LEG 1 (EVM)       │ │     LEG 2 (SOLANA CPI)   │
                    │  Uniswap V3 / Rome DEX  │ │  Meteora DAMM / Raydium  │
                    │  Swap Token A -> B      │ │  Swap Token B -> A       │
                    └──────────────┬──────────┘ └──────────────┬──────────┘
                                   │                           │
                                   └──────────────┬────────────┘
                                                  ▼
                                ┌───────────────────────────────────┐
                                │   RomeArbitrageExecutor.sol       │
                                │   Net Profit >= minProfit ?       │
                                │   ✅ Settle / ❌ Atomic Rollback   │
                                └───────────────────────────────────┘
```

---

## 2. Directory Architecture

```text
rome-arbitrage-executor/
├── contracts/
│   ├── interfaces/
│   │   ├── IRomeCPI.sol               # Rome Precompile 0xFF...08 interface
│   │   ├── IRomeHelper.sol            # Rome Precompile 0xFF...09 interface
│   │   └── IERC20.sol                 # Standard ERC20 token interface
│   ├── core/
│   │   ├── RomeArbitrageExecutor.sol  # Primary atomic execution vault & CPI dispatcher
│   │   └── FlashLoanReceiver.sol      # Optional uncollateralized execution hook
│   └── test/
│       └── MockSolanaDamm.sol         # Comprehensive local test simulators
├── bot/
│   ├── src/
│   │   ├── index.ts                   # Main event loop & pool monitor
│   │   ├── scanner.ts                 # Dual-state quoter (EVM reserves vs Solana DAMM accounts)
│   │   ├── encoder.ts                 # Borsh instruction encoder for Solana program CPI calls
│   │   └── executor.ts                # Transaction bundler using viem & Hadrian RPC
│   ├── config.ts                      # Network constants, tokens, & threshold settings
│   └── package.json
├── test/
│   └── RomeArbitrageExecutor.test.ts  # Hardhat unit tests for atomic execution & revert guarantees
├── scripts/
│   └── deploy.ts                      # Automated deployment & verification script
├── hardhat.config.ts                  # Hardhat configuration for Hadrian & Rubicon
├── foundry.toml                       # Foundry configuration
├── package.json
└── README.md
```

---

## 3. Core Technical Constraints & Constants

### Network Specifications
| Parameter | Hadrian Testnet | Rubicon Mainnet |
|---|---|---|
| **Chain ID** | `200010` | `7531` |
| **RPC URL** | `https://hadrian.testnet.romeprotocol.xyz/` | `https://rubicon.mainnet.romeprotocol.xyz/` |
| **Explorer** | `https://via-hadrian.testnet.romeprotocol.xyz/` | `https://via.mainnet.romeprotocol.xyz/` |
| **Gas Token** | **USDC** (6 decimals) | **ROME** |

### Rome Protocol Precompiles
- **`CPI_PROGRAM`**: `0xFF00000000000000000000000000000000000008` (Cross-Program Invocation dispatcher)
- **`SYSTEM_PROGRAM`**: `0xFF00000000000000000000000000000000000007` (PDA derivation, base58 conversions)
- **`HELPER_PROGRAM`**: `0xFF00000000000000000000000000000000000009` (ATA derivation, Lamport & SPL transfers)

### Solana CPI Rules
1. **Upfront Account Declarations:** All Solana accounts accessed must be declared in the `AccountMeta[]` array.
2. **Pubkey Representation:** Solana public keys are represented as `bytes32`.
3. **CPI Depth Limit:** Maximum invocation depth is **4**.
4. **Borsh Encoding:** Instruction payloads are exact Borsh-serialized byte buffers.
5. **Signed Invocations:** Signed CPI calls use `cpiProgram.invoke_signed(...)` with PDA seeds.

---

## 4. Quick Start Guide

### Step 1: Install Dependencies
```bash
# In the project root
npm install
```

### Step 2: Configure Environment
Copy `.env.example` to `.env` and configure your private key:
```bash
cp .env.example .env
```
Ensure your address has at least **0.5 - 1.0 USDC** on Hadrian Testnet for gas fees.

### Step 3: Run Unit Tests
Verify all atomic execution, revert mechanisms, and keeper authorizations:
```bash
npx hardhat test
```

### Step 4: Deploy to Hadrian Testnet
```bash
npx hardhat run scripts/deploy.ts --network hadrian
```

### Step 5: Verify Contract On-Chain
Using Rome CLI:
```bash
rome verify hadrian --path solidity
```
Or with Hardhat:
```bash
npx hardhat verify --network hadrian <EXECUTOR_ADDRESS> "0xFF00000000000000000000000000000000000008" "0xFF00000000000000000000000000000000000009"
```

### Step 6: Start the Arbitrage Scanner & Bot
```bash
# Start dual-state scanner and arbitrage loop
npm run bot
```

---

## 5. Register on Rome Arena to Earn Laurels

1. Go to **[https://arena.mainnet.romeprotocol.xyz/apps/new](https://arena.mainnet.romeprotocol.xyz/apps/new)**.
2. Sign in with your wallet.
3. Register your app:
   - **App Name:** `Rome Arbitrage Executor`
   - **Category:** `Solidity apps using Solana liquidity`
   - **Contract Addresses:** Paste your deployed `RomeArbitrageExecutor` address on Hadrian (`200010`).
4. Start running your bot to generate verified dual-VM volume and climb the Arena tiers (**Legionary → Patrician → Pontifex Maximus**) to qualify for grants!
