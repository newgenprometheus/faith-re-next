import { db } from "@/db";
import { characters } from "@/db/schema";

async function main() {
  const rows = await db.query.characters.findMany({ with: { skills: true } });
  console.log("\n=== DATABASE CHARACTERS ===");
  for (const c of rows) {
    console.log(`- ID: ${c.id}`);
    console.log(`  Name: ${c.name}`);
    console.log(`  Level: ${c.level}`);
    console.log(`  XP: ${c.xp}`);
    console.log(`  Current HP: ${c.currentHp} / Max HP Override: ${c.maxHpOverride}`);
    console.log(`  Current Mental: ${c.currentMental} / Max Mental Override: ${c.maxMentalOverride}`);
    const skills = Object.fromEntries(c.skills.map((s) => [s.skillName, s.points]));
    console.log(`  Skills count: ${c.skills.length}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
