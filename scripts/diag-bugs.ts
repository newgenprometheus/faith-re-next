import { db } from "@/db";
import { characters } from "@/db/schema";
import { sql } from "drizzle-orm";
import { calculateLevel, getLevelBonus, BASE_HP, BASE_MHP } from "@/lib/faith-system";
import { calculateAttribute } from "@/lib/skills";

async function main() {
  console.log("=== FK delete_rule des tables référençant 'character' ===");
  const fks = await db.execute(sql`
    SELECT tc.table_name AS child, rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON rc.unique_constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'character'
    ORDER BY tc.table_name`);
  for (const r of (fks.rows ?? fks) as any[]) console.log(`  ${r.child}: ${r.delete_rule}`);

  console.log("\n=== Persos : level, overrides, max dérivé ===");
  const rows = await db.query.characters.findMany({ with: { skills: true } });
  for (const c of rows) {
    const skills = Object.fromEntries(c.skills.map((s) => [s.skillName, s.points]));
    const lvl = calculateLevel(c.xp);
    const bonus = getLevelBonus(lvl);
    const consti = calculateAttribute(skills, "CONSTITUTION");
    const psy = calculateAttribute(skills, "PSYCHÉ");
    console.log(
      `  ${c.name.padEnd(11)} N${lvl} bonus=${bonus} | maxHpOverride=${c.maxHpOverride ?? "—"} maxMentalOverride=${c.maxMentalOverride ?? "—"} | dérivé HP=${BASE_HP + bonus + consti} MHP=${BASE_MHP + bonus + psy}`,
    );
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
