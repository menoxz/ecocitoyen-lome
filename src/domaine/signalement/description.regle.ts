import { ErreurMetier } from '@domaine/erreurs.ts';

/** Bornes de la description (§4.2) : 10 à 500 caractères. */
export const DESCRIPTION_MIN = 10;
export const DESCRIPTION_MAX = 500;

export function verifierDescription(description: string): string {
  const propre = description.trim();
  if (propre.length < DESCRIPTION_MIN || propre.length > DESCRIPTION_MAX) {
    throw new ErreurMetier('DESCRIPTION_INVALIDE', { longueur: propre.length });
  }
  return propre;
}