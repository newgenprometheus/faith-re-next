import { db } from "@/db";

async function main() {
  const rows = await db.query.characters.findMany({ with: { skills: true } });
  for (const r of rows) {
    console.log(`${r.name}  | id=${r.id} | xp=${r.xp} | hp=${r.currentHp} mhp=${r.currentMental} end=${r.currentEndurance} | enduTrain=${r.enduranceTrainings} | skills=${r.skills.length} | owner=${r.ownerUserId ?? "—"}`);
  }
  console.log("TOTAL:", rows.length);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
