import { db } from "@/db";
import { characters } from "@/db/schema";
import { eq } from "drizzle-orm";
import { calculateLevel, getLevelBonus, BASE_HP, BASE_MHP } from "@/lib/faith-system";
import { calculateAttribute } from "@/lib/skills";

async function main() {
  const p = await db.query.characters.findFirst({
    where: eq(characters.name, "Prométhée"), with: { skills: true },
  });
  if (!p) { console.log("Prométhée introuvable"); process.exit(1); }
  console.log(`AVANT: maxHpOverride=${p.maxHpOverride} maxMentalOverride=${p.maxMentalOverride}`);
  await db.update(characters)
    .set({ maxHpOverride: null, maxMentalOverride: null, updatedAt: new Date() })
    .where(eq(characters.id, p.id));
  const skills = Object.fromEntries(p.skills.map((s) => [s.skillName, s.points]));
  const lvl = calculateLevel(p.xp);
  const bonus = getLevelBonus(lvl);
  const consti = calculateAttribute(skills, "CONSTITUTION");
  const psy = calculateAttribute(skills, "PSYCHÉ");
  console.log(`APRÈS: override PV/PM retirés → MAX dérivé = ${BASE_HP + bonus + consti} PV / ${BASE_MHP + bonus + psy} PM`);
  console.log(`  (N${lvl}, bonus niveau=${bonus}, CONSTI=${consti}, PSY=${psy} ; grandira à chaque level-up)`);
  console.log(`  endurance/flux overrides inchangés: endu=${p.maxEnduranceOverride ?? "—"} flux=${p.maxFluxOverride ?? "—"}`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
