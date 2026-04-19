import { init } from "npm:@instantdb/admin";

export function normalizePhone(phone?: string): string | undefined {
  if (!phone) return undefined;

  let cleaned = phone.replace(/[^\d+]/g, "");

  if (cleaned.includes("+")) {
    const hasLeadingPlus = cleaned.startsWith("+");
    cleaned = cleaned.replace(/\+/g, "");
    if (hasLeadingPlus) {
      cleaned = "+" + cleaned;
    }
  }

  if (!cleaned) return undefined;

  if (!cleaned.startsWith("+")) {
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }
    if (cleaned.length === 11 && cleaned.startsWith("1")) {
      return `+${cleaned}`;
    }
    return cleaned;
  }

  return cleaned;
}

const db = init({
  appId: "6818f05d-46f3-4622-9aaf-dcd14e067e9e",
  adminToken: Deno.env.get("INSTANT_ADMIN_TOKEN") ?? "",
});

async function main() {
  const { profiles } = await db.query({
    profiles: {},
  });

  const txs = [];
  for (const p of profiles) {
    if (p.phone) {
      const normalized = normalizePhone(p.phone);
      if (normalized && normalized !== p.phone) {
        txs.push(db.tx.profiles[p.id].update({ phone: normalized }));
        console.log(`Will update ${p.name}: ${p.phone} -> ${normalized}`);
      }
    }
  }

  console.log(`Found ${txs.length} profiles to update`);

  if (txs.length > 0) {
    for (let i = 0; i < txs.length; i += 50) {
      const chunk = txs.slice(i, i + 50);
      await db.transact(chunk);
      console.log(`Committed chunk ${i / 50 + 1}`);
    }
    console.log("Backfill complete!");
  }
}

main();
