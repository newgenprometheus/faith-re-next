"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { characters, publicRolls, conditions } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import {
  SKILL_GROUPS,
  calculateAttribute,
  type AttributeName,
} from "@/lib/skills";
import { pushRollResult } from "@/lib/discord-webhook";
import { type RollCategory, getDefaultCategory } from "@/lib/faith-system";

/**
 * Lance 2d6 + attribut (+ skill optionnel) contre une difficulté.
 * Persiste dans le feed plateau avec dd + success flag.
 *
 * Si dd est null → jet libre, success=null (informatif uniquement).
 * Sinon : success = total >= dd. Crit naturel d'abord (double 6 succ, double 1 fail)
 * sur le total, indépendamment du DD.
 */
export async function rollSkillWithDD(input: {
  characterId: string;
  attrName: AttributeName;
  skillName?: string | null;
  dd: number | null;
  isPrivate?: boolean;
  category?: RollCategory;
}): Promise<
  | {
      ok: true;
      rollId: string;
      d1: number;
      d2: number;
      attrScore: number;
      skillScore: number;
      total: number;
      success: boolean | null;
      isCritSucc: boolean;
      isCritFail: boolean;
    }
  | { ok: false; reason: string }
> {
  const session = await auth();
  if (!session?.user) return { ok: false, reason: "UNAUTHORIZED" };

  const char = await db.query.characters.findFirst({
    where: eq(characters.id, input.characterId),
    with: { skills: true },
  });
  if (!char) return { ok: false, reason: "Personnage introuvable" };
  if (!(input.attrName in SKILL_GROUPS)) {
    return { ok: false, reason: `Attribut inconnu : ${input.attrName}` };
  }

  const skillsMap = Object.fromEntries(
    char.skills.map((s) => [s.skillName, s.points]),
  );
  const attrScore = calculateAttribute(skillsMap, input.attrName);

  let skillScore = 0;
  let resolvedSkill: string | null = null;
  if (input.skillName) {
    const skillsInAttr = SKILL_GROUPS[input.attrName] as readonly string[];
    if (!skillsInAttr.includes(input.skillName)) {
      return {
         ok: false,
         reason: `${input.skillName} n'est pas une compétence de ${input.attrName}`,
      };
    }
    resolvedSkill = input.skillName;
    skillScore = skillsMap[input.skillName] ?? 0;
  }

  const category = input.category ?? getDefaultCategory(input.attrName, input.skillName);

  // Modificateurs de dé issus des conditions actives (ex. Fatigue −4).
  const conds = await db.query.conditions.findMany({
    where: eq(conditions.characterId, input.characterId),
  });

  let totalDiceMod = 0;
  const appliedModsText: string[] = [];

  for (const c of conds) {
    if (c.label === "Fatigue") {
      if (category === "offensif" || category === "defensif") {
        totalDiceMod += c.diceModifier ?? 0;
        appliedModsText.push(`Fatigue ${c.diceModifier ?? 0}`);
      }
    } else if (c.diceModifier !== 0) {
      totalDiceMod += c.diceModifier;
      appliedModsText.push(`${c.label} ${c.diceModifier >= 0 ? "+" : ""}${c.diceModifier}`);
    }
  }

  // Malus sous un seuil de HP (Dernier Souffle)
  if (char.currentHp <= 15) {
    if (category === "offensif" || category === "defensif") {
      totalDiceMod += -2;
      appliedModsText.push(`Dernier Souffle -2`);
    }
  }

  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  // Règle FAITH:RE — jet de COMPÉTENCE = 2d6 + compétence (sans l'attribut).
  // Jet d'attribut seul (sans compétence) = 2d6 + attribut.
  const bonus = resolvedSkill ? skillScore : attrScore;
  const total = d1 + d2 + bonus + totalDiceMod;
  const isCritSucc = d1 === 6 && d2 === 6;
  const isCritFail = d1 === 1 && d2 === 1;

  let success: boolean | null = null;
  if (typeof input.dd === "number") {
    success = total >= input.dd;
    // Crit force le résultat même si le DD le contredit (règles JDR classiques)
    if (isCritSucc) success = true;
    if (isCritFail) success = false;
  }

  // Construction de la formule canonique avec la catégorie et les modificateurs appliqués
  const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
  let formula = resolvedSkill
    ? `2d6 + ${resolvedSkill} [${categoryLabel}]`
    : `2d6 + ${input.attrName} [${categoryLabel}]`;

  if (appliedModsText.length > 0) {
    formula += ` (${appliedModsText.join(", ")})`;
  }

  const [created] = await db
    .insert(publicRolls)
    .values({
      characterId: char.id,
      characterName: char.name,
      casterUserId: session.user.id,
      casterName: session.user.name ?? "—",
      formula,
      rolls: [d1, d2],
      attrName: resolvedSkill ? null : input.attrName,
      attrScore: resolvedSkill ? null : attrScore,
      skillName: resolvedSkill,
      skillScore: resolvedSkill ? skillScore : null,
      total,
      dd: input.dd,
      success: success === null ? null : success ? 1 : 0,
      isCritSucc: isCritSucc ? 1 : 0,
      isCritFail: isCritFail ? 1 : 0,
      isPrivate: input.isPrivate ? 1 : 0,
    })
    .returning({ id: publicRolls.id });


  // Webhook Discord
  if (!input.isPrivate && process.env.DISCORD_WEBHOOK_URL) {
    try {
      const payload = {
        id: char.id,
        name: char.name,
        nom: char.nom,
        age: char.age,
        xp: char.xp,
        enduranceTrainings: char.enduranceTrainings,
        currentHp: char.currentHp,
        currentMental: char.currentMental,
        currentEndurance: char.currentEndurance,
        fatePoints: char.fatePoints,
        runes: char.runes,
        skills: skillsMap,
        discordMessageId: char.discordMessageId,
      };
      await pushRollResult(process.env.DISCORD_WEBHOOK_URL, payload, {
        formula: resolvedSkill ? `2d6 + ${resolvedSkill}` : `2d6 + ${input.attrName}`,
        rolls: [d1, d2],
        attrName: resolvedSkill ? undefined : input.attrName,
        attrScore: resolvedSkill ? undefined : attrScore,
        skillName: resolvedSkill,
        skillScore: resolvedSkill ? skillScore : undefined,
        total,
        isCritSucc,
        isCritFail,
      });
    } catch (e) {
      console.error("Failed to push roll result to Discord Webhook:", e);
    }
  }

  revalidatePath("/plateau");

  return {
    ok: true,
    rollId: created.id,
    d1,
    d2,
    attrScore,
    skillScore,
    total,
    success,
    isCritSucc,
    isCritFail,
  };
}
