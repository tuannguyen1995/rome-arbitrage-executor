import { getContracts } from "@rome-protocol/registry";

const contracts = getContracts(200010);
const oracles = contracts.filter((c: any) => c.name.toLowerCase().includes("oracle") || c.name.toLowerCase().includes("pyth") || c.name.toLowerCase().includes("switchboard"));

console.log("=== HADRIAN LIVE ORACLES ===");
console.log(JSON.stringify(oracles, null, 2));
