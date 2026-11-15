import type { DemandeSignalement } from "../../api/client.ts";

/**
 * Logique du parcours de signalement, sans DOM.
 *
 * Trois étapes au maximum et une règle de progression par étape (PARCOURS.md §3). Séparer cette
 * logique du composant la rend testable sans navigateur : c''est elle qui décide si l''on peut
 * avancer, le composant ne fait qu''afficher la réponse.
 */
export const ETAPES = [
  { cle: "preuve", libelle: "Photo" },
  { cle: "lieu", libelle: "Lieu" },
  { cle: "probleme", libelle: "Problème" },
] as const;

export type CleEtape = (typeof ETAPES)[number]["cle"];

export interface Position {
  readonly latitude: number;
  readonly longitude: number;
}

export interface Brouillon {
  readonly photos: readonly { readonly id: string; readonly nom: string }[];
  readonly sansPhoto: boolean;
  readonly position: Position | null;
  /**
   * L'usager accepte une position approximative (centre du quartier) quand la géolocalisation
   * est refusée. Sans cette issue, un refus de localisation rendait le signalement impossible.
   */
  readonly positionManuelle: boolean;
  readonly idQuartier: string;
  readonly repere: string;
  readonly idCategorie: string;
  readonly description: string;
}

/** Centres des quartiers, fournis par le référentiel : seule source d'une position de repli. */
export type CentresQuartiers = Readonly<Record<string, Position>>;

export const BROUILLON_INITIAL: Brouillon = {
  photos: [],
  sansPhoto: false,
  position: null,
  positionManuelle: false,
  idQuartier: "",
  repere: "",
  idCategorie: "",
  description: "",
};

export type Decision = { readonly ok: true } | { readonly ok: false; readonly raison: string };

export const DESCRIPTION_MIN = 10;
export const DESCRIPTION_MAX = 500;

/**
 * Peut-on passer à l'étape suivante ?
 *
 * La règle est stricte mais chaque refus porte sa raison, affichée telle quelle : un bouton
 * grisé sans explication est le défaut le plus courant d'un assistant en trois étapes.
 */
export function peutAvancer(etape: CleEtape, brouillon: Brouillon): Decision {
  if (etape === "preuve") {
    if (brouillon.photos.length === 0 && !brouillon.sansPhoto) {
      return { ok: false, raison: "Ajoutez une photo, ou déclarez que vous ne pouvez pas photographier." };
    }
    return { ok: true };
  }

  if (etape === "lieu") {
    const positionDisponible = brouillon.position !== null || brouillon.positionManuelle;
    if (!positionDisponible) {
      return {
        ok: false,
        raison: "Activez la localisation, ou choisissez le quartier pour situer le problème au centre de celui-ci.",
      };
    }
    if (brouillon.idQuartier === "") {
      return { ok: false, raison: "Choisissez le quartier : il détermine l'équipe qui sera envoyée." };
    }
    return { ok: true };
  }

  if (brouillon.idCategorie === "") {
    return { ok: false, raison: "Choisissez la catégorie du problème." };
  }
  const longueur = brouillon.description.trim().length;
  if (longueur < DESCRIPTION_MIN) {
    return { ok: false, raison: `Décrivez le problème en ${DESCRIPTION_MIN} caractères au moins.` };
  }
  if (longueur > DESCRIPTION_MAX) {
    return { ok: false, raison: `La description dépasse ${DESCRIPTION_MAX} caractères.` };
  }
  return { ok: true };
}

/** Étape suivante, ou null sur la dernière. */
export function etapeSuivante(etape: CleEtape): CleEtape | null {
  const index = ETAPES.findIndex((candidate) => candidate.cle === etape);
  return index >= 0 && index < ETAPES.length - 1 ? ETAPES[index + 1].cle : null;
}

/**
 * Étape précédente, ou `null` à la première.
 *
 * Reculer ne doit rien perdre : le brouillon reste tel quel, et la revalidation se fait à nouveau
 * en avançant. Le serveur ne voit que le brouillon final, jamais les allers-retours.
 */
export function etapePrecedente(etape: CleEtape): CleEtape | null {
  const index = ETAPES.findIndex((candidate) => candidate.cle === etape);
  return index > 0 ? ETAPES[index - 1].cle : null;
}

/**
 * Transforme le brouillon validé en demande conforme au contrat `/signalements`.
 *
 * Quand la position vient du centre du quartier, la demande le déclare : le serveur enregistre
 * une position approximative (`position_manuelle`, précision large) au lieu de faire croire à un
 * relevé GPS exact. Sans coordonnées du tout, on refuse plutôt que d'envoyer 0,0.
 */
export function construireDemande(brouillon: Brouillon, centres: CentresQuartiers = {}): DemandeSignalement {
  const position = brouillon.position ?? centres[brouillon.idQuartier] ?? null;
  if (!position) {
    throw new Error("position manquante");
  }
  const approximative = brouillon.position === null;

  return {
    id_categorie: brouillon.idCategorie,
    description: brouillon.description.trim(),
    latitude: position.latitude,
    longitude: position.longitude,
    repere: brouillon.repere.trim().length > 0 ? brouillon.repere.trim() : null,
    sans_photo: brouillon.photos.length === 0,
    nombre_photos: brouillon.photos.length,
    position_manuelle: approximative,
    precision_gps_m: approximative ? 500 : 15,
  };
}
