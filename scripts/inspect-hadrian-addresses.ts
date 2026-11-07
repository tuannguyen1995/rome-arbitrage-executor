import { getContracts } from "@rome-protocol/registry";

const contracts = getContracts(200010);
const targetNames = [
  "UniswapV3Factory",
  "SwapRouter",
  "QuoterV2",
  "MeteoraDAMMv1Factory",
  "Multicall3",
  "RomeDexRouter",
  "UniswapV2Router02",
];

const results: Record<string, string> = {};

for (const name of targetNames) {
  const item = contracts.find((c: any) => c.name === name);
  if (item && item.versions && item.versions.length > 0) {
    const latest = item.versions[item.versions.length - 1];
    results[name] = latest.address;
  }
}

console.log("=== HADRIAN LIVE CONTRACT ADDRESSES ===");
console.log(JSON.stringify(results, null, 2));
