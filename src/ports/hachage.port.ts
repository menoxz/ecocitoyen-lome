/**
 * Hachage de mot de passe (ENF06).
 *
 * Le domaine impose la politique (longueur, interprétation) ; l'algorithme est un détail
 * d'infrastructure remplaçable. Aucune empreinte ne circule en clair dans les cas d'usage.
 */
export interface Hachage {
  /** Retourne une empreinte auto-décrite (algorithme, coût, sel) vérifiable plus tard. */
  hacher(motDePasse: string): Promise<string>;
  /** Vérifie un mot de passe contre son empreinte. Ne lève jamais pour un simple échec. */
  verifier(empreinte: string, motDePasse: string): Promise<boolean>;
}

/** Hachage rapide pour les jetons de session : pas un secret utilisateur, juste une clé opaque. */
export interface EmpreinteJeton {
  calculer(jeton: string): string;
  generer(): string;
}