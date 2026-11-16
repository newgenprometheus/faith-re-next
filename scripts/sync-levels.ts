import { db } from "@/db";
import { characters } from "@/db/schema";
import { eq } from "drizzle-orm";
import { calculateAttribute } from "@/lib/skills";
import { calculateLevel } from "@/lib/faith-system";

async function main() {
  console.log("=== SYNCING PLAYERS TO XP-DERIVED LEVELS (FULL BASE STATS, NO OVERRIDES) ===");
  const rows = await db.query.characters.findMany({ with: { skills: true } });
  
  for (const c of rows) {
    const level = calculateLevel(c.xp);
    const skills = Object.fromEntries(c.skills.map((s) => [s.skillName, s.points]));
    const consti = calculateAttribute(skills, "CONSTITUTION");
    const psy = calculateAttribute(skills, "PSYCHÉ");
    
    // Formules: HP = 40 + (level * 20) + CONSTI ; MHP = 40 + (level * 20) + PSYCHÉ
    const maxHp = 40 + (level * 20) + consti;
    const maxMental = 40 + (level * 20) + psy;
    
    console.log(`Character: ${c.name}`);
    console.log(`  XP: ${c.xp} -> Calculated Level: ${level}`);
    console.log(`  CONSTITUTION score: ${consti} -> Max HP: ${maxHp}`);
    console.log(`  PSYCHÉ score: ${psy} -> Max Mental: ${maxMental}`);
    
    await db
      .update(characters)
      .set({
        level: level,
        currentHp: maxHp,
        currentMental: maxMental,
        maxHpOverride: null,
        maxMentalOverride: null,
        updatedAt: new Date()
      })
      .where(eq(characters.id, c.id));
      
    console.log(`  Updated ${c.name} in DB: level=${level}, XP=${c.xp}, HP=${maxHp}/${maxHp}, Mental=${maxMental}/${maxMental}, overrides=null`);
  }
  
  console.log("\nAll players successfully synced to their correct XP levels with base stats.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
