"use client";

/**
 * NpcsView — PNJ de campagne (Phase 7, développé).
 * Intègre les fonctionnalités de création, édition complète (stats, vitaux, image, affiliations),
 * de générateur aléatoire avec chaos index (1 à 5) et archétypes modulaires,
 * d'importation depuis des modèles prédéfinis, et de dossiers virtuels de tri (Factions, Villes, Dispositions).
 */

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { 
  UserCircle2, Plus, Trash2, Pencil, Search, Check, 
  MapPin, Shield, Dices, Folder, FolderOpen, ChevronDown, 
  ChevronRight, Sparkles, RefreshCw, X, Heart, Brain, Zap 
} from "lucide-react";
import { toast } from "sonner";
import { addNpc, removeNpc, updateNpc } from "@/lib/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Disposition = "allie" | "neutre" | "hostile";

export type NpcView = {
  id: string;
  name: string;
  role: string | null;
  disposition: Disposition;
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
};

const DISPO_META: Record<Disposition, { label: string; rgb: string; bg: string; text: string }> = {
  allie: { label: "Allié", rgb: "48,164,108", bg: "rgba(48,164,108,0.12)", text: "text-endu" },
  neutre: { label: "Neutre", rgb: "146,157,178", bg: "rgba(146,157,178,0.12)", text: "text-ink-subtle" },
  hostile: { label: "Hostile", rgb: "229,72,77", bg: "rgba(229,72,77,0.12)", text: "text-hp" },
};
const DISPO_ORDER: Disposition[] = ["allie", "neutre", "hostile"];

// Archétypes pour la génération
const ARCHETYPES = [
  { id: "guerrier", label: "⚔️ Guerrier / Brute", weights: { intellect: 1, psyche: 1, constitution: 4, manoeuvre: 3 }, maxVal: 9 },
  { id: "mage", label: "🔮 Mage / Érudit", weights: { intellect: 4, psyche: 4, constitution: 1, manoeuvre: 1 }, maxVal: 9 },
  { id: "assassin", label: "👣 Assassin / Furtif", weights: { intellect: 2, psyche: 1, constitution: 2, manoeuvre: 5 }, maxVal: 9 },
  { id: "diplomate", label: "🗣️ Diplomate / Leader", weights: { intellect: 4, psyche: 3, constitution: 1, manoeuvre: 2 }, maxVal: 7 },
  { id: "equilibre", label: "⚖️ Généraliste / Équilibré", weights: { intellect: 2.5, psyche: 2.5, constitution: 2.5, manoeuvre: 2.5 }, maxVal: 6 }
] as const;

// PNJ pré-configurés
const NPC_TEMPLATES = [
  {
    name: "Garde Civile",
    role: "Sentinelle municipale",
    disposition: "neutre" as Disposition,
    description: "Un garde dévoué en armure lourde surveillant les ruelles et maintenant l'ordre.",
    avatarUrl: "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=200&auto=format&fit=crop",
    intellect: 2,
    psyche: 2,
    constitution: 5,
    manoeuvre: 3,
    maxHp: 55,
    maxMental: 30,
    maxEndurance: 260,
    faction: "Garde Urbaine",
    city: "Cité-Dôme",
  },
  {
    name: "Ombre Noire",
    role: "Chasseur de primes",
    disposition: "hostile" as Disposition,
    description: "Une ombre armée de dagues empoisonnées qui frappe sans laisser de traces.",
    avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200&auto=format&fit=crop",
    intellect: 3,
    psyche: 2,
    constitution: 2,
    manoeuvre: 6,
    maxHp: 40,
    maxMental: 40,
    maxEndurance: 300,
    faction: "Les Écorcheurs",
    city: "Basse-Fosse",
  },
  {
    name: "Prêtre Solaire",
    role: "Apôtre de l'Aube",
    disposition: "allie" as Disposition,
    description: "Un initié de la lumière prodiguant soins et bénédictions protectrices.",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop",
    intellect: 3,
    psyche: 6,
    constitution: 3,
    manoeuvre: 1,
    maxHp: 45,
    maxMental: 65,
    maxEndurance: 220,
    faction: "Culte Lumineux",
    city: "Val-Benoît",
  },
  {
    name: "Apothicaire",
    role: "Marchand de philtres",
    disposition: "neutre" as Disposition,
    description: "Herboriste talentueux vendant potions de soin, antidotes et décoctions curieuses.",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop",
    intellect: 5,
    psyche: 4,
    constitution: 2,
    manoeuvre: 2,
    maxHp: 40,
    maxMental: 50,
    maxEndurance: 240,
    faction: "Ligue Marchande",
    city: "Solitude",
  },
  {
    name: "Brigand",
    role: "Pilleur de convois",
    disposition: "hostile" as Disposition,
    description: "Voleur opportuniste embusqué au bord des routes pavées de campagne.",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop",
    intellect: 2,
    psyche: 2,
    constitution: 3,
    manoeuvre: 5,
    maxHp: 45,
    maxMental: 30,
    maxEndurance: 280,
    faction: "Contrebande",
    city: "Forêt des Murmures",
  }
];

const inputCls =
  "h-9 min-w-0 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary/40 focus:outline-none";

// Algorithme de génération de caractéristiques chaotiques
function generateRandomStats(
  level: number,
  chaos: number,
  archetypeId: string,
  randomizeVitals: boolean
) {
  const archetype = ARCHETYPES.find((a) => a.id === archetypeId) || ARCHETYPES[4];
  const totalBudget = 8 + level * 2;
  
  const stats = {
    intellect: 1,
    psyche: 1,
    constitution: 1,
    manoeuvre: 1,
  };
  
  let pointsToAllocate = totalBudget - 4;
  
  const weightMap: Record<string, number> = {
    intellect: archetype.weights.intellect,
    psyche: archetype.weights.psyche,
    constitution: archetype.weights.constitution,
    manoeuvre: archetype.weights.manoeuvre,
  };
  
  const rangeMap: Record<number, [number, number]> = {
    1: [0.95, 1.05],
    2: [0.75, 1.25],
    3: [0.55, 1.75],
    4: [0.35, 2.45],
    5: [0.15, 4.25],
  };
  
  const [minF, maxF] = rangeMap[chaos] || [0.55, 1.75];
  const maxCap = Math.max(6, Math.min(12, archetype.maxVal + Math.floor(level / 3)));

  while (pointsToAllocate > 0) {
    const choices = Object.keys(stats).map((key) => {
      const w = weightMap[key];
      const rand = minF + Math.random() * (maxF - minF);
      const current = stats[key as keyof typeof stats];
      const score = (w * rand) / (current * 0.85 + 0.15);
      return { key, score, current };
    });
    
    choices.sort((a, b) => b.score - a.score);
    const target = choices.find((c) => c.current < maxCap) || choices[0];
    stats[target.key as keyof typeof stats]++;
    pointsToAllocate--;
  }

  let maxHp = 30 + stats.constitution * 5;
  let maxMental = 30 + stats.psyche * 5;
  let maxEndurance = 150 + stats.manoeuvre * 25;

  if (randomizeVitals) {
    const hpNoise = Math.floor((Math.random() - 0.5) * (15 + level * 2));
    const mentalNoise = Math.floor((Math.random() - 0.5) * (15 + level * 2));
    const enduranceNoise = Math.floor((Math.random() - 0.5) * (60 + level * 10));
    
    maxHp = Math.max(15, maxHp + hpNoise);
    maxMental = Math.max(15, maxMental + mentalNoise);
    maxEndurance = Math.max(50, maxEndurance + enduranceNoise);
  }

  return {
    ...stats,
    maxHp,
    maxMental,
    maxEndurance,
  };
}

function DispoPills({
  value,
  onChange,
}: {
  value: Disposition;
  onChange: (d: Disposition) => void;
}) {
  return (
    <div className="flex gap-1">
      {DISPO_ORDER.map((d) => {
        const m = DISPO_META[d];
        const active = value === d;
        return (
          <button
            key={d}
            type="button"
            onClick={() => onChange(d)}
            className="rounded-md px-2 py-1.5 font-mono text-[10px] uppercase tracking-wide transition-colors cursor-pointer"
            style={{
              background: active ? m.bg : "transparent",
              border: `1px solid rgba(${m.rgb},${active ? 0.4 : 0.18})`,
              color: active ? `rgb(${m.rgb})` : "var(--foreground-subtle)",
            }}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

// Composant Carte de PNJ individuelle
function NpcCard({
  npc,
  canEdit,
}: {
  npc: NpcView;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(npc.name);
  const [role, setRole] = useState(npc.role ?? "");
  const [disposition, setDisposition] = useState<Disposition>(npc.disposition);
  const [description, setDescription] = useState(npc.description ?? "");
  const [avatarUrl, setAvatarUrl] = useState(npc.avatarUrl ?? "");
  const [faction, setFaction] = useState(npc.faction ?? "");
  const [city, setCity] = useState(npc.city ?? "");
  
  const [intellect, setIntellect] = useState(npc.intellect);
  const [psyche, setPsyche] = useState(npc.psyche);
  const [constitution, setConstitution] = useState(npc.constitution);
  const [manoeuvre, setManoeuvre] = useState(npc.manoeuvre);
  
  const [maxHp, setMaxHp] = useState(npc.maxHp);
  const [maxMental, setMaxMental] = useState(npc.maxMental);
  const [maxEndurance, setMaxEndurance] = useState(npc.maxEndurance);
  const [level, setLevel] = useState(npc.level ?? 1);
  const [runes, setRunes] = useState<string[]>([
    npc.runes?.[0] ?? "",
    npc.runes?.[1] ?? "",
    npc.runes?.[2] ?? "",
  ]);
  
  const [isPending, startTransition] = useTransition();
  const m = DISPO_META[npc.disposition];

  const save = () => {
    const n = name.trim();
    if (!n) return;
    startTransition(async () => {
      if (npc.id.startsWith("n") || npc.id.startsWith("mock")) {
        toast.success("Simulation : PNJ mis à jour (Cockpit Preview)");
        setEditing(false);
        return;
      }
      const res = await updateNpc(npc.id, { 
        name: n, 
        role, 
        disposition, 
        description,
        avatarUrl,
        faction,
        city,
        intellect,
        psyche,
        constitution,
        manoeuvre,
        maxHp,
        maxMental,
        maxEndurance,
        level,
        runes: runes.map(r => r.trim()).filter(Boolean),
      });
      if (!res.ok) {
        toast.error(res.reason);
        return;
      }
      setEditing(false);
      router.refresh();
      toast.success("PNJ mis à jour");
    });
  };

  const cycle = () =>
    startTransition(async () => {
      const next = DISPO_ORDER[(DISPO_ORDER.indexOf(npc.disposition) + 1) % 3];
      if (npc.id.startsWith("n") || npc.id.startsWith("mock")) {
        toast.success(`Simulation : Disposition changée en ${next} (Cockpit Preview)`);
        return;
      }
      await updateNpc(npc.id, { disposition: next });
      router.refresh();
    });

  const remove = () =>
    startTransition(async () => {
      if (npc.id.startsWith("n") || npc.id.startsWith("mock")) {
        toast.success("Simulation : PNJ supprimé (Cockpit Preview)");
        return;
      }
      await removeNpc(npc.id);
      router.refresh();
      toast.success("PNJ supprimé");
    });

  if (editing) {
    return (
      <article className="campaign-panel flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Nom" className={`${inputCls} flex-1`} />
          <input value={role} onChange={(e) => setRole(e.target.value)} maxLength={80} placeholder="Rôle" className={`${inputCls} flex-1`} />
          <div className="flex items-center gap-1 shrink-0 bg-secondary/15 px-2 py-0.5 rounded border border-border">
            <span className="text-2xs font-mono text-ink-muted uppercase">Niv</span>
            <input type="number" min={1} max={99} value={level} onChange={(e) => setLevel(parseInt(e.target.value) || 1)} className="w-12 h-8 text-center rounded border border-border bg-background text-xs font-mono" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input value={faction} onChange={(e) => setFaction(e.target.value)} maxLength={80} placeholder="Faction" className={`${inputCls} flex-1`} list="factions" />
          <input value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} placeholder="Ville / Lieu" className={`${inputCls} flex-1`} list="cities" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="URL de l'image / portrait" className={`${inputCls} flex-1`} />
          <DispoPills value={disposition} onChange={setDisposition} />
        </div>

        {/* Édition caractéristiques */}
        <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-primary font-medium">🧠 INTELLECT</span>
            <input type="number" min={1} max={15} value={intellect} onChange={(e) => setIntellect(parseInt(e.target.value) || 1)} className="w-12 h-7 text-center rounded border border-border bg-background text-xs font-mono" />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-mhp font-medium">🔮 PSYCHÉ</span>
            <input type="number" min={1} max={15} value={psyche} onChange={(e) => setPsyche(parseInt(e.target.value) || 1)} className="w-12 h-7 text-center rounded border border-border bg-background text-xs font-mono" />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-hp font-medium">❤️ CONSTITUTION</span>
            <input type="number" min={1} max={15} value={constitution} onChange={(e) => setConstitution(parseInt(e.target.value) || 1)} className="w-12 h-7 text-center rounded border border-border bg-background text-xs font-mono" />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-endu font-medium">👣 MANŒUVRE</span>
            <input type="number" min={1} max={15} value={manoeuvre} onChange={(e) => setManoeuvre(parseInt(e.target.value) || 1)} className="w-12 h-7 text-center rounded border border-border bg-background text-xs font-mono" />
          </div>
        </div>

        {/* Édition vitaux */}
        <div className="grid grid-cols-3 gap-2 border-t border-border/60 pt-2">
          <div className="flex flex-col gap-1 text-[10px]">
            <span className="text-hp font-medium uppercase">PV Max</span>
            <input type="number" min={1} value={maxHp} onChange={(e) => setMaxHp(parseInt(e.target.value) || 1)} className="w-full h-7 text-center rounded border border-border bg-background text-xs font-mono" />
          </div>
          <div className="flex flex-col gap-1 text-[10px]">
            <span className="text-mhp font-medium uppercase">Mental Max</span>
            <input type="number" min={1} value={maxMental} onChange={(e) => setMaxMental(parseInt(e.target.value) || 1)} className="w-full h-7 text-center rounded border border-border bg-background text-xs font-mono" />
          </div>
          <div className="flex flex-col gap-1 text-[10px]">
            <span className="text-endu font-medium uppercase">Endu Max</span>
            <input type="number" min={1} value={maxEndurance} onChange={(e) => setMaxEndurance(parseInt(e.target.value) || 1)} className="w-full h-7 text-center rounded border border-border bg-background text-xs font-mono" />
          </div>
        </div>

        {/* Édition runes */}
        <div className="border-t border-border/60 pt-2 flex flex-col gap-1.5">
          <span className="text-[10px] font-mono text-ink-muted uppercase tracking-wider">🔮 Runes Équipées (Max 3) :</span>
          <div className="grid grid-cols-3 gap-2">
            <input 
              value={runes[0]} 
              onChange={(e) => setRunes([e.target.value, runes[1], runes[2]])} 
              maxLength={40} 
              placeholder="Rune 1" 
              className={`${inputCls} h-8 text-xs font-mono`} 
            />
            <input 
              value={runes[1]} 
              onChange={(e) => setRunes([runes[0], e.target.value, runes[2]])} 
              maxLength={40} 
              placeholder="Rune 2" 
              className={`${inputCls} h-8 text-xs font-mono`} 
            />
            <input 
              value={runes[2]} 
              onChange={(e) => setRunes([runes[0], runes[1], e.target.value])} 
              maxLength={40} 
              placeholder="Rune 3" 
              className={`${inputCls} h-8 text-xs font-mono`} 
            />
          </div>
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="Description"
          className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary/40 focus:outline-none mt-1"
        />
        <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-2">
          <button type="button" onClick={() => setEditing(false)} className="rounded-md px-2.5 py-1 text-xs text-foreground-subtle hover:text-foreground">
            Annuler
          </button>
          <button
            type="button"
            onClick={save}
            disabled={isPending || !name.trim()}
            className="flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1 text-xs font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Check size={13} /> Enregistrer
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="campaign-panel p-4 flex flex-col justify-between h-full bg-card/65 backdrop-blur-md">
      <div>
        <div className="flex items-start justify-between gap-3">
          {/* Portrait du PNJ */}
          <div className="flex gap-2.5 min-w-0">
            {npc.avatarUrl ? (
              <img 
                src={npc.avatarUrl} 
                alt={npc.name} 
                className="size-11 rounded-lg object-cover border border-border shadow-sm shrink-0" 
              />
            ) : (
              <div className="size-11 rounded-lg bg-secondary/80 flex items-center justify-center text-ink-subtle border border-border shrink-0">
                <UserCircle2 size={24} />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <h2 className="truncate text-sm font-semibold text-foreground tracking-tight">{npc.name}</h2>
                <Badge variant="outline" className="h-4.5 px-1 py-0 font-mono text-[9px] text-primary shrink-0 bg-primary/8 border-primary/20">
                  Niv.{npc.level}
                </Badge>
              </div>
              {npc.role && <p className="truncate text-2xs text-foreground-muted uppercase tracking-wider">{npc.role}</p>}
            </div>
          </div>
          
          <button
            type="button"
            onClick={() => canEdit && cycle()}
            disabled={!canEdit || isPending}
            title={canEdit ? "Changer la disposition" : undefined}
            className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide cursor-pointer"
            style={{
              background: m.bg,
              border: `1px solid rgba(${m.rgb},0.3)`,
              color: `rgb(${m.rgb})`,
              cursor: canEdit ? "pointer" : "default",
            }}
          >
            {m.label}
          </button>
        </div>

        {/* Affiliations */}
        {(npc.faction || npc.city) && (
          <div className="flex flex-wrap gap-1 mt-2.5">
            {npc.faction && (
              <span className="inline-flex items-center gap-1 rounded bg-secondary/50 px-1.5 py-0.5 text-[9px] font-medium text-ink-muted border border-border/40">
                <Shield size={9} className="text-primary/70" /> {npc.faction}
              </span>
            )}
            {npc.city && (
              <span className="inline-flex items-center gap-1 rounded bg-secondary/50 px-1.5 py-0.5 text-[9px] font-medium text-ink-muted border border-border/40">
                <MapPin size={9} className="text-hp/70" /> {npc.city}
              </span>
            )}
          </div>
        )}

        {/* Description */}
        {npc.description && (
          <p className="mt-2.5 text-xs text-foreground-muted leading-relaxed line-clamp-3 bg-secondary/20 p-2 rounded border border-border/20">
            {npc.description}
          </p>
        )}

        {/* Caractéristiques */}
        <div className="grid grid-cols-4 gap-1.5 mt-3 border-t border-border/40 pt-2.5">
          <div className="flex flex-col items-center p-1 rounded bg-secondary/35 border border-border/10">
            <span className="text-[8px] font-mono font-medium text-primary uppercase">INT</span>
            <span className="text-xs font-mono font-semibold text-foreground mt-0.5">{npc.intellect}</span>
          </div>
          <div className="flex flex-col items-center p-1 rounded bg-secondary/35 border border-border/10">
            <span className="text-[8px] font-mono font-medium text-mhp uppercase">PSY</span>
            <span className="text-xs font-mono font-semibold text-foreground mt-0.5">{npc.psyche}</span>
          </div>
          <div className="flex flex-col items-center p-1 rounded bg-secondary/35 border border-border/10">
            <span className="text-[8px] font-mono font-medium text-hp uppercase">CON</span>
            <span className="text-xs font-mono font-semibold text-foreground mt-0.5">{npc.constitution}</span>
          </div>
          <div className="flex flex-col items-center p-1 rounded bg-secondary/35 border border-border/10">
            <span className="text-[8px] font-mono font-medium text-endu uppercase">MAN</span>
            <span className="text-xs font-mono font-semibold text-foreground mt-0.5">{npc.manoeuvre}</span>
          </div>
        </div>

        {/* Vitaux HP / Mental / Endurance */}
        <div className="grid grid-cols-3 gap-1.5 mt-2 text-[10px]">
          <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-hp/5 text-hp border border-hp/20 justify-center">
            <Heart size={10} className="shrink-0" />
            <span className="font-mono font-medium">{npc.maxHp} HP</span>
          </div>
          <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-mhp/5 text-mhp border border-mhp/20 justify-center">
            <Brain size={10} className="shrink-0" />
            <span className="font-mono font-medium">{npc.maxMental} MNT</span>
          </div>
          <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-endu/5 text-endu border border-endu/20 justify-center">
            <Zap size={10} className="shrink-0" />
            <span className="font-mono font-medium">{npc.maxEndurance} END</span>
          </div>
        </div>
        
        {/* Runes équipées */}
        {npc.runes && npc.runes.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2.5 border-t border-border/20 pt-2 justify-center">
            {npc.runes.map((rune, idx) => (
              <span key={idx} className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-[9px] font-mono text-primary border border-primary/20">
                🔮 {rune}
              </span>
            ))}
          </div>
        )}
      </div>

      {canEdit && (
        <div className="mt-3 flex items-center justify-end gap-3 border-t border-border/40 pt-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-[10px] text-foreground-subtle transition-colors hover:text-foreground cursor-pointer"
          >
            <Pencil size={11} /> Éditer
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={isPending}
            className="flex items-center gap-1 text-[10px] text-foreground-subtle transition-colors hover:text-hp disabled:opacity-30 cursor-pointer"
          >
            <Trash2 size={11} /> Supprimer
          </button>
        </div>
      )}
    </article>
  );
}

// Composant principal NpcsView
export function NpcsView({
  campaignId,
  npcs,
  affiliations = [],
  canEdit = false,
}: {
  campaignId: string;
  npcs: NpcView[];
  affiliations?: { id: string; name: string; type: string }[];
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Disposition | "all">("all");
  
  // Modes de groupement Dossiers
  const [groupingMode, setGroupingMode] = useState<"none" | "disposition" | "faction" | "city">("none");
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({ all: true });

  // Mode de création
  const [creationTab, setCreationTab] = useState<"manuel" | "random" | "templates">("manuel");

  // Champs création manuelle
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [disposition, setDisposition] = useState<Disposition>("neutre");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [faction, setFaction] = useState("");
  const [city, setCity] = useState("");
  const [intellect, setIntellect] = useState(3);
  const [psyche, setPsyche] = useState(3);
  const [constitution, setConstitution] = useState(3);
  const [manoeuvre, setManoeuvre] = useState(3);
  const [maxHp, setMaxHp] = useState(45);
  const [maxMental, setMaxMental] = useState(45);
  const [maxEndurance, setMaxEndurance] = useState(250);
  const [manualLevel, setManualLevel] = useState(1);
  const [manualRunes, setManualRunes] = useState<string[]>(["", "", ""]);

  // Champs Générateur aléatoire
  const [randName, setRandName] = useState("");
  const [randRole, setRandRole] = useState("");
  const [randFaction, setRandFaction] = useState("");
  const [randCity, setRandCity] = useState("");
  const [randLevel, setRandLevel] = useState(3);
  const [randChaos, setRandChaos] = useState(3); // 1 = équilibré, 5 = fou
  const [randArchetype, setRandArchetype] = useState<string>("equilibre");
  const [randVitals, setRandVitals] = useState(true);

  const [isPending, startTransition] = useTransition();

  // Liste globale de toutes les Factions et Villes existantes (pour dossiers/suggestions)
  const existingFactions = useMemo(() => {
    const list = new Set<string>();
    affiliations
      .filter(a => a.type === "faction" || a.type === "guild")
      .forEach(a => list.add(a.name));
    npcs.forEach(n => n.faction && list.add(n.faction));
    return Array.from(list);
  }, [npcs, affiliations]);

  const existingCities = useMemo(() => {
    const list = new Set<string>();
    affiliations
      .filter(a => a.type === "city")
      .forEach(a => list.add(a.name));
    npcs.forEach(n => n.city && list.add(n.city));
    return Array.from(list);
  }, [npcs, affiliations]);

  // Tri & filtre des PNJ
  const filteredNpcs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return npcs.filter((n) => {
      if (filter !== "all" && n.disposition !== filter) return false;
      if (!q) return true;
      return (
        n.name.toLowerCase().includes(q) ||
        (n.role ?? "").toLowerCase().includes(q) ||
        (n.description ?? "").toLowerCase().includes(q) ||
        (n.faction ?? "").toLowerCase().includes(q) ||
        (n.city ?? "").toLowerCase().includes(q)
      );
    });
  }, [npcs, query, filter]);

  // Structure des dossiers selon le groupement
  const dossiers = useMemo(() => {
    const map: Record<string, NpcView[]> = {};

    if (groupingMode === "none") {
      map["Tous les PNJ"] = filteredNpcs;
    } else if (groupingMode === "disposition") {
      map["Alliés"] = filteredNpcs.filter(n => n.disposition === "allie");
      map["Neutres"] = filteredNpcs.filter(n => n.disposition === "neutre");
      map["Hostiles"] = filteredNpcs.filter(n => n.disposition === "hostile");
    } else if (groupingMode === "faction") {
      filteredNpcs.forEach(n => {
        const fact = n.faction?.trim() || "Sans faction";
        if (!map[fact]) map[fact] = [];
        map[fact].push(n);
      });
    } else if (groupingMode === "city") {
      filteredNpcs.forEach(n => {
        const c = n.city?.trim() || "Sans ville";
        if (!map[c]) map[c] = [];
        map[c].push(n);
      });
    }

    return Object.entries(map).filter(([_, list]) => list.length > 0);
  }, [filteredNpcs, groupingMode]);

  // Initialisation par défaut de l'état ouvert des dossiers
  useMemo(() => {
    const defaults: Record<string, boolean> = {};
    dossiers.forEach(([name]) => {
      defaults[name] = openFolders[name] !== undefined ? openFolders[name] : true;
    });
    setOpenFolders(prev => ({ ...defaults, ...prev }));
  }, [dossiers]);

  const toggleFolder = (folderName: string) => {
    setOpenFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  };

  // Ajout manuel
  const handleAddManuel = () => {
    const n = name.trim();
    if (!n) {
      toast.error("Nom requis");
      return;
    }
    startTransition(async () => {
      if (campaignId === "mock") {
        toast.success(`Simulation : PNJ ${n} ajouté (Cockpit Preview)`);
        setName("");
        setRole("");
        setDescription("");
        setAvatarUrl("");
        setFaction("");
        setCity("");
        setIntellect(3);
        setPsyche(3);
        setConstitution(3);
        setManoeuvre(3);
        setMaxHp(45);
        setMaxMental(45);
        setMaxEndurance(250);
        setManualLevel(1);
        setManualRunes(["", "", ""]);
        return;
      }
      const res = await addNpc(campaignId, {
        name: n,
        role,
        disposition,
        description,
        avatarUrl,
        faction,
        city,
        intellect,
        psyche,
        constitution,
        manoeuvre,
        maxHp,
        maxMental,
        maxEndurance,
        level: manualLevel,
        runes: manualRunes.map(r => r.trim()).filter(Boolean),
      });
      if (!res.ok) {
        toast.error(res.reason);
        return;
      }
      setName("");
      setRole("");
      setDescription("");
      setAvatarUrl("");
      setFaction("");
      setCity("");
      setIntellect(3);
      setPsyche(3);
      setConstitution(3);
      setManoeuvre(3);
      setMaxHp(45);
      setMaxMental(45);
      setMaxEndurance(250);
      setManualLevel(1);
      setManualRunes(["", "", ""]);
      toast.success("PNJ ajouté");
      router.refresh();
    });
  };

  // Ajout depuis modèle
  const handleAddTemplate = (tpl: typeof NPC_TEMPLATES[0]) => {
    startTransition(async () => {
      if (campaignId === "mock") {
        toast.success(`Simulation : PNJ ${tpl.name} créé depuis le modèle (Cockpit Preview)`);
        return;
      }
      const res = await addNpc(campaignId, tpl);
      if (!res.ok) {
        toast.error(res.reason);
        return;
      }
      toast.success(`PNJ ${tpl.name} créé depuis le modèle`);
      router.refresh();
    });
  };

  // Ajout aléatoire
  const handleAddRandom = () => {
    startTransition(async () => {
      const stats = generateRandomStats(randLevel, randChaos, randArchetype, randVitals);
      const archeName = ARCHETYPES.find(a => a.id === randArchetype)?.label || "PNJ";
      
      const n = randName.trim() || `Sujet ${Math.floor(Math.random() * 900) + 100}`;
      const r = randRole.trim() || `PNJ ${archeName.split(" ")[1] || "Générique"}`;
      
      if (campaignId === "mock") {
        toast.success(`Simulation : ${n} généré avec succès ! (Cockpit Preview)`);
        setRandName("");
        setRandRole("");
        setRandFaction("");
        setRandCity("");
        return;
      }

      const res = await addNpc(campaignId, {
        name: n,
        role: r,
        disposition: "neutre",
        faction: randFaction,
        city: randCity,
        ...stats,
        level: randLevel,
        description: `PNJ généré aléatoirement (Niveau ${randLevel}, Chaos ${randChaos}) sous l'archétype ${archeName}.`
      });

      if (!res.ok) {
        toast.error(res.reason);
        return;
      }

      setRandName("");
      setRandRole("");
      setRandFaction("");
      setRandCity("");
      toast.success(`${n} généré avec succès !`);
      router.refresh();
    });
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 px-1 py-1">
      {/* En-tête de page */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
            <UserCircle2 size={20} />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground tracking-tight">Personnages Non-Joueurs</h1>
            <p className="text-[10px] text-foreground-muted uppercase tracking-wider">MJ Cockpit · Dossiers de Campagne</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Recherche */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-subtle" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Factions, villes, noms…"
              className={`${inputCls} h-8 w-48 pl-7 text-xs bg-background/55`}
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground-subtle hover:text-foreground">
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Barre d'outils / Tri par dossiers */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-secondary/20 p-2.5 rounded-lg border border-border/30">
        {/* Disposition filter */}
        <div className="flex flex-wrap gap-1.5">
          <button 
            onClick={() => setFilter("all")} 
            className={`px-2.5 py-1 text-xs rounded transition-all cursor-pointer ${filter === "all" ? "bg-foreground text-background" : "bg-transparent text-ink-subtle border border-border/40 hover:text-foreground"}`}
          >
            Tous ({npcs.length})
          </button>
          {DISPO_ORDER.map((d) => {
            const m = DISPO_META[d];
            const active = filter === d;
            return (
              <button
                key={d}
                onClick={() => setFilter(filter === d ? "all" : d)}
                className="px-2.5 py-1 text-xs rounded border border-border/30 transition-all cursor-pointer"
                style={{
                  background: active ? m.bg : "transparent",
                  color: active ? `rgb(${m.rgb})` : "var(--foreground-muted)",
                  borderColor: active ? `rgba(${m.rgb}, 0.35)` : "rgba(0,0,0,0.06)",
                }}
              >
                {m.label} ({npcs.filter(n => n.disposition === d).length})
              </button>
            );
          })}
        </div>

        {/* Virtuel Dossier selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase font-mono font-medium tracking-wider text-ink-tertiary">Groupement Dossier :</span>
          <div className="flex bg-secondary/80 p-0.5 rounded border border-border/45 text-[11px]">
            <button 
              onClick={() => setGroupingMode("none")} 
              className={`px-2 py-0.5 rounded-sm transition-colors cursor-pointer ${groupingMode === "none" ? "bg-card text-foreground font-medium border border-border/15" : "text-ink-subtle hover:text-foreground"}`}
            >
              Simple
            </button>
            <button 
              onClick={() => setGroupingMode("faction")} 
              className={`px-2 py-0.5 rounded-sm transition-colors cursor-pointer ${groupingMode === "faction" ? "bg-card text-foreground font-medium border border-border/15" : "text-ink-subtle hover:text-foreground"}`}
            >
              Factions
            </button>
            <button 
              onClick={() => setGroupingMode("city")} 
              className={`px-2 py-0.5 rounded-sm transition-colors cursor-pointer ${groupingMode === "city" ? "bg-card text-foreground font-medium border border-border/15" : "text-ink-subtle hover:text-foreground"}`}
            >
              Villes
            </button>
            <button 
              onClick={() => setGroupingMode("disposition")} 
              className={`px-2 py-0.5 rounded-sm transition-colors cursor-pointer ${groupingMode === "disposition" ? "bg-card text-foreground font-medium border border-border/15" : "text-ink-subtle hover:text-foreground"}`}
            >
              Dispo
            </button>
          </div>
        </div>
      </div>

      {/* MJ Panneau de création / Génération */}
      {canEdit && (
        <section className="campaign-panel p-4 flex flex-col gap-3.5 bg-secondary/10">
          <header className="flex items-center justify-between border-b border-border/40 pb-2">
            <span className="text-xs uppercase font-mono tracking-wider font-semibold text-primary flex items-center gap-1.5">
              <Plus size={13} /> {creationTab === "manuel" ? "Créer un PNJ" : creationTab === "random" ? "Générer un PNJ Aléatoire" : "Importer un PNJ existant"}
            </span>
            {/* Tabs */}
            <div className="flex bg-secondary/70 p-0.5 rounded border border-border/40 text-[10px] uppercase font-mono">
              <button 
                onClick={() => setCreationTab("manuel")} 
                className={`px-2 py-0.5 rounded-sm transition-all cursor-pointer ${creationTab === "manuel" ? "bg-card text-foreground font-bold shadow-sm" : "text-ink-subtle hover:text-foreground"}`}
              >
                Création
              </button>
              <button 
                onClick={() => setCreationTab("random")} 
                className={`px-2 py-0.5 rounded-sm transition-all cursor-pointer ${creationTab === "random" ? "bg-card text-foreground font-bold shadow-sm" : "text-ink-subtle hover:text-foreground"}`}
              >
                Générateur
              </button>
              <button 
                onClick={() => setCreationTab("templates")} 
                className={`px-2 py-0.5 rounded-sm transition-all cursor-pointer ${creationTab === "templates" ? "bg-card text-foreground font-bold shadow-sm" : "text-ink-subtle hover:text-foreground"}`}
              >
                Modèles
              </button>
            </div>
          </header>

          {/* Onglet Manuel */}
          {creationTab === "manuel" && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Nom du PNJ" className={`${inputCls}`} />
                <input value={role} onChange={(e) => setRole(e.target.value)} maxLength={80} placeholder="Rôle (ex: Marchand, Garde...)" className={`${inputCls}`} />
                <DispoPills value={disposition} onChange={setDisposition} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input value={faction} onChange={(e) => setFaction(e.target.value)} maxLength={80} placeholder="Faction (ex: Les Écorcheurs)" className={`${inputCls}`} list="factions" />
                <input value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} placeholder="Ville / Lieu (ex: Solitude)" className={`${inputCls}`} list="cities" />
                <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="URL Image Portrait (optionnelle)" className={`${inputCls}`} />
              </div>

              {/* Datalists suggestions */}
              <datalist id="factions">
                {existingFactions.map(f => <option key={f} value={f} />)}
              </datalist>
              <datalist id="cities">
                {existingCities.map(c => <option key={c} value={c} />)}
              </datalist>

              {/* Caractéristiques manuels */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-secondary/30 p-2.5 rounded-lg border border-border/20">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-primary font-medium">🧠 INTELLECT</span>
                  <input type="number" min={1} max={15} value={intellect} onChange={(e) => setIntellect(parseInt(e.target.value) || 1)} className="w-12 h-8 text-center rounded border border-border bg-background text-xs font-mono" />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-mhp font-medium">🔮 PSYCHÉ</span>
                  <input type="number" min={1} max={15} value={psyche} onChange={(e) => setPsyche(parseInt(e.target.value) || 1)} className="w-12 h-8 text-center rounded border border-border bg-background text-xs font-mono" />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-hp font-medium">❤️ CONSTITUTION</span>
                  <input type="number" min={1} max={15} value={constitution} onChange={(e) => setConstitution(parseInt(e.target.value) || 1)} className="w-12 h-8 text-center rounded border border-border bg-background text-xs font-mono" />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-endu font-medium">👣 MANŒUVRE</span>
                  <input type="number" min={1} max={15} value={manoeuvre} onChange={(e) => setManoeuvre(parseInt(e.target.value) || 1)} className="w-12 h-8 text-center rounded border border-border bg-background text-xs font-mono" />
                </div>
              </div>

              {/* Vitaux manuels */}
              <div className="grid grid-cols-3 gap-3 bg-secondary/35 p-2.5 rounded-lg border border-border/20">
                <div className="flex flex-col gap-1 text-[10px] font-mono text-ink-muted">
                  <span>HP Max</span>
                  <input type="number" min={1} value={maxHp} onChange={(e) => setMaxHp(parseInt(e.target.value) || 1)} className="w-full h-8 text-center rounded border border-border bg-background text-xs font-mono" />
                </div>
                <div className="flex flex-col gap-1 text-[10px] font-mono text-ink-muted">
                  <span>Mental Max</span>
                  <input type="number" min={1} value={maxMental} onChange={(e) => setMaxMental(parseInt(e.target.value) || 1)} className="w-full h-8 text-center rounded border border-border bg-background text-xs font-mono" />
                </div>
                <div className="flex flex-col gap-1 text-[10px] font-mono text-ink-muted">
                  <span>Endurance Max</span>
                  <input type="number" min={1} value={maxEndurance} onChange={(e) => setMaxEndurance(parseInt(e.target.value) || 1)} className="w-full h-8 text-center rounded border border-border bg-background text-xs font-mono" />
                </div>
              </div>

              {/* Niveau et Runes initiales */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-secondary/30 p-2.5 rounded-lg border border-border/20 items-end">
                <div className="flex flex-col gap-1 text-[10px] font-mono text-ink-muted">
                  <span>Niveau initial</span>
                  <input type="number" min={1} max={99} value={manualLevel} onChange={(e) => setManualLevel(parseInt(e.target.value) || 1)} className="w-full h-8 text-center rounded border border-border bg-background text-xs font-mono" />
                </div>
                <div className="flex flex-col gap-1 text-[10px] font-mono text-ink-muted sm:col-span-3">
                  <span>🔮 Runes équipées (Max 3)</span>
                  <div className="grid grid-cols-3 gap-2">
                    <input 
                      value={manualRunes[0]} 
                      onChange={(e) => setManualRunes([e.target.value, manualRunes[1], manualRunes[2]])} 
                      maxLength={40} 
                      placeholder="Rune 1" 
                      className={`${inputCls} h-8 text-xs font-mono`} 
                    />
                    <input 
                      value={manualRunes[1]} 
                      onChange={(e) => setManualRunes([manualRunes[0], e.target.value, manualRunes[2]])} 
                      maxLength={40} 
                      placeholder="Rune 2" 
                      className={`${inputCls} h-8 text-xs font-mono`} 
                    />
                    <input 
                      value={manualRunes[2]} 
                      onChange={(e) => setManualRunes([manualRunes[0], manualRunes[1], e.target.value])} 
                      maxLength={40} 
                      placeholder="Rune 3" 
                      className={`${inputCls} h-8 text-xs font-mono`} 
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} placeholder="Description (optionnelle)" className={`${inputCls} flex-1`} />
                <button
                  type="button"
                  onClick={handleAddManuel}
                  disabled={isPending || !name.trim()}
                  className="flex h-9 items-center gap-1.5 rounded-md bg-foreground px-4 text-xs font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40 cursor-pointer"
                >
                  <Check size={13} /> Créer PNJ
                </button>
              </div>
            </div>
          )}

          {/* Onglet Générateur Aléatoire */}
          {creationTab === "random" && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input value={randName} onChange={(e) => setRandName(e.target.value)} maxLength={80} placeholder="Nom personnalisé (laisser vide pour auto)" className={`${inputCls}`} />
                <input value={randRole} onChange={(e) => setRandRole(e.target.value)} maxLength={80} placeholder="Rôle personnalisé (laisser vide pour auto)" className={`${inputCls}`} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input value={randFaction} onChange={(e) => setRandFaction(e.target.value)} maxLength={80} placeholder="Faction d'appartenance" className={`${inputCls}`} list="factions" />
                <input value={randCity} onChange={(e) => setRandCity(e.target.value)} maxLength={80} placeholder="Ville / Localisation" className={`${inputCls}`} list="cities" />
              </div>

              {/* Paramètres de Génération Neumorphic */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-secondary/35 p-3 rounded-lg border border-border/25 text-xs">
                {/* Archétype */}
                <div className="flex flex-col gap-1.5">
                  <span className="font-mono text-[10px] uppercase text-ink-muted">Archétype Modulaire :</span>
                  <select 
                    value={randArchetype} 
                    onChange={(e) => setRandArchetype(e.target.value)}
                    className="h-8 rounded border border-border bg-background px-2 text-xs text-foreground cursor-pointer outline-none focus:border-primary/40"
                  >
                    {ARCHETYPES.map(a => (
                      <option key={a.id} value={a.id}>{a.label}</option>
                    ))}
                  </select>
                </div>

                {/* Niveau */}
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] uppercase text-ink-muted flex justify-between">
                    <span>Niveau Prédéfini :</span>
                    <span className="text-primary font-bold">Niv. {randLevel}</span>
                  </span>
                  <input 
                    type="range" 
                    min={1} 
                    max={10} 
                    value={randLevel} 
                    onChange={(e) => setRandLevel(parseInt(e.target.value))} 
                    className="w-full h-8 accent-primary cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-ink-tertiary">
                    <span>1 (Faible)</span>
                    <span>5 (Élite)</span>
                    <span>10 (Boss)</span>
                  </div>
                </div>

                {/* Indice de Chaos */}
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] uppercase text-hp flex justify-between">
                    <span>Indice de Chaos :</span>
                    <span className="font-bold">Facteur {randChaos} / 5</span>
                  </span>
                  <input 
                    type="range" 
                    min={1} 
                    max={5} 
                    value={randChaos} 
                    onChange={(e) => setRandChaos(parseInt(e.target.value))} 
                    className="w-full h-8 accent-hp cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-ink-tertiary">
                    <span>1 (Équilibré)</span>
                    <span>3 (Fou)</span>
                    <span>5 (Asymétrique)</span>
                  </div>
                </div>
              </div>

              {/* Options secondaires */}
              <div className="flex items-center justify-between border-t border-border/40 pt-2.5">
                <label className="flex items-center gap-2 text-xs text-ink-muted cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={randVitals} 
                    onChange={(e) => setRandVitals(e.target.checked)} 
                    className="size-3.5 rounded border-border cursor-pointer accent-primary"
                  />
                  <span>Randomiser Endurance & HP de base (+/- 25% de bruit)</span>
                </label>
                
                <button
                  type="button"
                  onClick={handleAddRandom}
                  disabled={isPending}
                  className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40 cursor-pointer shadow-lg shadow-primary/20"
                >
                  <Dices size={14} /> Générer & Ajouter PNJ
                </button>
              </div>
            </div>
          )}

          {/* Onglet Modèles Pré-configurés */}
          {creationTab === "templates" && (
            <div>
              <p className="text-2xs text-ink-tertiary uppercase tracking-wider mb-2.5">Cliquez sur un modèle pour l'importer instantanément dans la campagne :</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {NPC_TEMPLATES.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleAddTemplate(tpl)}
                    className="flex flex-col text-left p-2.5 rounded-lg border border-border/45 bg-background/55 hover:bg-surface-overlay hover:border-primary/40 transition-all cursor-pointer select-none group/btn"
                  >
                    <div className="flex gap-2 min-w-0">
                      <img src={tpl.avatarUrl} alt={tpl.name} className="size-9 rounded object-cover border border-border/40 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-xs text-foreground truncate group-hover/btn:text-primary transition-colors">{tpl.name}</h4>
                        <p className="text-[10px] text-ink-subtle truncate uppercase tracking-wider">{tpl.role}</p>
                      </div>
                    </div>
                    <div className="mt-2 text-[10px] text-ink-tertiary font-mono grid grid-cols-4 gap-0.5 bg-secondary/35 p-1 rounded border border-border/10 justify-items-center w-full">
                      <span>INT:{tpl.intellect}</span>
                      <span>PSY:{tpl.psyche}</span>
                      <span>CON:{tpl.constitution}</span>
                      <span>MAN:{tpl.manoeuvre}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Dossiers Virtuels Triables */}
      {dossiers.length === 0 ? (
        <div className="campaign-panel p-12 text-center text-sm text-foreground-subtle bg-card/45">
          {npcs.length === 0
            ? canEdit
              ? "Aucun PNJ. Utilisez le panneau ci-dessus pour en créer un ou en générer de manière aléatoire."
              : "Aucun PNJ dans cette campagne."
            : "Aucun PNJ ne correspond à vos filtres de recherche."}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {dossiers.map(([folderName, list]) => {
            const isOpen = openFolders[folderName] !== false;
            return (
              <section key={folderName} className="flex flex-col gap-2">
                {/* En-tête de dossier (collapsible) */}
                <button
                  type="button"
                  onClick={() => toggleFolder(folderName)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border/45 bg-secondary/35 hover:bg-secondary/50 transition-colors w-full text-left cursor-pointer group/fold shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]"
                >
                  {isOpen ? (
                    <FolderOpen size={16} className="text-primary shrink-0 transition-transform group-hover/fold:scale-110" />
                  ) : (
                    <Folder size={16} className="text-ink-tertiary shrink-0 transition-transform group-hover/fold:scale-110" />
                  )}
                  
                  <span className="font-semibold text-xs tracking-tight text-foreground flex-1">
                    {folderName}
                  </span>
                  
                  <Badge variant="outline" className="tabular font-mono text-[10px] text-ink-subtle bg-background/50">
                    {list.length} {list.length > 1 ? "PNJs" : "PNJ"}
                  </Badge>

                  {isOpen ? (
                    <ChevronDown size={14} className="text-ink-tertiary" />
                  ) : (
                    <ChevronRight size={14} className="text-ink-tertiary" />
                  )}
                </button>

                {/* Contenu du dossier (visible si ouvert) */}
                {isOpen && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-0.5 px-0.5">
                    {list.map((npc) => (
                      <NpcCard key={npc.id} npc={npc} canEdit={canEdit} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
