import type { CategorieCandidate, ClassificateurIA, ResultatClassification } from "@ports/classificateur-ia.port.ts";

export const VERSION_SIMULATION = "Simulateur-EcoCitoyen-v2.0";
export const MENTION_SIMULATION = "Classification simulée — démonstration";

/**
 * Classificateur de secours (RG18, CR13).
 *
 * Déterministe : le résultat dépend de la taille de l''image, pas du hasard, sinon deux appels
 * sur la même photo donneraient deux réponses et l''indicateur de qualité IA n''aurait aucun sens.
 * La mention de simulation accompagne toujours le résultat : c''est une obligation, pas un détail.
 */
export function creerClassificateurSimulation(): ClassificateurIA {
  return {
    async classifier(photo, _mime, candidates) {
      if (candidates.length === 0) {
        throw new Error("aucune catégorie candidate");
      }
      const index = photo.length % candidates.length;
      const candidate = candidates[index];
      const resultat: ResultatClassification = {
        idCategorie: candidate.idCategorie,
        nomCategorie: candidate.nom,
        score: 0.62,
        justification: "Mode secours local : aucune analyse visuelle réelle n'a été effectuée.",
        mode: "SIMULATION",
        modeleVersion: VERSION_SIMULATION,
        simulationNotice: MENTION_SIMULATION,
      };
      return resultat;
    },
  };
}