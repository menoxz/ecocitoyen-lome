import { ErreurMetier } from "@domaine/erreurs.ts";
import type { Statut } from "./signalement.type.ts";

/**
 * « Moi aussi » : qui peut corroborer quel dossier.
 *
 * Une confirmation renforce la priorité du dossier (RG05) : elle n'a de sens que sur un problème
 * encore ouvert. Sur un dossier résolu ou rejeté, elle ne corrobore plus rien — d'où le refus
 * explicite plutôt qu'un compteur qui monterait sans effet.
 *
 * L'unicité par utilisateur n'est pas ici : elle est portée par la clé primaire de `confirmation`,
 * une règle qui tient dans le schéma ne se réécrit pas en TypeScript.
 */
const STATUTS_CONFIRMABLES: readonly Statut[] = ["NOUVEAU", "VALIDE", "EN_COURS", "ROUVERT"];

export interface DossierCorroborable {
  readonly statut: Statut;
  readonly idAuteur: string;
}

/** Lève un refus explicite ; ne retourne rien quand la confirmation est recevable. */
export function verifierConfirmable(dossier: DossierCorroborable, idUtilisateur: string): void {
  if (dossier.idAuteur === idUtilisateur) {
    throw new ErreurMetier("CONFIRMATION_PROPRE");
  }
  if (!STATUTS_CONFIRMABLES.includes(dossier.statut)) {
    throw new ErreurMetier("STATUT_INCOMPATIBLE", { statut: dossier.statut });
  }
}
