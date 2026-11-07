import { getContracts } from "@rome-protocol/registry";

const contracts = getContracts(200010);
console.log("=== ALL LIVE CONTRACTS ON HADRIAN (status: live) ===");
for (const c of contracts) {
  const liveVer = (c.versions || []).find((v: any) => v.status === "live");
  if (liveVer) {
    console.log(`${c.name}: ${liveVer.address} (v${liveVer.version})`);
  }
}
