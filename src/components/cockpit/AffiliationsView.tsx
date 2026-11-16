"use client";

/**
 * AffiliationsView — Gestion des factions, villes, et guildes de campagne.
 * Permet au MJ de créer des affiliations, de les regrouper dans des dossiers virtuels,
 * et d'y associer/délier des PNJ dynamiquement.
 */

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { 
  Shield, MapPin, Sword, Info, Trash2, Pencil, Plus, 
  Check, X, ChevronDown, ChevronRight, Folder, FolderOpen, 
  Link, Unlink, UserPlus, Sparkles 
} from "lucide-react";
import { toast } from "sonner";
import { 
  addAffiliation, 
  updateAffiliation, 
  removeAffiliation, 
  associateNpcToAffiliation 
} from "@/lib/actions";
import { Badge } from "@/components/ui/badge";

type AffiliationType = "faction" | "city" | "guild" | "other";

export type AffiliationView = {
  id: string;
  name: string;
  type: string; // 'faction' | 'city' | 'guild' | 'other'
  description: string | null;
  avatarUrl: string | null;
  color: string | null;
};

// PNJ allégé pour l'affichage dans les dossiers d'affiliation
export type NpcSimple = {
  id: string;
  name: string;
  role: string | null;
  disposition: "allie" | "neutre" | "hostile";
  description: string | null;
  avatarUrl: string | null;
  faction: string | null;
  city: string | null;
  maxHp: number;
  maxMental: number;
  maxEndurance: number;
  level: number;
  runes: string[];
};

const TYPE_META: Record<AffiliationType, { label: string; icon: any; folderLabel: string; bg: string; border: string; text: string }> = {
  faction: { 
    label: "Faction / Organisation", 
    icon: Shield, 
    folderLabel: "🏢 Factions & Organisations",
    bg: "rgba(48,164,108,0.12)", 
    border: "rgba(48,164,108,0.3)", 
    text: "text-endu" 
  },
  city: { 
    label: "Ville / Cité / Lieu", 
    icon: MapPin, 
    folderLabel: "🏙️ Villes & Territoires",
    bg: "rgba(229,72,77,0.12)", 
    border: "rgba(229,72,77,0.3)", 
    text: "text-hp" 
  },
  guild: { 
    label: "Guilde / Ordre / Secte", 
    icon: Sword, 
    folderLabel: "⚔️ Guildes, Cultes & Ordres",
    bg: "rgba(224,175,12,0.12)", 
    border: "rgba(224,175,12,0.3)", 
    text: "text-primary" 
  },
  other: { 
    label: "Autre affiliation", 
    icon: Info, 
    folderLabel: "📂 Autres Groupements",
    bg: "rgba(146,157,178,0.12)", 
    border: "rgba(146,157,178,0.3)", 
    text: "text-ink-subtle" 
  },
};

const COLORS = [
  { value: "primary", label: "Bleu Flux", class: "bg-primary border-primary/40 text-primary" },
  { value: "hp", label: "Rouge Vitalité", class: "bg-hp border-hp/40 text-hp" },
  { value: "mhp", label: "Violet Psyché", class: "bg-mhp border-mhp/40 text-mhp" },
  { value: "endu", label: "Vert Endurance", class: "bg-endu border-endu/40 text-endu" },
  { value: "neutral", label: "Gris Neutre", class: "bg-ink-muted border-border text-ink-muted" },
  { value: "gold", label: "Or Ancien", class: "bg-yellow-500 border-yellow-500/40 text-yellow-600 dark:text-yellow-400" },
];

const inputCls =
  "h-9 min-w-0 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary/40 focus:outline-none";

// Carte individuelle d'affiliation
function AffiliationCard({
  affiliation,
  npcs,
  campaignNpcs,
  canEdit,
}: {
  affiliation: AffiliationView;
  npcs: NpcSimple[]; // PNJ actuellement liés à cette affiliation
  campaignNpcs: NpcSimple[]; // Tous les PNJ de la campagne pour l'association rapide
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showAssociate, setShowAssociate] = useState(false);
  
  const [name, setName] = useState(affiliation.name);
  const [type, setType] = useState<AffiliationType>(affiliation.type as AffiliationType);
  const [description, setDescription] = useState(affiliation.description ?? "");
  const [avatarUrl, setAvatarUrl] = useState(affiliation.avatarUrl ?? "");
  const [color, setColor] = useState(affiliation.color ?? "primary");
  
  const [isPending, startTransition] = useTransition();

  const meta = TYPE_META[affiliation.type as AffiliationType] || TYPE_META.other;
  const colorObj = COLORS.find(c => c.value === (affiliation.color ?? "primary")) || COLORS[0];

  // Liste des PNJ éligibles à l'association (qui ne sont pas déjà affiliés à cette faction ou cette ville)
  const assignableNpcs = useMemo(() => {
    return campaignNpcs.filter(npc => {
      if (affiliation.type === "faction" && npc.faction === affiliation.name) return false;
      if (affiliation.type === "city" && npc.city === affiliation.name) return false;
      return true;
    });
  }, [campaignNpcs, affiliation]);

  const save = () => {
    const n = name.trim();
    if (!n) return;
    startTransition(async () => {
      if (affiliation.id.startsWith("aff")) {
        toast.success("Simulation : Affiliation mise à jour (Cockpit Preview)");
        setEditing(false);
        return;
      }
      const res = await updateAffiliation(affiliation.id, {
        name: n,
        type,
        description,
        avatarUrl,
        color,
      });
      if (!res.ok) {
        toast.error(res.reason);
        return;
      }
      setEditing(false);
      router.refresh();
      toast.success("Affiliation mise à jour");
    });
  };

  const remove = () => {
    if (!confirm(`Supprimer l'affiliation "${affiliation.name}" ? Les PNJ liés ne seront pas supprimés mais perdront ce lien.`)) return;
    startTransition(async () => {
      if (affiliation.id.startsWith("aff")) {
        toast.success("Simulation : Affiliation supprimée (Cockpit Preview)");
        return;
      }
      await removeAffiliation(affiliation.id);
      router.refresh();
      toast.success("Affiliation supprimée");
    });
  };

  const handleAssociate = (npcId: string) => {
    startTransition(async () => {
      if (npcId.startsWith("n") || npcId.startsWith("mock")) {
        toast.success("Simulation : PNJ associé (Cockpit Preview)");
        setShowAssociate(false);
        return;
      }
      // Si type == 'faction' ou 'guild', on lie par le champ 'faction' du PNJ. Si 'city', par le champ 'city'.
      const fieldType = affiliation.type === "city" ? "city" : "faction";
      const res = await associateNpcToAffiliation(npcId, fieldType, affiliation.name);
      if (!res.ok) {
        toast.error(res.reason);
        return;
      }
      toast.success("PNJ associé avec succès");
      router.refresh();
    });
  };

  const handleDissociate = (npcId: string) => {
    startTransition(async () => {
      if (npcId.startsWith("n") || npcId.startsWith("mock")) {
        toast.success("Simulation : PNJ dissocié (Cockpit Preview)");
        return;
      }
      const fieldType = affiliation.type === "city" ? "city" : "faction";
      const res = await associateNpcToAffiliation(npcId, fieldType, null);
      if (!res.ok) {
        toast.error(res.reason);
        return;
      }
      toast.success("PNJ dissocié avec succès");
      router.refresh();
    });
  };

  if (editing) {
    return (
      <article className="campaign-panel flex flex-col gap-3 p-4 bg-card/75">
        <div className="flex flex-wrap items-center gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Nom de l'affiliation" className={`${inputCls} flex-1`} />
          <select 
            value={type} 
            onChange={(e) => setType(e.target.value as AffiliationType)}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground cursor-pointer outline-none"
          >
            {Object.entries(TYPE_META).map(([key, value]) => (
              <option key={key} value={key}>{value.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="URL de l'image ou blason (optionnelle)" className={`${inputCls} flex-1`} />
          <div className="flex items-center gap-1 bg-secondary/35 p-1 rounded border border-border">
            {COLORS.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                title={c.label}
                className={`size-5 rounded-full border transition-all cursor-pointer ${c.value === color ? "ring-2 ring-primary scale-110" : "opacity-75 hover:opacity-100"}`}
                style={{ backgroundColor: c.value === "neutral" ? "var(--foreground-muted)" : `var(--${c.value === "gold" ? "yellow-500" : c.value})` }}
              />
            ))}
          </div>
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="Description de la faction ou de la ville..."
          className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary/40 focus:outline-none"
        />
        <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-2">
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
    <article className="campaign-panel p-4 flex flex-col justify-between h-full bg-card/65 backdrop-blur-md hover:bg-card/75 transition-all">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-2.5 min-w-0">
            {affiliation.avatarUrl ? (
              <img 
                src={affiliation.avatarUrl} 
                alt={affiliation.name} 
                className="size-11 rounded-lg object-cover border border-border shadow-sm shrink-0" 
              />
            ) : (
              <div className="size-11 rounded-lg bg-secondary/80 flex items-center justify-center text-ink-subtle border border-border shrink-0">
                <meta.icon size={22} className={meta.text} />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate text-sm font-semibold text-foreground tracking-tight">{affiliation.name}</h2>
                <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: color === "neutral" ? "var(--foreground-muted)" : `var(--${color === "gold" ? "yellow-500" : color})` }} />
              </div>
              <p className="truncate text-2xs text-foreground-muted uppercase tracking-wider">{meta.label}</p>
            </div>
          </div>

          <button 
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded hover:bg-secondary/60 text-foreground-subtle hover:text-foreground shrink-0 cursor-pointer"
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {affiliation.description && (
          <p className="mt-2.5 text-xs text-foreground-muted leading-relaxed bg-secondary/20 p-2 rounded border border-border/20 line-clamp-2">
            {affiliation.description}
          </p>
        )}

        {/* Section Dossier Virtuel (Expansée) */}
        {expanded && (
          <div className="mt-3.5 border-t border-border/40 pt-3 flex flex-col gap-3">
            {/* Description complète si présente */}
            {affiliation.description && affiliation.description.length > 100 && (
              <div className="text-2xs text-foreground-subtle leading-relaxed bg-secondary/10 p-2 rounded border border-border/10">
                <strong>Description détaillée :</strong>
                <p className="mt-1">{affiliation.description}</p>
              </div>
            )}

            {/* Liste des PNJ affiliés */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">PNJ Affiliés ({npcs.length})</span>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setShowAssociate(!showAssociate)}
                    className="flex items-center gap-1 text-[10px] text-primary hover:text-primary-hover transition-colors font-medium cursor-pointer"
                  >
                    {showAssociate ? <X size={11} /> : <UserPlus size={11} />}
                    {showAssociate ? "Annuler" : "Lier un PNJ"}
                  </button>
                )}
              </div>

              {/* Formulaire d'association rapide */}
              {showAssociate && canEdit && (
                <div className="bg-secondary/45 p-2 rounded border border-border/40 mb-2 flex flex-col gap-2">
                  <span className="text-[9px] text-foreground-muted uppercase tracking-wider">Sélectionner un PNJ de la campagne :</span>
                  {assignableNpcs.length === 0 ? (
                    <p className="text-2xs text-foreground-subtle italic">Tous les PNJ sont déjà affiliés.</p>
                  ) : (
                    <div className="flex gap-1.5">
                      <select 
                        id={`select-npc-${affiliation.id}`}
                        className="h-7 flex-1 rounded border border-border bg-background px-2 text-xs text-foreground outline-none"
                      >
                        {assignableNpcs.map(npc => (
                          <option key={npc.id} value={npc.id}>{npc.name} ({npc.role ?? "Sans rôle"})</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const select = document.getElementById(`select-npc-${affiliation.id}`) as HTMLSelectElement;
                          if (select?.value) {
                            handleAssociate(select.value);
                            setShowAssociate(false);
                          }
                        }}
                        className="h-7 rounded bg-foreground px-2 text-2xs font-semibold text-background hover:opacity-90 cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Check size={11} /> Associer
                      </button>
                    </div>
                  )}
                </div>
              )}

              {npcs.length === 0 ? (
                <p className="text-2xs text-foreground-subtle italic py-1 bg-secondary/10 px-2 rounded border border-border/10">Aucun PNJ dans ce dossier virtuel.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {npcs.map(npc => {
                    const dispo = npc.disposition;
                    const dispoLabel = dispo === "allie" ? "Allié" : dispo === "hostile" ? "Hostile" : "Neutre";
                    const dispoColor = dispo === "allie" ? "text-endu" : dispo === "hostile" ? "text-hp" : "text-ink-subtle";

                    return (
                      <div key={npc.id} className="flex items-center justify-between p-1.5 rounded bg-secondary/35 border border-border/20 group/npc">
                        <div className="flex items-center gap-2 min-w-0">
                          {npc.avatarUrl ? (
                            <img src={npc.avatarUrl} alt={npc.name} className="size-6 rounded object-cover border border-border/40 shrink-0" />
                          ) : (
                            <div className="size-6 rounded bg-secondary/80 flex items-center justify-center text-ink-subtle border border-border shrink-0 text-2xs font-bold">
                              {npc.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="text-xs font-medium text-foreground block truncate">{npc.name}</span>
                            <span className="text-[9px] text-foreground-muted block truncate uppercase tracking-wider">{npc.role ?? "Sans rôle"} · <span className={dispoColor}>{dispoLabel}</span></span>
                          </div>
                        </div>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleDissociate(npc.id)}
                            title="Délier de ce dossier"
                            className="p-1 rounded text-foreground-subtle hover:text-hp hover:bg-secondary opacity-0 group-hover/npc:opacity-100 transition-all cursor-pointer"
                          >
                            <Unlink size={11} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {canEdit && (
        <div className="mt-3 flex items-center justify-end gap-3 border-t border-border/40 pt-2.5">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-[10px] text-foreground-subtle transition-colors hover:text-foreground cursor-pointer"
          >
            <Pencil size={11} /> Modifier
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

// Vue principale pour la gestion des affiliations
export function AffiliationsView({
  campaignId,
  affiliations,
  npcs,
  canEdit = false,
}: {
  campaignId: string;
  affiliations: AffiliationView[];
  npcs: NpcSimple[];
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});

  // Champs de création d'affiliation
  const [name, setName] = useState("");
  const [type, setType] = useState<AffiliationType>("faction");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [color, setColor] = useState("primary");

  const [isPending, startTransition] = useTransition();

  // Filtrer les affiliations selon la recherche textuelle
  const filteredAffiliations = useMemo(() => {
    const q = query.trim().toLowerCase();
    return affiliations.filter(aff => {
      if (!q) return true;
      return (
        aff.name.toLowerCase().includes(q) ||
        (aff.description ?? "").toLowerCase().includes(q) ||
        aff.type.toLowerCase().includes(q)
      );
    });
  }, [affiliations, query]);

  // Groupement dans des dossiers virtuels (par type d'affiliation)
  const folders = useMemo(() => {
    const map: Record<AffiliationType, AffiliationView[]> = {
      faction: [],
      city: [],
      guild: [],
      other: [],
    };

    filteredAffiliations.forEach(aff => {
      const t = aff.type as AffiliationType;
      if (map[t]) {
        map[t].push(aff);
      } else {
        map.other.push(aff);
      }
    });

    return Object.entries(map).filter(([_, list]) => list.length > 0) as [AffiliationType, AffiliationView[]][];
  }, [filteredAffiliations]);

  // Initialisation de l'état des dossiers (pliés/dépliés par défaut)
  useMemo(() => {
    const defaults: Record<string, boolean> = {};
    folders.forEach(([t]) => {
      const label = TYPE_META[t]?.folderLabel || "Dossier";
      defaults[label] = openFolders[label] !== undefined ? openFolders[label] : true;
    });
    setOpenFolders(prev => ({ ...defaults, ...prev }));
  }, [folders]);

  const toggleFolder = (folderLabel: string) => {
    setOpenFolders(prev => ({
      ...prev,
      [folderLabel]: !prev[folderLabel],
    }));
  };

  const handleCreate = () => {
    const n = name.trim();
    if (!n) {
      toast.error("Nom requis");
      return;
    }
    startTransition(async () => {
      if (campaignId === "mock") {
        toast.success("Simulation : Affiliation créée ! (Cockpit Preview)");
        setName("");
        setDescription("");
        setAvatarUrl("");
        setColor("primary");
        return;
      }
      const res = await addAffiliation(campaignId, {
        name: n,
        type,
        description,
        avatarUrl,
        color,
      });
      if (!res.ok) {
        toast.error(res.reason);
        return;
      }
      setName("");
      setDescription("");
      setAvatarUrl("");
      setColor("primary");
      toast.success("Affiliation créée avec succès !");
      router.refresh();
    });
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 px-1 py-1">
      {/* En-tête */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
            <Shield size={20} />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground tracking-tight">Affiliations & Factions</h1>
            <p className="text-[10px] text-foreground-muted uppercase tracking-wider">MJ Cockpit · Dossiers d'Allégeances</p>
          </div>
        </div>
        
        {/* Recherche */}
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une faction, ville..."
            className={`${inputCls} h-8 w-52 pl-3 text-xs bg-background/55`}
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground-subtle hover:text-foreground">
              <X size={12} />
            </button>
          )}
        </div>
      </header>

      {/* Formulaire de création MJ */}
      {canEdit && (
        <section className="campaign-panel p-4 flex flex-col gap-3.5 bg-secondary/10">
          <header className="flex items-center gap-2 border-b border-border/40 pb-2">
            <span className="text-xs uppercase font-mono tracking-wider font-semibold text-primary flex items-center gap-1.5">
              <Plus size={13} /> Déclarer une nouvelle Affiliation
            </span>
          </header>

          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Nom (ex: Ligue Marchande, Val-Benoît)" className={`${inputCls}`} />
              <select 
                value={type} 
                onChange={(e) => setType(e.target.value as AffiliationType)}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground cursor-pointer outline-none"
              >
                {Object.entries(TYPE_META).map(([key, value]) => (
                  <option key={key} value={key}>{value.label}</option>
                ))}
              </select>
              
              <div className="flex items-center justify-between bg-secondary/25 px-3 py-1 rounded border border-border">
                <span className="text-2xs text-ink-muted uppercase tracking-wider font-mono">Couleur :</span>
                <div className="flex items-center gap-1.5">
                  {COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      title={c.label}
                      className={`size-5 rounded-full border transition-all cursor-pointer ${c.value === color ? "ring-2 ring-primary scale-110" : "opacity-75 hover:opacity-100"}`}
                      style={{ backgroundColor: c.value === "neutral" ? "var(--foreground-muted)" : `var(--${c.value === "gold" ? "yellow-500" : c.value})` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="URL d'un emblème ou blason (facultatif)" className={`${inputCls}`} />
              <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} placeholder="Description synthétique (rôle, histoire, influence...)" className={`${inputCls}`} />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleCreate}
                disabled={isPending || !name.trim()}
                className="flex h-9 items-center gap-1.5 rounded-md bg-foreground px-4 text-xs font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40 cursor-pointer"
              >
                <Check size={13} /> Déclarer l'affiliation
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Dossiers Virtuels pliables */}
      {folders.length === 0 ? (
        <div className="campaign-panel p-12 text-center text-sm text-foreground-subtle bg-card/45">
          {affiliations.length === 0
            ? "Aucune affiliation déclarée. Utilisez le panneau ci-dessus pour ajouter des factions ou des villes."
            : "Aucune affiliation ne correspond à votre recherche."}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {folders.map(([t, list]) => {
            const meta = TYPE_META[t] || TYPE_META.other;
            const folderLabel = meta.folderLabel;
            const isOpen = openFolders[folderLabel] !== false;

            return (
              <section key={t} className="flex flex-col gap-2">
                {/* En-tête de dossier pliable */}
                <button
                  type="button"
                  onClick={() => toggleFolder(folderLabel)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border/45 bg-secondary/35 hover:bg-secondary/50 transition-colors w-full text-left cursor-pointer group/fold shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]"
                >
                  {isOpen ? (
                    <FolderOpen size={16} className="text-primary shrink-0 transition-transform group-hover/fold:scale-110" />
                  ) : (
                    <Folder size={16} className="text-ink-tertiary shrink-0 transition-transform group-hover/fold:scale-110" />
                  )}
                  
                  <span className="font-semibold text-xs tracking-tight text-foreground flex-1">
                    {folderLabel}
                  </span>
                  
                  <Badge variant="outline" className="tabular font-mono text-[10px] text-ink-subtle bg-background/50">
                    {list.length} {list.length > 1 ? "affiliations" : "affiliation"}
                  </Badge>

                  {isOpen ? (
                    <ChevronDown size={14} className="text-ink-tertiary" />
                  ) : (
                    <ChevronRight size={14} className="text-ink-tertiary" />
                  )}
                </button>

                {/* Liste des cartes d'affiliations si ouvert */}
                {isOpen && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-0.5 px-0.5">
                    {list.map(aff => {
                      // PNJ associés par nom à cette affiliation
                      const associatedNpcs = npcs.filter(npc => {
                        if (aff.type === "city") {
                          return npc.city === aff.name;
                        }
                        return npc.faction === aff.name;
                      });

                      return (
                        <AffiliationCard
                          key={aff.id}
                          affiliation={aff}
                          npcs={associatedNpcs}
                          campaignNpcs={npcs}
                          canEdit={canEdit}
                        />
                      );
                    })}
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
