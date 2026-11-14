import { distanceMetres, type Point } from '@domaine/zone/distance.regle.ts';
import { STATUTS_ACTIFS, type Signalement, type Statut } from './signalement.type.ts';

/**
 * Recherche de doublons (RG04).
 *
 * Trois conditions cumulatives, toutes paramétrables : même catégorie, distance sous le rayon,
 * ancienneté sous la fenêtre. Le prototype d’origine comparait 50 m sans regarder la catégorie
 * ni l’âge, ce qui proposait de confirmer un caniveau bouché à cause d’un tas d’ordures voisin.
 */
export interface ParametresDoublon {
  readonly rayonMetres: number;
  readonly fenetreJours: number;
}

export const PARAMETRES_DOUBLON_DEFAUT: ParametresDoublon = {
  rayonMetres: 30,
  fenetreJours: 30,
};

export interface CandidatDoublon {
  readonly idSignalement: string;
  readonly idCategorie: string;
  readonly statut: Statut;
  readonly dateSignalement: string;
  readonly latitude: number;
  readonly longitude: number;
}

export interface CibleDoublon extends Point {
  readonly idCategorie: string;
  /** Instant de référence fourni par l’appelant : le domaine ne lit pas l’horloge. */
  readonly maintenantIso: string;
}

const MS_PAR_JOUR = 86_400_000;

function ageJours(dateIso: string, maintenantIso: string): number {
  const ecart = Date.parse(maintenantIso) - Date.parse(dateIso);
  if (!Number.isFinite(ecart)) {
    return Number.POSITIVE_INFINITY;
  }
  return ecart / MS_PAR_JOUR;
}

export function trouverDoublons(
  candidats: readonly (CandidatDoublon | Signalement)[],
  cible: CibleDoublon,
  parametres: ParametresDoublon = PARAMETRES_DOUBLON_DEFAUT,
): readonly CandidatDoublon[] {
  return candidats
    .filter((candidat) => STATUTS_ACTIFS.includes(candidat.statut))
    .filter((candidat) => candidat.idCategorie === cible.idCategorie)
    .filter((candidat) => ageJours(candidat.dateSignalement, cible.maintenantIso) <= parametres.fenetreJours)
    .filter(
      (candidat) =>
        distanceMetres(cible, { latitude: candidat.latitude, longitude: candidat.longitude }) <=
        parametres.rayonMetres,
    )
    .map((candidat) => ({
      idSignalement: candidat.idSignalement,
      idCategorie: candidat.idCategorie,
      statut: candidat.statut,
      dateSignalement: candidat.dateSignalement,
      latitude: candidat.latitude,
      longitude: candidat.longitude,
    }));
}