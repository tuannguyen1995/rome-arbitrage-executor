# RomeArb — Dual-VM Atomic Arbitrage Architecture

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Autonomous Bot
    participant Web as RomeArb DApp (romearb.vercel.app)
    participant EVM as Rome Hadrian EVM (Chain 200010)
    participant Vault as RomeArbitrageExecutor.sol
    participant CPI as Rome Precompile (0xFF...08)
    participant DAMM as Solana DAMM (Meteora / Raydium)

    User->>Web: Initiate Strike (Manual or Autonomous)
    Web->>EVM: Broadcast executeAtomicArbitrage(params)
    Note over EVM,Vault: Block Time: ~400ms (Solana L1 Runtime)
    EVM->>Vault: Validate Whitelist & Record Initial Balance
    Vault->>Vault: Execute Leg 1 (Uniswap V3 Swap Router)
    Vault->>CPI: invoke(programId, AccountMeta[], Borsh_Data)
    CPI->>DAMM: Execute Leg 2 in Solana Sealevel Runtime
    DAMM-->>CPI: Return token output to Vault ATA
    CPI-->>Vault: Invocation Success
    Vault->>Vault: Check: finalBalance >= initialBalance + minProfit
    alt Net Profit >= minProfit
        Vault-->>EVM: Commit Transaction (~400ms Finality)
        EVM-->>Web: Settle in Solana Slot (Success Event)
    else Net Profit < minProfit (Unprofitable or Front-run)
        Vault-->>EVM: Revert ("Arbitrage: Unprofitable")
        Note over EVM,DAMM: Atomic Rollback: EVM & Solana states unwound simultaneously
        EVM-->>Web: Reverted safely (Zero Capital Lost)
    end
```

---

## Technical Specifications
- **Single-State Paradigm:** EVM and Solana read and write the exact same underlying state machine. No custodial bridge, no wrapped debt tokens.
- **Maximum CPI Depth:** 4 levels (strict adherence to Solana Sealevel limits).
- **Instruction Data Format:** Borsh binary serialized buffers with 1-byte discriminators and little-endian integers.
- **Gas Token:** USDC on Hadrian Testnet, ROME on Rubicon Mainnet.
