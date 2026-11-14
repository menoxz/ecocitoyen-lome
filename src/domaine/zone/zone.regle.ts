import type { Point } from './distance.regle.ts';

/**
 * Appartenance d’un point à la zone pilote (§1.4, CR11).
 *
 * Un rectangle englobant accepte la mer, une partie du Ghana et des quartiers hors commune :
 * le polygone de la commune fait foi, le rectangle n’est qu’un repli explicite quand le
 * fichier de contour est absent.
 */
export type Anneau = readonly (readonly [longitude: number, latitude: number])[];

export interface EmpriseRectangulaire {
  readonly latitudeMin: number;
  readonly latitudeMax: number;
  readonly longitudeMin: number;
  readonly longitudeMax: number;
}

export interface ZonePilote {
  readonly nom: string;
  readonly emprise: EmpriseRectangulaire;
  readonly polygone: Anneau | null;
}

function dansEmprise(point: Point, emprise: EmpriseRectangulaire): boolean {
  return (
    point.latitude >= emprise.latitudeMin &&
    point.latitude <= emprise.latitudeMax &&
    point.longitude >= emprise.longitudeMin &&
    point.longitude <= emprise.longitudeMax
  );
}

/** Lancer de rayon : compte les croisements d’une demi-droite vers l’est. */
export function pointDansPolygone(point: Point, anneau: Anneau): boolean {
  let dedans = false;

  for (let i = 0, j = anneau.length - 1; i < anneau.length; j = i++) {
    const [lonI, latI] = anneau[i];
    const [lonJ, latJ] = anneau[j];
    const traverse = latI > point.latitude !== latJ > point.latitude;

    if (traverse) {
      const longitudeCroisement = ((lonJ - lonI) * (point.latitude - latI)) / (latJ - latI) + lonI;
      if (point.longitude < longitudeCroisement) {
        dedans = !dedans;
      }
    }
  }

  return dedans;
}

export function estDansLaZone(point: Point, zone: ZonePilote): boolean {
  if (zone.polygone) {
    return pointDansPolygone(point, zone.polygone);
  }
  return dansEmprise(point, zone.emprise);
}