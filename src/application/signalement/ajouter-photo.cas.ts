import { ErreurMetier } from "@domaine/erreurs.ts";
import type { MediaLu } from "@ports/depot-signalements.port.ts";
import type { Acteur, Dependances } from "../dependances.type.ts";
import { journaliser } from "../compte/inscrire.cas.ts";
import { chargerDossier } from "./commun.ts";

export interface ResultatPhoto {
  readonly media: MediaLu;
  readonly classificationEnfilee: boolean;
}

/**
 * Ajout d'une photo à un dossier existant.
 *
 * L'écriture de la photo ne dépend pas de l'IA (CR13) : la classification est mise en file après
 * l'enregistrement, et le dossier reste utilisable si elle échoue. Aucun contenu binaire ne passe
 * par la base : on ne stocke que le chemin (Z-09).
 */
export async function ajouterPhoto(
  idSignalement: string,
  octets: Buffer,
  mimeAnnonce: string | null,
  acteur: Acteur,
  deps: Dependances,
): Promise<ResultatPhoto> {
  const dossier = chargerDossier(idSignalement, deps);

  if (dossier.idAuteur !== acteur.idUtilisateur) {
    throw new ErreurMetier("DROIT_REFUSE", { raison: "non_auteur" });
  }
  if (dossier.statut === "RESOLU" || dossier.statut === "REJETE") {
    throw new ErreurMetier("STATUT_INCOMPATIBLE", { statut: dossier.statut });
  }

  const existantes = deps.signalements.mediasDe(idSignalement).filter((m) => m.type === "SIGNALEMENT");
  if (existantes.length >= 3) {
    throw new ErreurMetier("CONTRAT_INVALIDE", { champ: "photos", maximum: 3 });
  }

  const enregistree = await deps.stockagePhotos.enregistrer(octets, mimeAnnonce);
  const maintenant = deps.horloge.maintenant();

  const media: MediaLu = {
    idMedia: deps.identifiants.nouveau("med"),
    idSignalement,
    idIntervention: null,
    type: "SIGNALEMENT",
    chemin: enregistree.chemin,
    mime: enregistree.mime,
    tailleOctets: enregistree.tailleOctets,
    masque: false,
    dateAjout: maintenant,
  };
  deps.signalements.ajouterMedia(media);

  let classificationEnfilee = false;
  if (dossier.modeIa === "AUCUN") {
    deps.travaux.enfiler({
      idTache: deps.identifiants.nouveau("tache"),
      type: "classification_ia",
      cible: idSignalement,
      disponibleLe: maintenant,
    });
    classificationEnfilee = true;
  }

  journaliser(deps, acteur, "signalement.photo", idSignalement, null, media.chemin);
  return { media, classificationEnfilee };
}