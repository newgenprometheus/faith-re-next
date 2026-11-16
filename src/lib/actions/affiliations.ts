/**
 * Server Actions — Affiliations de campagne (Factions, Villes, Guildes, etc.)
 * Réservé MJ (assertMJ).
 */

"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { affiliations, npcs } from "@/db/schema";
import { assertMJ } from "./guards";

type Result<T> = ({ ok: true } & T) | { ok: false; reason: string };

const VALID_TYPES = ["faction", "city", "guild", "other"];

export async function addAffiliation(
  campaignId: string,
  input: {
    name: string;
    type: string;
    description?: string;
    avatarUrl?: string;
    color?: string;
  },
): Promise<Result<{ id: string }>> {
  await assertMJ();
  const name = (input.name ?? "").trim();
  if (!name) return { ok: false, reason: "Nom d'affiliation requis" };
  if (name.length > 80) return { ok: false, reason: "Nom trop long (80 max)" };

  const type = (input.type ?? "").trim().toLowerCase();
  if (!VALID_TYPES.includes(type)) {
    return { ok: false, reason: `Type d'affiliation invalide. Types possibles : ${VALID_TYPES.join(", ")}` };
  }

  const [created] = await db
    .insert(affiliations)
    .values({
      campaignId,
      name,
      type,
      description: input.description?.trim().slice(0, 2000) || null,
      avatarUrl: input.avatarUrl?.trim() || null,
      color: input.color?.trim() || "primary",
    })
    .returning({ id: affiliations.id });

  revalidatePath("/mj");
  return { ok: true, id: created.id };
}

export async function removeAffiliation(
  affiliationId: string,
): Promise<Result<Record<never, never>>> {
  await assertMJ();

  // Avant de supprimer, nous devons dissocier les PNJ qui y font référence si nécessaire.
  // Mais comme l'association se fait par nom, les PNJ garderont le texte sans liaison dynamique active.
  await db.delete(affiliations).where(eq(affiliations.id, affiliationId));

  revalidatePath("/mj");
  return { ok: true };
}

export async function updateAffiliation(
  affiliationId: string,
  patch: {
    name?: string;
    type?: string;
    description?: string;
    avatarUrl?: string;
    color?: string;
  },
): Promise<Result<Record<never, never>>> {
  await assertMJ();

  // On récupère l'affiliation actuelle pour pouvoir propager les changements de nom
  const [existing] = await db
    .select({ name: affiliations.name, type: affiliations.type })
    .from(affiliations)
    .where(eq(affiliations.id, affiliationId))
    .limit(1);

  if (!existing) return { ok: false, reason: "Affiliation introuvable" };

  const set: Partial<{
    name: string;
    type: string;
    description: string | null;
    avatarUrl: string | null;
    color: string;
  }> = {};

  if (typeof patch.name === "string") {
    const v = patch.name.trim();
    if (!v) return { ok: false, reason: "Nom requis" };
    set.name = v.slice(0, 80);
  }

  if (typeof patch.type === "string") {
    const v = patch.type.trim().toLowerCase();
    if (VALID_TYPES.includes(v)) {
      set.type = v;
    }
  }

  if (typeof patch.description === "string") {
    const v = patch.description.trim();
    set.description = v.length ? v.slice(0, 2000) : null;
  }

  if (typeof patch.avatarUrl === "string") {
    const v = patch.avatarUrl.trim();
    set.avatarUrl = v.length ? v : null;
  }

  if (typeof patch.color === "string") {
    set.color = patch.color.trim() || "primary";
  }

  if (Object.keys(set).length === 0) return { ok: true };

  await db.update(affiliations).set(set).where(eq(affiliations.id, affiliationId));

  // Propagation du changement de nom aux PNJ liés
  if (set.name && set.name !== existing.name) {
    if (existing.type === "city") {
      await db
        .update(npcs)
        .set({ city: set.name })
        .where(eq(npcs.city, existing.name));
    } else {
      // Pour les factions, guildes et autres, on lie par faction
      await db
        .update(npcs)
        .set({ faction: set.name })
        .where(eq(npcs.faction, existing.name));
    }
  }

  revalidatePath("/mj");
  return { ok: true };
}

export async function associateNpcToAffiliation(
  npcId: string,
  type: "faction" | "city",
  affiliationName: string | null,
): Promise<Result<Record<never, never>>> {
  await assertMJ();

  const set: Partial<{
    faction: string | null;
    city: string | null;
  }> = {};

  if (type === "faction") {
    set.faction = affiliationName ? affiliationName.trim().slice(0, 80) : null;
  } else if (type === "city") {
    set.city = affiliationName ? affiliationName.trim().slice(0, 80) : null;
  } else {
    return { ok: false, reason: "Type de liaison invalide" };
  }

  await db.update(npcs).set(set).where(eq(npcs.id, npcId));

  revalidatePath("/mj");
  return { ok: true };
}
