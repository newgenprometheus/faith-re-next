import { eq } from "drizzle-orm";
import { db } from "@/db";
import { characters } from "@/db/schema";
async function main() {
  const r = await db.query.characters.findFirst({
    where: eq(characters.id, "b292dac4-5d53-48db-b090-8483bc245e29"),
    with: { skills: true },
  });
  if (!r) { console.log("NOT FOUND"); process.exit(1); }
  console.log(`name=${r.name} age=${r.age} xp=${r.xp} hp=${r.currentHp} mhp=${r.currentMental} end=${r.currentEndurance} enduTrain=${r.enduranceTrainings}`);
  const s = Object.fromEntries(r.skills.map((x) => [x.skillName, x.points]));
  console.log("Savoir-Faire=" + s["Savoir-Faire"], "Vitesse de Réaction=" + s["Vitesse de Réaction"], "Autorité=" + s["Autorité"], "Écaillé=" + s["Écaillé"]);
  console.log("total=" + r.skills.reduce((a, x) => a + x.points, 0));
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
