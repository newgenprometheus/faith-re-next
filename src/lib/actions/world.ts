/**
 * Server Actions — contenu de monde de campagne (Phase 7) : journal & PNJ.
 * Réservé MJ (assertMJ). Rattaché à une campagne.
 */

"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { journalEntries, npcs, type NpcDisposition } from "@/db/schema";
import { assertMJ } from "./guards";

type Result<T> = ({ ok: true } & T) | { ok: false; reason: string };

const DISPOSITIONS: NpcDisposition[] = ["allie", "neutre", "hostile"];

// ---------------- Journal ----------------

export async function addJournalEntry(
  campaignId: string,
  input: { title: string; body?: string; sessionNumber?: number },
): Promise<Result<{ id: string }>> {
  await assertMJ();
  const title = (input.title ?? "").trim();
  if (!title) return { ok: false, reason: "Titre requis" };
  if (title.length > 120) return { ok: false, reason: "Titre trop long (120 max)" };

  const [created] = await db
    .insert(journalEntries)
    .values({
      campaignId,
      title,
      body: (input.body ?? "").trim().slice(0, 4000),
      sessionNumber: Math.max(1, Math.round(input.sessionNumber ?? 1)),
    })
    .returning({ id: journalEntries.id });

  revalidatePath("/mj");
  return { ok: true, id: created.id };
}

export async function removeJournalEntry(
  entryId: string,
): Promise<Result<Record<never, never>>> {
  await assertMJ();
  await db.delete(journalEntries).where(eq(journalEntries.id, entryId));
  revalidatePath("/mj");
  return { ok: true };
}

// ---------------- PNJ ----------------

export async function addNpc(
  campaignId: string,
  input: {
    name: string;
    role?: string;
    disposition?: NpcDisposition;
    description?: string;
    avatarUrl?: string;
    intellect?: number;
    psyche?: number;
    constitution?: number;
    manoeuvre?: number;
    maxHp?: number;
    maxMental?: number;
    maxEndurance?: number;
    faction?: string;
    city?: string;
    level?: number;
    runes?: string[];
  },
): Promise<Result<{ id: string }>> {
  await assertMJ();
  const name = (input.name ?? "").trim();
  if (!name) return { ok: false, reason: "Nom requis" };
  if (name.length > 80) return { ok: false, reason: "Nom trop long (80 max)" };
  const disposition: NpcDisposition =
    input.disposition && DISPOSITIONS.includes(input.disposition)
      ? input.disposition
      : "neutre";

  const [created] = await db
    .insert(npcs)
    .values({
      campaignId,
      name,
      role: input.role?.trim().slice(0, 80) || null,
      disposition,
      description: input.description?.trim().slice(0, 2000) || null,
      avatarUrl: input.avatarUrl?.trim() || null,
      intellect: input.intellect ?? 3,
      psyche: input.psyche ?? 3,
      constitution: input.constitution ?? 3,
      manoeuvre: input.manoeuvre ?? 3,
      maxHp: input.maxHp ?? 45,
      maxMental: input.maxMental ?? 45,
      maxEndurance: input.maxEndurance ?? 250,
      faction: input.faction?.trim().slice(0, 80) || null,
      city: input.city?.trim().slice(0, 80) || null,
      level: input.level ?? 1,
      runes: input.runes ?? [],
    })
    .returning({ id: npcs.id });

  revalidatePath("/mj");
  return { ok: true, id: created.id };
}

export async function removeNpc(
  npcId: string,
): Promise<Result<Record<never, never>>> {
  await assertMJ();
  await db.delete(npcs).where(eq(npcs.id, npcId));
  revalidatePath("/mj");
  return { ok: true };
}

export async function updateNpc(
  npcId: string,
  patch: {
    name?: string;
    role?: string;
    disposition?: NpcDisposition;
    description?: string;
    avatarUrl?: string;
    intellect?: number;
    psyche?: number;
    constitution?: number;
    manoeuvre?: number;
    maxHp?: number;
    maxMental?: number;
    maxEndurance?: number;
    faction?: string;
    city?: string;
    level?: number;
    runes?: string[];
  },
): Promise<Result<Record<never, never>>> {
  await assertMJ();

  const set: Partial<{
    name: string;
    role: string | null;
    disposition: NpcDisposition;
    description: string | null;
    avatarUrl: string | null;
    intellect: number;
    psyche: number;
    constitution: number;
    manoeuvre: number;
    maxHp: number;
    maxMental: number;
    maxEndurance: number;
    faction: string | null;
    city: string | null;
    level: number;
    runes: string[];
  }> = {};

  if (typeof patch.name === "string") {
    const v = patch.name.trim();
    if (!v) return { ok: false, reason: "Nom requis" };
    set.name = v.slice(0, 80);
  }
  if (typeof patch.role === "string") {
    const v = patch.role.trim();
    set.role = v.length ? v.slice(0, 80) : null;
  }
  if (patch.disposition && DISPOSITIONS.includes(patch.disposition)) {
    set.disposition = patch.disposition;
  }
  if (typeof patch.description === "string") {
    const v = patch.description.trim();
    set.description = v.length ? v.slice(0, 2000) : null;
  }
  if (typeof patch.avatarUrl === "string") {
    const v = patch.avatarUrl.trim();
    set.avatarUrl = v.length ? v : null;
  }
  if (typeof patch.intellect === "number") set.intellect = patch.intellect;
  if (typeof patch.psyche === "number") set.psyche = patch.psyche;
  if (typeof patch.constitution === "number") set.constitution = patch.constitution;
  if (typeof patch.manoeuvre === "number") set.manoeuvre = patch.manoeuvre;
  if (typeof patch.maxHp === "number") set.maxHp = patch.maxHp;
  if (typeof patch.maxMental === "number") set.maxMental = patch.maxMental;
  if (typeof patch.maxEndurance === "number") set.maxEndurance = patch.maxEndurance;
  if (typeof patch.faction === "string") {
    const v = patch.faction.trim();
    set.faction = v.length ? v.slice(0, 80) : null;
  }
  if (typeof patch.city === "string") {
    const v = patch.city.trim();
    set.city = v.length ? v.slice(0, 80) : null;
  }
  if (typeof patch.level === "number") {
    set.level = Math.max(1, patch.level);
  }
  if (Array.isArray(patch.runes)) {
    set.runes = patch.runes.map(r => r.trim()).filter(Boolean);
  }

  if (Object.keys(set).length === 0) return { ok: true };

  await db.update(npcs).set(set).where(eq(npcs.id, npcId));
  revalidatePath("/mj");
  return { ok: true };
}
