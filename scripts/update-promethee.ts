import { eq } from "drizzle-orm";
import { db } from "@/db";
import { characters, characterSkills } from "@/db/schema";
import {
  BASE_HP,
  BASE_MHP,
  calculateLevel,
  getLevelBonus,
  getEnduranceTier,
} from "@/lib/faith-system";
import { calculateAttribute } from "@/lib/skills";

const ID = "b292dac4-5d53-48db-b090-8483bc245e29"; // Prométhée

// Compétences fournies (Autorité 6-2 = 4 → total 79, sous le cap 80).
const SKILLS: Record<string, number> = {
  Encyclopédie: 6,
  Logique: 1,
  Rhétorique: 6,
  Drame: 5,
  Conceptualisation: 0,
  "Sang-Froid": 6,
  Divination: 6,
  Empathie: 0,
  Autorité: 4,
  Suggestion: 3,
  Résilience: 2,
  Volonté: 2,
  Inflexibilité: 0,
  Écaillé: 6,
  "Sixième Sens": 5,
  "Coordination Main/Œil": 0,
  "Savoir-Faire": 11,
  Puissance: 0,
  "Vitesse de Réaction": 10,
  Perception: 6,
};

async function main() {
  const xp = 1000; // niveau 2 (seuil [2] = 1000)
  await db
    .update(characters)
    .set({
      name: "Prométhée",
      nom: "",
      age: 20,
      xp,
      enduranceTrainings: 2, // palier « Défaut » → max 250
      maxHpOverride: 96,
      maxMentalOverride: 97,
      currentHp: 96,
      currentMental: 97,
      currentEndurance: 250,
      updatedAt: new Date(),
    })
    .where(eq(characters.id, ID));

  for (const [skillName, points] of Object.entries(SKILLS)) {
    await db
      .insert(characterSkills)
      .values({ characterId: ID, skillName, points })
      .onConflictDoUpdate({
        target: [characterSkills.characterId, characterSkills.skillName],
        set: { points },
      });
  }

  // Vérif : valeurs dérivées par l'app.
  const total = Object.values(SKILLS).reduce((a, b) => a + b, 0);
  const consti = calculateAttribute(SKILLS, "CONSTITUTION");
  const psy = calculateAttribute(SKILLS, "PSYCHÉ");
  const level = calculateLevel(xp);
  const bonus = getLevelBonus(level);
  const maxHp = BASE_HP + bonus + consti;
  const maxMental = BASE_MHP + bonus + psy;
  const endu = getEnduranceTier(2);

  console.log("=== Prométhée mis à jour ===");
  console.log(`Niveau ${level} (xp ${xp}, bonus ${bonus})`);
  console.log(`Total points alloués : ${total}/80`);
  console.log(`CONSTI=${consti}  PSYCHÉ=${psy}`);
  console.log(`maxHp dérivé app = ${BASE_HP}+${bonus}+${consti} = ${maxHp}  (fiche dit 76)`);
  console.log(`maxMHP dérivé app = ${BASE_MHP}+${bonus}+${psy} = ${maxMental}  (fiche dit 77)`);
  console.log(`endurance max = ${endu.max} (palier ${endu.label})  (fiche dit 250)`);
  console.log(`current : HP 39/${maxHp}  MHP 77/${maxMental}  END 250/${endu.max}`);
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
