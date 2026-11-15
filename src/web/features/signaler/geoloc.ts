/**
 * Géolocalisation du navigateur, isolée du composant.
 *
 * Pourquoi ce module existe : la position était demandée une seule fois au démarrage de
 * l'application. Un citoyen qui autorise la localisation **après** ce moment gardait donc
 * « aucune position » pour toute la session — aucune nouvelle demande n'était jamais faite.
 * L'écran appelle désormais cette fonction au moment où l'usager clique, et peut recommencer.
 *
 * Un refus n'est pas une erreur bloquante : le parcours continue avec le centre du quartier.
 */
export interface Position {
  readonly latitude: number;
  readonly longitude: number;
}

/** Délai accordé au navigateur avant d'abandonner : au-delà, on propose le quartier. */
export const DELAI_GEOLOC_MS = 8000;

/**
 * Position courante, ou `null` si elle est refusée, indisponible ou trop lente.
 * Ne rejette jamais : le parcours de signalement ne doit pas dépendre d'un capteur.
 */
export function positionDuNavigateur(): Promise<Position | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resoudre) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resoudre({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => resoudre(null),
      { enableHighAccuracy: true, timeout: DELAI_GEOLOC_MS },
    );
  });
}
