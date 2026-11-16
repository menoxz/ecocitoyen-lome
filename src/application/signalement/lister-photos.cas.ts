import { ErreurMetier } from "@domaine/erreurs.ts";
import { aLeDroit } from "@domaine/compte/droits.regle.ts";
import type { Acteur, Dependances } from "../dependances.type.ts";
import type { MediaLu } from "@ports/depot-signalements.port.ts";

/**
 * Preuves d'un dossier — ce que l'agent doit pouvoir regarder avant de décider.
 *
 * La fiche annonçait « photo jointe » sans qu'aucune route ne permette de la lire : l'information
 * était donc une affirmation sans preuve. Cette lecture est réservée aux rôles qui voient tous les
 * signalements (agent, superviseur, administrateur) ; le citoyen garde l'accès à ses propres
 * dossiers par le parcours de suivi.
 *
 * Une photo masquée (`masque = 1`) n'est jamais renvoyée : le masquage existe pour retirer une
 * preuve choquante ou attentatoire, l'afficher ici l'annulerait.
 */
export interface PhotoDossier {
  readonly id_media: string;
  readonly type: "SIGNALEMENT" | "RESOLUTION";
  readonly mime: string;
  readonly date_ajout: string;
}

export function listerPhotos(idSignalement: string, acteur: Acteur, deps: Dependances): readonly PhotoDossier[] {
  if (!aLeDroit(acteur.role, "voirTousSignalements")) {
    throw new ErreurMetier("DROIT_REFUSE", { action: "voirTousSignalements" });
  }

  return deps.signalements
    .mediasDe(idSignalement)
    .filter((media) => media.masque !== true)
    .map((media) => ({
      id_media: media.idMedia,
      type: media.type,
      mime: media.mime,
      date_ajout: media.dateAjout,
    }));
}

export interface PhotoLue {
  readonly octets: Buffer;
  readonly mime: string;
}

/** Octets d'une preuve, après contrôle du droit et de l'appartenance au dossier demandé. */
export async function lirePhoto(
  idSignalement: string,
  idMedia: string,
  acteur: Acteur,
  deps: Dependances,
): Promise<PhotoLue | null> {
  if (!aLeDroit(acteur.role, "voirTousSignalements")) {
    throw new ErreurMetier("DROIT_REFUSE", { action: "voirTousSignalements" });
  }

  // L'appartenance est vérifiée ici : sans cela, un identifiant de média deviné donnerait accès à
  // la preuve d'un autre dossier.
  const media: MediaLu | undefined = deps.signalements
    .mediasDe(idSignalement)
    .find((candidat) => candidat.idMedia === idMedia);
  if (!media || media.masque === true) {
    return null;
  }

  const octets = await deps.stockagePhotos.lire(media.chemin);
  return octets ? { octets, mime: media.mime } : null;
}
