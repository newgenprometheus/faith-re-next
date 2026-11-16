import { getCampaignContext } from "@/lib/campaign";
import { loadAllCharacters } from "@/lib/load-character";

async function time<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t0 = Date.now();
  const r = await fn();
  console.log(`${label}: ${Date.now() - t0}ms`);
  return r;
}
async function main() {
  await time("getCampaignContext #1 (cold)", getCampaignContext);
  await time("getCampaignContext #2 (warm)", getCampaignContext);
  await time("getCampaignContext #3 (warm)", getCampaignContext);
  const chars = await time("loadAllCharacters (5 relations)", loadAllCharacters);
  console.log(`  → ${chars.length} persos, ${chars.filter((c) => c.avatarUrl).length} avec avatar`);
  const sizes = chars.map((c) => (c.avatarUrl ? c.avatarUrl.length : 0));
  console.log(`  → poids avatars (chars base64): ${sizes.reduce((a, b) => a + b, 0)} total`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
