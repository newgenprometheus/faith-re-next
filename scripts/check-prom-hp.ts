import { db } from "@/db";
import { characters } from "@/db/schema";
import { eq } from "drizzle-orm";
import { calculateLevel, getLevelBonus, BASE_HP } from "@/lib/faith-system";
import { calculateAttribute } from "@/lib/skills";
async function main() {
  const rows = await db.query.characters.findMany({ with: { skills: true } });
  for (const c of rows) {
    const skills = Object.fromEntries(c.skills.map((s) => [s.skillName, s.points]));
    const lvl = calculateLevel(c.xp);
    const maxHp = c.maxHpOverride ?? BASE_HP + getLevelBonus(lvl) + calculateAttribute(skills, "CONSTITUTION");
    const pctv = maxHp > 0 ? Math.round((c.currentHp / maxHp) * 100) : 0;
    console.log(`${c.name.padEnd(11)} currentHp=${String(c.currentHp).padStart(4)} maxHp=${maxHp} → ${pctv}% ${c.currentHp < 0 ? "(NÉGATIF→bleu)" : pctv < 25 ? "(bas→rouge)" : "(sain→vert)"}`);
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
