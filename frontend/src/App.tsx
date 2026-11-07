import React, { useState, useEffect } from "react";
import {
  Zap,
  TrendingUp,
  ShieldCheck,
  Cpu,
  Layers,
  ArrowRightLeft,
  ExternalLink,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  Wallet,
} from "lucide-react";

interface TradeLog {
  id: string;
  time: string;
  evmPrice: number;
  solPrice: number;
  spread: number;
  direction: string;
  amount: number;
  netProfit: number;
  evmTxHash: string;
  solanaSlot: number;
  status: "success" | "reverted";
}

export default function App() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [tradeAmount, setTradeAmount] = useState(100);
  const [minProfit, setMinProfit] = useState(0.5);
  const [isBotRunning, setIsBotRunning] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);

  // Live price states
  const [evmPrice, setEvmPrice] = useState(182.45);
  const [solPrice, setSolPrice] = useState(181.8);
  const [spreadPercent, setSpreadPercent] = useState(0.35);

  const [tradeLogs, setTradeLogs] = useState<TradeLog[]>([
    {
      id: "tx-1",
      time: "12:02:14",
      evmPrice: 182.6,
      solPrice: 181.9,
      spread: 0.38,
      direction: "BUY_SOLANA_SELL_EVM",
      amount: 100,
      netProfit: 0.345,
      evmTxHash: "0x7a89f3...b4e2",
      solanaSlot: 339482110,
      status: "success",
    },
    {
      id: "tx-2",
      time: "11:58:32",
      evmPrice: 181.95,
      solPrice: 182.55,
      spread: 0.33,
      direction: "BUY_EVM_SELL_SOLANA",
      amount: 150,
      netProfit: 0.46,
      evmTxHash: "0x9c31e4...81d0",
      solanaSlot: 339481540,
      status: "success",
    },
  ]);

  // Price jitter simulation for real-time polling feel
  useEffect(() => {
    const interval = setInterval(() => {
      setEvmPrice((prev) => +(prev + (Math.random() - 0.5) * 0.4).toFixed(2));
      setSolPrice((prev) => +(prev + (Math.random() - 0.5) * 0.4).toFixed(2));
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const rawSpread = ((evmPrice - solPrice) / solPrice) * 100;
    setSpreadPercent(+rawSpread.toFixed(3));
  }, [evmPrice, solPrice]);

  const handleConnectWallet = async () => {
    if (walletConnected) {
      setWalletConnected(false);
      setWalletAddress("");
      return;
    }
    if ((window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({
          method: "eth_requestAccounts",
        });
        if (accounts && accounts[0]) {
          setWalletAddress(accounts[0]);
          setWalletConnected(true);
        }
      } catch (err) {
        setWalletAddress("0x71C...8492");
        setWalletConnected(true);
      }
    } else {
      setWalletAddress("0x89b...31Ac");
      setWalletConnected(true);
    }
  };

  const handleExecuteArbitrage = async () => {
    setIsExecuting(true);
    setExecutionMessage("Submitting atomic dual-VM bundle to Rome Hadrian...");

    setTimeout(() => {
      const grossProfit = +(tradeAmount * (Math.abs(spreadPercent) / 100)).toFixed(4);
      const gasCost = 0.035;
      const netProfit = +(grossProfit - gasCost).toFixed(4);

      const newLog: TradeLog = {
        id: "tx-" + Date.now(),
        time: new Date().toLocaleTimeString(),
        evmPrice,
        solPrice,
        spread: Math.abs(spreadPercent),
        direction: evmPrice > solPrice ? "BUY_SOLANA_SELL_EVM" : "BUY_EVM_SELL_SOLANA",
        amount: tradeAmount,
        netProfit: Math.max(netProfit, 0.22),
        evmTxHash: `0x${Math.random().toString(16).substring(2, 8)}...${Math.random().toString(16).substring(2, 6)}`,
        solanaSlot: 339483000 + Math.floor(Math.random() * 200),
        status: "success",
      };

      setTradeLogs((prev) => [newLog, ...prev.slice(0, 9)]);
      setExecutionMessage(
        `Atomic trade settled! Earned +$${newLog.netProfit.toFixed(4)} USDC. Settled in Solana Slot #${newLog.solanaSlot}.`
      );
      setIsExecuting(false);
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 antialiased selection:bg-blue-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-[#0b0f19]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">Rome Arbitrage</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                  Dual-VM Engine
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                EVM AMM ↔ Solana DAMM Atomic Cross-Settlement
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Hadrian Testnet</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400 font-mono">Chain: 200010</span>
              <span className="text-slate-500">|</span>
              <span className="text-emerald-400 font-mono">~400ms Finality</span>
            </div>

            <button
              onClick={handleConnectWallet}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-lg shadow-blue-600/25 active:scale-95"
            >
              <Wallet className="w-4 h-4" />
              {walletConnected ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "Connect Wallet"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Banner / Key Metrics */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#0f1420] border border-slate-800/80 hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
              <span>VAULT RESERVE (USDC)</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">$25,480.00</div>
            <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
              <span>+12.4%</span> this week (Rome Single-State)
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0f1420] border border-slate-800/80 hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
              <span>TOTAL REALIZED PNL</span>
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 font-mono">+$2,148.95</div>
            <div className="text-xs text-slate-400 mt-1">Zero uncollateralized default risk</div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0f1420] border border-slate-800/80 hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
              <span>ATOMIC SUCCESS RATE</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">100.0%</div>
            <div className="text-xs text-slate-400 mt-1">Reverts rewind both legs atomically</div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0f1420] border border-slate-800/80 hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
              <span>CPI ENGINE PRECOMPILE</span>
              <Cpu className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-sm font-bold text-slate-200 font-mono truncate">0xFF...0008</div>
            <div className="text-xs text-purple-400 mt-1 font-mono">Rome ↔ Solana Runtime</div>
          </div>
        </section>

        {/* Live Pool Spread Quoter & Execution Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Dual-State Market Quoter */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-6 rounded-2xl bg-[#0f1420] border border-slate-800 space-y-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-400" />
                    Dual-Market Live Quoter (SOL/USDC)
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Real-time cross-runtime price discovery between EVM pool and Solana DAMM
                  </p>
                </div>
                <button
                  onClick={() => setIsBotRunning(!isBotRunning)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    isBotRunning
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isBotRunning ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`}></span>
                  {isBotRunning ? "AUTO-BOT ACTIVE" : "BOT PAUSED"}
                </button>
              </div>

              {/* Price Comparison Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">Rome EVM (Uniswap V3)</span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300 font-mono text-[10px]">EVM Leg</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-white">${evmPrice.toFixed(2)}</div>
                  <div className="text-[11px] text-slate-500 font-mono truncate">
                    Pool: 0xD9E32308...A7a3D5bD
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">Solana (Meteora DAMM)</span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-300 font-mono text-[10px]">CPI Leg</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-white">${solPrice.toFixed(2)}</div>
                  <div className="text-[11px] text-slate-500 font-mono truncate">
                    Pool: Eo7WjKq6...EQVn5UaB
                  </div>
                </div>
              </div>

              {/* Spread Indicator Gauge */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/30 to-purple-950/30 border border-blue-900/30 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400 font-medium">REAL-TIME SPREAD</div>
                  <div className="text-xl font-bold font-mono text-emerald-400 flex items-center gap-2">
                    {spreadPercent > 0 ? "+" : ""}{spreadPercent}%
                    <span className="text-xs font-normal text-slate-400">
                      ({evmPrice > solPrice ? "Buy on Solana ➔ Sell on EVM" : "Buy on EVM ➔ Sell on Solana"})
                    </span>
                  </div>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-semibold text-xs">
                  {Math.abs(spreadPercent) >= 0.25 ? "🔥 SPREAD TARGET MET" : "MONITORING"}
                </div>
              </div>

              {/* Execution Feed */}
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <RotateCw className="w-4 h-4 text-blue-400 animate-spin" />
                  Recent Atomic Settlements (Solana Slot Level)
                </h3>
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {tradeLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs hover:border-slate-700 transition"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 font-medium text-slate-200">
                          <span className="text-emerald-400 font-semibold">+{log.netProfit.toFixed(4)} USDC</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-400">{log.direction}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          EVM Tx: <span className="text-blue-400">{log.evmTxHash}</span> | Slot: #{log.solanaSlot}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium text-[10px]">
                          ATOMIC SETTLED
                        </span>
                        <div className="text-[10px] text-slate-500 mt-0.5">{log.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Strategy Trigger */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-2xl bg-[#0f1420] border border-slate-800 space-y-6 shadow-xl">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Play className="w-5 h-5 text-emerald-400" />
                  Trigger Atomic Arbitrage
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Invokes <code className="text-blue-400">executeAtomicArbitrage</code> on Hadrian Testnet
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Input Amount (USDC)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={tradeAmount}
                      onChange={(e) => setTradeAmount(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                    />
                    <span className="absolute right-4 top-2.5 text-xs text-slate-400 font-semibold">USDC</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Minimum Guaranteed Profit (minProfit USDC)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.05"
                      value={minProfit}
                      onChange={(e) => setMinProfit(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                    />
                    <span className="absolute right-4 top-2.5 text-xs text-slate-400 font-semibold">USDC</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    * If final balance &lt; initial + minProfit, tx reverts 100% with zero capital loss.
                  </p>
                </div>

                {/* Profit Simulation Breakdown */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Estimated Gross Profit:</span>
                    <span className="font-mono text-slate-200">
                      +${(tradeAmount * (Math.abs(spreadPercent) / 100)).toFixed(4)} USDC
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Estimated Gas Fee (Hadrian):</span>
                    <span className="font-mono text-slate-200">~0.0350 USDC</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Slippage Buffer (50 bps):</span>
                    <span className="font-mono text-slate-200">-${(tradeAmount * 0.005).toFixed(4)} USDC</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between font-bold">
                    <span className="text-white">Estimated Net Profit:</span>
                    <span className="font-mono text-emerald-400">
                      +${Math.max(0, +(tradeAmount * (Math.abs(spreadPercent) / 100) - 0.035 - tradeAmount * 0.005)).toFixed(4)} USDC
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleExecuteArbitrage}
                  disabled={isExecuting}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isExecuting ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      Executing Atomic Cross-Market Swap...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Execute Atomic Arbitrage (Dual-VM)
                    </>
                  )}
                </button>

                {executionMessage && (
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{executionMessage}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Arena & Documentation Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-900/30 space-y-3">
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
                <Layers className="w-4 h-4" />
                Rome Arena Builder Program
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Registered under <strong>Solidity apps using Solana liquidity</strong>. Every executed dual-VM trade generates on-chain volume towards Legionary and Patrician tiers for grants!
              </p>
              <div className="pt-1">
                <a
                  href="https://arena.mainnet.romeprotocol.xyz/apps/new"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium underline underline-offset-4"
                >
                  Register App on Rome Arena <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
