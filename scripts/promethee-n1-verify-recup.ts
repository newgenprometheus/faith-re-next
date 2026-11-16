import { db } from "@/db";
import { characters, publicRolls } from "@/db/schema";
import { eq } from "drizzle-orm";
import { calculateLevel, tierLabel } from "@/lib/faith-system";

async function main() {
  // 1) Prométhée XP → 999 (haut de la bande N1, perte d'XP minimale, < seuil N2=1000)
  const p = await db.query.characters.findFirst({
    where: eq(characters.name, "Prométhée"),
  });
  if (!p) {
    console.log("Prométhée introuvable");
    process.exit(1);
  }
  console.log(
    `AVANT: Prométhée xp=${p.xp} → niveau ${calculateLevel(p.xp)} ${tierLabel(p.xp)}`,
  );
  await db
    .update(characters)
    .set({ xp: 999, updatedAt: new Date() })
    .where(eq(characters.id, p.id));
  console.log(
    `APRÈS: Prométhée xp=999 → niveau ${calculateLevel(999)} ${tierLabel(999)}`,
  );

  // 2) Vérifie le chemin de récup SANS transaction (update PV + insert publicRoll
  //    séquentiels = ce que fait recoverHp désormais). Insert test puis delete.
  try {
    await db
      .update(characters)
      .set({ currentHp: p.currentHp, updatedAt: new Date() })
      .where(eq(characters.id, p.id));
    const [r] = await db
      .insert(publicRolls)
      .values({
        characterId: p.id,
        characterName: p.name,
        casterUserId: null,
        casterName: "TEST",
        formula: "TEST-RECUP-NO-TX",
        rolls: [3, 4],
        attrName: "CONSTITUTION",
        attrScore: null,
        skillName: "Écaillé",
        skillScore: 0,
        total: 3,
        isCritSucc: 0,
        isCritFail: 0,
      })
      .returning({ id: publicRolls.id });
    await db.delete(publicRolls).where(eq(publicRolls.id, r.id));
    console.log(
      "RÉCUP (update + insert séquentiels, sans transaction): OK — pas d'exception, test nettoyé",
    );
  } catch (e) {
    console.log("RÉCUP path THROWS →", (e as Error).message);
  }
  process.exit(0);
}
main().catch((e) => {
  console.error("ERR:", e);
  process.exit(1);
});
