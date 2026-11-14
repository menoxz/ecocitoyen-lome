/**
 * Limitation de débit par acteur et par fenêtre (RG23, RG24).
 *
 * Les compteurs vivent en base : un redémarrage ne doit pas remettre à zéro le quota d''un
 * utilisateur ni le verrouillage d''un compte attaqué.
 */
export interface LimiteDebit {
  /**
   * Incrémente le compteur d''une clé pour la fenêtre courante et retourne le total.
   * Exemple de clé : "signalement:usr-cit-1:2026-11-14T09".
   */
  incrementer(cle: string, fenetreDebut: string): number;
  /** Total atteint pour une clé et une fenêtre, sans incrémenter. */
  lire(cle: string, fenetreDebut: string): number;
  reinitialiser(cle: string, fenetreDebut: string): void;
}