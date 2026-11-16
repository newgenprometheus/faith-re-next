/**
 * Seed FAITH : RE — roster initial (Brad / Corentin / Mathys / Yazid).
 *
 * Idempotent : skip si le perso existe déjà (lookup par `name`).
 * Crée chaque perso avec ses 20 skills à 1 pt.
 *
 * Usage : `pnpm db:seed`
 */

// L'env est chargé via `dotenv -e .env.local` dans le script package.json db:seed.
import { eq } from "drizzle-orm";
import { db } from "./index";
import { characters, characterSkills, users, conditions } from "./schema";
import { ALL_SKILLS } from "../lib/skills";

interface CustomSkillConfig {
  [skillName: string]: number;
}

interface CustomConditionConfig {
  label: string;
  kind: "buff" | "debuff" | "wound" | "focus" | "neutral";
  diceModifier: number;
}

interface CharacterProto {
  name: string;
  nom?: string;
  age?: number;
  xp?: number;
  enduranceTrainings?: number;
  fatePoints: number;
  currentHp?: number;
  currentMental?: number;
  maxMentalOverride?: number;
  currentEndurance?: number;
  bio?: string;
  skills?: CustomSkillConfig;
  conditions?: CustomConditionConfig[];
  ownerName?: string;
}

const INITIAL_ROSTER: CharacterProto[] = [
  { name: "Brad", fatePoints: 2 },
  { name: "Corentin", fatePoints: 1 },
  { name: "Mathys", fatePoints: 3 },
  { name: "Yazid", fatePoints: 2 },
  {
    name: "Gog",
    nom: "Pagog",
    age: 18,
    xp: 0,
    enduranceTrainings: 2,
    fatePoints: 2,
    currentHp: 42,
    currentMental: 62,
    maxMentalOverride: 62,
    currentEndurance: 229,
    bio: "Né dans les bas-fonds du District russe, dans le quartier le plus pauvre et le plus violent de la ville, Gog n'a jamais connu autre chose que la faim, le froid et les coups. Sa mère, ouvrière dans une usine de conserve, est morte quand il avait sept ans. Son père, il ne l'a jamais connu — ou alors il l'a oublié, comme il oublie à peu près tout.\n\nGog n'est pas intelligent. Vraiment pas. Il sait à peine lire, compte sur ses doigts, et la plupart des gens qui lui parlent finissent par renoncer après deux phrases. Mais ce que la nature lui a refusé en cervelle, elle le lui a rendu au centuple en muscles et en instinct. Son corps est une machine de guerre : large comme une porte, dur comme la pierre, avec une capacité de récupération quasi reptilienne (d'où le surnom murmuré dans les rues : « l'Écaillé »).\n\nIl a découvert la boxe à neuf ans, dans une cave humide reconvertie en ring clandestin. Pas de technique, pas de stratégie — juste frapper, frapper, encore frapper jusqu'à ce que l'autre tombe. Et ça marchait. Toujours. À dix-huit ans, il est devenu champion incontesté du District Russe, écrasant tous ses adversaires à coups de poings bruts et répétés. Personne ne sait esquiver, personne ne sait contrer ce mur qui avance.\n\nDans la rue, on le craint plus qu'on ne le respecte. Gog ne complote pas, ne ment pas, ne manipule pas — il n'en serait pas capable. Mais il a une sorte de flair animal, un sixième sens qui le prévient du danger avant même qu'il comprenne pourquoi. Et quand le sang coule, quand l'adrénaline monte, quelque chose s'allume en lui : une férocité totale, sans peur et sans limite.\n\nC'est un type simple. Loyal envers les rares qui le traitent bien. Dangereux pour tous les autres.",
    skills: {
      "Divination": 12,
      "Résilience": 8,
      "Volonté": 6,
      "Inflexibilité": 0,
      "Écaillé": 12,
      "Sixième Sens": 10,
      "Puissance": 12,
      "Vitesse de Réaction": 12,
      "Perception": 8,
      "Coordination Main/Œil": 0,
      "Savoir-Faire": 0,
      "Encyclopédie": 0,
      "Logique": 0,
      "Rhétorique": 0,
      "Drame": 0,
      "Conceptualisation": 0,
      "Sang-Froid": 0,
      "Empathie": 0,
      "Autorité": 0,
      "Suggestion": 0,
    },
    conditions: [
      {
        label: "RC dé génétique (Vitesse de Réaction +2)",
        kind: "buff",
        diceModifier: 2,
      },
    ],
    ownerName: "Prometheus",
  },
];

async function seed() {
  console.log("Seeding FAITH : RE roster…");

  for (const proto of INITIAL_ROSTER) {
    const existing = await db.query.characters.findFirst({
      where: eq(characters.name, proto.name),
    });

    if (existing) {
      console.log(`  - ${proto.name} existe déjà (id=${existing.id}), skip`);
      continue;
    }

    // Recherche de l'utilisateur propriétaire si spécifié
    let ownerUserId: string | null = null;
    if (proto.ownerName) {
      const ownerUser = await db.query.users.findFirst({
        where: eq(users.name, proto.ownerName),
      });
      if (ownerUser) {
        ownerUserId = ownerUser.id;
        console.log(`    -> Propriétaire trouvé : ${proto.ownerName} (id=${ownerUserId})`);
      } else {
        console.log(`    -> Propriétaire non trouvé : ${proto.ownerName}`);
      }
    }

    const [created] = await db
      .insert(characters)
      .values({
        name: proto.name,
        nom: proto.nom ?? "",
        age: proto.age ?? 25,
        xp: proto.xp ?? 0,
        enduranceTrainings: proto.enduranceTrainings ?? 2,
        fatePoints: proto.fatePoints,
        runes: ["", "", ""],
        ownerUserId,
        currentHp: proto.currentHp ?? 45,
        currentMental: proto.currentMental ?? 45,
        currentEndurance: proto.currentEndurance ?? 250,
        maxMentalOverride: proto.maxMentalOverride ?? null,
        bio: proto.bio ?? null,
      })
      .returning();

    console.log(`  + ${proto.name} créé (id=${created.id})`);

    if (ALL_SKILLS.length > 0) {
      await db.insert(characterSkills).values(
        ALL_SKILLS.map((skillName) => {
          const points = proto.skills ? (proto.skills[skillName] ?? 0) : 1;
          return {
            characterId: created.id,
            skillName,
            points,
          };
        }),
      );
      console.log(`    -> ${ALL_SKILLS.length} skills configurés`);
    }

    if (proto.conditions && proto.conditions.length > 0) {
      await db.insert(conditions).values(
        proto.conditions.map((c) => ({
          characterId: created.id,
          label: c.label,
          kind: c.kind,
          diceModifier: c.diceModifier,
        })),
      );
      console.log(`    -> ${proto.conditions.length} conditions configurées`);
    }
  }

  console.log("Seed terminé.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

