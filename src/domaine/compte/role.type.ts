/**
 * Les cinq profils du cahier des charges (§3.1) et la hiérarchie de droits (RB01).
 *
 * Un utilisateur possède un seul rôle. La hiérarchie est portée par la matrice de droits,
 * pas par une comparaison d’ordre dans le code.
 */
export const ROLES = ['VISITEUR', 'CITOYEN', 'AGENT', 'SUPERVISEUR', 'ADMIN'] as const;

export type Role = (typeof ROLES)[number];

/** Profils internes : ceux qui agissent au nom du service municipal. */
export const ROLES_INTERNES: readonly Role[] = ['AGENT', 'SUPERVISEUR', 'ADMIN'];

export function estRoleConnecte(role: Role): boolean {
  return role !== 'VISITEUR';
}

export function estRoleInterne(role: Role): boolean {
  return ROLES_INTERNES.includes(role);
}