import { eq } from "drizzle-orm";
import { db } from "@/db";
import { characters } from "@/db/schema";
async function main() {
  await db.update(characters)
    .set({ maxHpOverride: 76, maxMentalOverride: 77, updatedAt: new Date() })
    .where(eq(characters.id, "b292dac4-5d53-48db-b090-8483bc245e29"));
  const r = await db.query.characters.findFirst({ where: eq(characters.id, "b292dac4-5d53-48db-b090-8483bc245e29") });
  console.log(`Prométhée: HP ${r?.currentHp}/${r?.maxHpOverride}  MHP ${r?.currentMental}/${r?.maxMentalOverride}  (overrides posés)`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
