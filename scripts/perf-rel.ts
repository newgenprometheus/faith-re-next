import { db } from "@/db";
import { characters } from "@/db/schema";
async function time<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t0 = Date.now(); const r = await fn(); console.log(`${label}: ${Date.now() - t0}ms`); return r;
}
async function main() {
  await time("warmup", () => db.select({ id: characters.id }).from(characters));
  await time("bare findMany (0 relation)", () => db.query.characters.findMany());
  await time("findMany +5 relations", () => db.query.characters.findMany({ with: { skills: true, runesInventory: true, conditions: true, items: true, competencesAlea: true } }));
  await time("findMany +skills only", () => db.query.characters.findMany({ with: { skills: true } }));
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
