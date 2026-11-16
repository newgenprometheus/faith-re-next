import { db } from "@/db";
import { characters, characterSkills, publicRolls } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

async function main() {
  // 1) Crée un perso test + un skill + un public_roll qui le référence
  const [c] = await db.insert(characters).values({
    name: "ZZ-TEST-DELETE", nom: "", age: 25, xp: 0, enduranceTrainings: 2,
    fluxTrainings: 0, technicalTrainings: 0, combatsReal: 0, fatePoints: 2,
    currentHp: 45, currentMental: 45, currentEndurance: 250, currentFlux: 100,
    runes: ["", "", ""], isPresent: 0,
  }).returning({ id: characters.id });
  await db.insert(characterSkills).values({ characterId: c.id, skillName: "Écaillé", points: 1 });
  const [r] = await db.insert(publicRolls).values({
    characterId: c.id, characterName: "ZZ-TEST-DELETE", casterUserId: null, casterName: "T",
    formula: "test", rolls: [1], total: 1, isCritSucc: 0, isCritFail: 0,
  }).returning({ id: publicRolls.id });
  console.log(`Créé: char=${c.id}, skill OK, public_roll=${r.id}`);

  // 2) DELETE (exactement comme deleteCharacter)
  try {
    await db.delete(characters).where(eq(characters.id, c.id));
    console.log("DELETE characters: OK (pas d'exception)");
  } catch (e) {
    console.log("DELETE characters: THROWS →", (e as Error).message);
    // cleanup best-effort
    await db.delete(publicRolls).where(eq(publicRolls.id, r.id));
    await db.delete(characters).where(eq(characters.id, c.id));
    process.exit(1);
  }

  // 3) Vérifie cascade + set null
  const gone = await db.select({ n: sql<number>`count(*)::int` }).from(characters).where(eq(characters.id, c.id));
  const skillGone = await db.select({ n: sql<number>`count(*)::int` }).from(characterSkills).where(eq(characterSkills.characterId, c.id));
  const roll = await db.select({ cid: publicRolls.characterId }).from(publicRolls).where(eq(publicRolls.id, r.id));
  console.log(`char restant=${gone[0].n} (attendu 0), skills restants=${skillGone[0].n} (attendu 0 cascade), public_roll.characterId=${roll[0]?.cid ?? "NULL"} (attendu NULL)`);
  // cleanup le public_roll test
  await db.delete(publicRolls).where(eq(publicRolls.id, r.id));
  console.log("Test nettoyé.");
  process.exit(0);
}
main().catch((e) => { console.error("ERR:", e); process.exit(1); });
