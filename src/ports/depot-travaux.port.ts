export const ETATS_TACHE = ["EN_ATTENTE", "EN_COURS", "TERMINEE", "ECHOUEE"] as const;
export type EtatTache = (typeof ETATS_TACHE)[number];

export interface Tache {
  readonly idTache: string;
  readonly type: string;
  readonly cible: string;
  readonly etat: EtatTache;
  readonly tentatives: number;
  readonly disponibleLe: string;
  readonly derniereErreur: string | null;
}

/**
 * File de travaux persistée.
 *
 * Persistée et non en mémoire : une classification en attente doit survivre à un redémarrage,
 * sinon le dossier reste éternellement sans suggestion et personne ne s''en aperçoit.
 */
export interface DepotTravaux {
  enfiler(entree: { readonly idTache: string; readonly type: string; readonly cible: string; readonly disponibleLe: string }): void;
  /** Réserve les tâches dues et les marque en cours, en une seule transaction. */
  prendre(limite: number, maintenantIso: string): readonly Tache[];
  terminer(idTache: string): void;
  echouer(idTache: string, erreur: string, prochainEssaiIso: string): void;
  parId(idTache: string): Tache | null;
  compterEnAttente(): number;
}