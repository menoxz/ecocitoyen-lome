import { ErreurMetier } from "../erreurs.ts";
import type { Role } from "../compte/role.type.ts";
import type { Statut } from "../signalement/signalement.type.ts";

/**
 * Qui peut ajouter quelle photo (CR8, §9).
 *
 * Deux photos différentes, deux droits différents :
 * - le citoyen auteur joint des photos de *signalement* (3 au plus) ;
 * - l'agent de l'équipe affectée joint la *preuve de résolution* (une seule), sur un dossier
 *   en cours d'intervention.
 *
 * Le prototype ne vérifiait que l'auteur : l'agent ne pouvait donc jamais fournir la preuve
 * obligatoire de sa clôture. Le parcours était bloqué, pas seulement mal gardé.
 */
export interface ContextePhoto {
  readonly role: Role;
  readonly estAuteur: boolean;
  readonly idEquipeAgent: string | null;
  readonly idEquipeAffectee: string | null;
  readonly statut: Statut;
  readonly photosSignalement: number;
  readonly photosResolution: number;
}

export type TypePhoto = "SIGNALEMENT" | "RESOLUTION";

export const MAX_PHOTOS_SIGNALEMENT = 3;
export const MAX_PHOTOS_RESOLUTION = 1;

export function deciderTypePhoto(contexte: ContextePhoto): TypePhoto {
  if (contexte.estAuteur) {
    return typePourAuteur(contexte);
  }
  if (estAgentDeLEquipeAffectee(contexte)) {
    return typePourAgent(contexte);
  }
  throw new ErreurMetier("DROIT_REFUSE", { raison: "non_auteur_ni_agent" });
}

function typePourAuteur(contexte: ContextePhoto): TypePhoto {
  if (contexte.statut === "RESOLU" || contexte.statut === "REJETE") {
    throw new ErreurMetier("STATUT_INCOMPATIBLE", { statut: contexte.statut });
  }
  if (contexte.photosSignalement >= MAX_PHOTOS_SIGNALEMENT) {
    throw new ErreurMetier("CONTRAT_INVALIDE", { champ: "photos", maximum: MAX_PHOTOS_SIGNALEMENT });
  }
  return "SIGNALEMENT";
}

function typePourAgent(contexte: ContextePhoto): TypePhoto {
  if (contexte.statut !== "EN_COURS") {
    throw new ErreurMetier("STATUT_INCOMPATIBLE", { statut: contexte.statut });
  }
  if (contexte.photosResolution >= MAX_PHOTOS_RESOLUTION) {
    throw new ErreurMetier("CONTRAT_INVALIDE", { champ: "photos", maximum: MAX_PHOTOS_RESOLUTION });
  }
  return "RESOLUTION";
}

/** Un agent ne vaut que pour son équipe : l'appartenance n'est jamais déduite du rôle seul. */
function estAgentDeLEquipeAffectee(contexte: ContextePhoto): boolean {
  if (contexte.role !== "AGENT" && contexte.role !== "SUPERVISEUR" && contexte.role !== "ADMIN") {
    return false;
  }
  if (contexte.idEquipeAgent === null || contexte.idEquipeAffectee === null) {
    return false;
  }
  return contexte.idEquipeAgent === contexte.idEquipeAffectee;
}
