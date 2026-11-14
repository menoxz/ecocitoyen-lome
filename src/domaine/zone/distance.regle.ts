/**
 * Distance géodésique entre deux points.
 *
 * Le domaine ne dépend d’aucune bibliothèque géospatiale : la formule de haversine suffit
 * pour deux rayons de recherche (30 m pour les doublons, 100 m pour la corroboration).
 * L’erreur introduite (< 0,5 %) est sans effet à cette échelle.
 */
export interface Point {
  readonly latitude: number;
  readonly longitude: number;
}

const RAYON_TERRE_M = 6_371_000;

function enRadians(degres: number): number {
  return (degres * Math.PI) / 180;
}

export function distanceMetres(a: Point, b: Point): number {
  const phiA = enRadians(a.latitude);
  const phiB = enRadians(b.latitude);
  const deltaPhi = enRadians(b.latitude - a.latitude);
  const deltaLambda = enRadians(b.longitude - a.longitude);

  const h =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phiA) * Math.cos(phiB) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  return RAYON_TERRE_M * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}