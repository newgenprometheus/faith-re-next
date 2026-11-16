import { db } from "@/db";
import { characters } from "@/db/schema";
import { calculateLevel, tierLabel, getLevelBonus } from "@/lib/faith-system";

async function main() {
  // 1) Test transaction (bug récup PV/endurance)
  try {
    await db.transaction(async (tx) => {
      await tx.select().from(characters).limit(1);
    });
    console.log("TRANSACTION: OK (supportée par le driver)");
  } catch (e) {
    console.log("TRANSACTION: THROWS →", (e as Error).message);
  }

  // 2) Test relations récentes (migrations b76c2d8/f5d4e49 en prod ?)
  try {
    const c = await db.query.characters.findFirst({
      with: { conditions: true, runesInventory: true, competencesAlea: true },
    });
    console.log(
      "RELATIONS (conditions+runes+competencesAlea): OK",
      c ? `(${c.name})` : "(aucun perso)",
    );
  } catch (e) {
    console.log("RELATIONS: THROWS →", (e as Error).message);
  }

  // 3) Niveaux actuels de tous les persos
  const rows = await db.query.characters.findMany();
  console.log("\n=== NIVEAUX ACTUELS ===");
  for (const r of rows) {
    const lvl = calculateLevel(r.xp);
    console.log(
      `${r.name.padEnd(12)} xp=${String(r.xp).padStart(5)} → niveau=${lvl} ${tierLabel(r.xp)} | bonusHP=${getLevelBonus(lvl)} | hp=${r.currentHp}/${r.currentMental}`,
    );
  }
  process.exit(0);
}
main().catch((e) => {
  console.error("ERR:", e);
  process.exit(1);
});
