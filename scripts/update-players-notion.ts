import { db } from "@/db";
import { characters } from "@/db/schema";
import { eq } from "drizzle-orm";
import { calculateAttribute } from "@/lib/skills";

async function main() {
  console.log("=== UPDATING PLAYERS TO NOTION XP & STATS ===");
  const rows = await db.query.characters.findMany({ with: { skills: true } });
  
  for (const c of rows) {
    let xp = 0;
    let level = 0;
    
    if (c.name === "Prométhée") {
      xp = 1050; // Corentin: 450 + 600 = 1050 XP
      level = 2; // Level 2
    } else if (c.name === "Brad") {
      xp = 450; // Brad: 450 XP
      level = 0; // Level 0
    } else {
      continue;
    }
    
    const skills = Object.fromEntries(c.skills.map((s) => [s.skillName, s.points]));
    const consti = calculateAttribute(skills, "CONSTITUTION");
    const psy = calculateAttribute(skills, "PSYCHÉ");
    
    const maxHp = 40 + (level * 20) + consti;
    const maxMental = 40 + (level * 20) + psy;
    
    await db
      .update(characters)
      .set({
        xp: xp,
        level: level,
        currentHp: maxHp,
        currentMental: maxMental,
        maxHpOverride: null,
        maxMentalOverride: null,
        updatedAt: new Date()
      })
      .where(eq(characters.id, c.id));
      
    console.log(`Updated ${c.name}: level=${level}, XP=${xp}, HP=${maxHp}/${maxHp}, Mental=${maxMental}/${maxMental}`);
  }
  
  console.log("\nNotion sync complete.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
