import { db } from "@/db";
import { campaigns, gameSessions, sessionLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";

async function main() {
  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.isActive, 1),
  });
  console.log(
    "ACTIVE CAMPAIGN:",
    campaign ? `${campaign.name} (${campaign.id})` : "AUCUNE",
  );
  if (!campaign) {
    console.log("→ pas de campagne active : les dégâts ne seront pas loggués (skip gracieux).");
    process.exit(0);
  }

  const gs = await db.query.gameSessions.findFirst({
    where: and(
      eq(gameSessions.campaignId, campaign.id),
      eq(gameSessions.isActive, 1),
    ),
  });
  console.log(
    "ACTIVE SESSION:",
    gs ? `n°${gs.number} name=${gs.name ?? "—"} (${gs.id})` : "AUCUNE",
  );
  if (!gs) {
    console.log("→ pas de session active : les dégâts ne seront pas loggués (skip gracieux).");
    process.exit(0);
  }

  const before = await db
    .select()
    .from(sessionLogs)
    .where(eq(sessionLogs.campaignId, campaign.id));
  console.log("SESSION_LOG (campagne) — lignes existantes:", before.length);

  // Round-trip : insère une entrée de dégâts (shape EXACTE de logHpDamage), lit, supprime.
  const now = new Date();
  const [ins] = await db
    .insert(sessionLogs)
    .values({
      campaignId: campaign.id,
      gameSessionId: gs.id,
      sessionNumber: gs.number,
      casterUserId: null,
      characterId: null,
      casterName: "MJ",
      characterName: "TEST-DMG-CHECK",
      diceFormula: "Dégâts",
      diceRolls: [],
      diceTotal: 0,
      damageValue: 12,
      dd: null,
      success: null,
      isCritSucc: 0,
      isCritFail: 0,
      rolledAt: now,
      endedAt: now,
      createdByUserId: null,
    })
    .returning({
      id: sessionLogs.id,
      dmg: sessionLogs.damageValue,
      name: sessionLogs.characterName,
    });
  console.log("INSERT test (dégâts) OK:", ins);

  await db.delete(sessionLogs).where(eq(sessionLogs.id, ins.id));
  console.log("DELETE test OK — shape valide contre Neon, prod nettoyée.");
  process.exit(0);
}
main().catch((e) => {
  console.error("ERR:", e);
  process.exit(1);
});
