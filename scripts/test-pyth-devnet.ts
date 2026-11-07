import { Connection, PublicKey } from "@solana/web3.js";

async function main() {
  const conn = new Connection("https://api.devnet.solana.com", "confirmed");
  const pythSolDevnet = new PublicKey("J83w4HKfqxUrq3wH7yPWF8Acsq62Jf45Q8vBR28oqMmt");
  const info = await conn.getAccountInfo(pythSolDevnet);

  console.log("Pyth SOL Account on Devnet:", info?.data?.length, "bytes");
  if (info && info.data.length >= 240) {
    const magic = info.data.readUInt32LE(0);
    const priceRaw = info.data.readBigInt64LE(208);
    const expo = info.data.readInt32LE(216);
    const price = Number(priceRaw) * 10 ** expo;
    console.log(`Magic: 0x${magic.toString(16)}, Live Pyth SOL Price on Devnet: $${price} USD`);
  }
}

main().catch(console.error);
