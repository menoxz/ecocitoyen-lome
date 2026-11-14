/**
 * Journal des actions sensibles (RB08, ENF09).
 *
 * Append-only : on écrit, on ne modifie jamais. Le journal répond à « qui a décidé quoi, quand »,
 * y compris pour une action faite en suppléance par un administrateur.
 */
export interface EntreeJournal {
  readonly idJournal: string;
  readonly acteur: string;
  readonly idUtilisateur: string | null;
  readonly action: string;
  readonly cible: string | null;
  readonly avant: string | null;
  readonly apres: string | null;
  readonly adresseIp: string | null;
  readonly dateAction: string;
}

export interface Journal {
  enregistrer(entree: EntreeJournal): void;
  lister(options?: { readonly limite?: number; readonly action?: string }): readonly EntreeJournal[];
}