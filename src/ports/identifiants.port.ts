/**
 * Génération d''identifiants.
 *
 * Le domaine ne fabrique pas d''identifiant : il en reçoit un. Cela rend les tests lisibles
 * (identifiants prévisibles) et interdit la génération implicite dans une règle.
 */
export interface Identifiants {
  nouveau(prefixe: string): string;
}