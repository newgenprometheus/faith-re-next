import { db } from "@/db";
import { characters } from "@/db/schema";
import { eq } from "drizzle-orm";
import { calculateAttribute } from "@/lib/skills";

async function main() {
  console.log("=== RESETTING PLAYERS TO LEVEL 0 (NO OVERRIDES) ===");
  const rows = await db.query.characters.findMany({ with: { skills: true } });
  
  for (const c of rows) {
    const skills = Object.fromEntries(c.skills.map((s) => [s.skillName, s.points]));
    const consti = calculateAttribute(skills, "CONSTITUTION");
    const psy = calculateAttribute(skills, "PSYCHÉ");
    
    const baseHp = 40 + consti;
    const baseMental = 40 + psy;
    
    console.log(`Character: ${c.name}`);
    console.log(`  CONSTITUTION score: ${consti} -> Base HP: ${baseHp}`);
    console.log(`  PSYCHÉ score: ${psy} -> Base Mental: ${baseMental}`);
    
    await db
      .update(characters)
      .set({
        xp: 0,
        level: 0,
        currentHp: baseHp,
        currentMental: baseMental,
        maxHpOverride: null,
        maxMentalOverride: null,
        updatedAt: new Date()
      })
      .where(eq(characters.id, c.id));
      
    console.log(`  Updated ${c.name} in DB: level=0, xp=0, HP=${baseHp}/${baseHp}, Mental=${baseMental}/${baseMental}, overrides=null`);
  }
  
  console.log("\nAll players successfully reset.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
