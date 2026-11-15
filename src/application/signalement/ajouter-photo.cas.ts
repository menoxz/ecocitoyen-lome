import { ErreurMetier } from "@domaine/erreurs.ts";
import { deciderTypePhoto } from "@domaine/intervention/preuve.regle.ts";
import { interventionActive } from "@domaine/intervention/unicite-active.regle.ts";
import type { MediaLu } from "@ports/depot-signalements.port.ts";
import type { Acteur, Dependances } from "../dependances.type.ts";
import { journaliser } from "../compte/inscrire.cas.ts";
import { ligneDe, versIntervention } from "../intervention/adaptation.ts";
import { chargerDossier } from "./commun.ts";

export interface ResultatPhoto {
  readonly media: MediaLu;
  readonly classificationEnfilee: boolean;
}

/**
 * Ajout d'une photo à un dossier existant.
 *
 * Deux photos, deux droits : le citoyen auteur joint des vues du dépôt, l'agent de l'équipe
 * affectée joint la preuve de résolution exigée par CR8. La règle qui tranche vit dans
 * `domaine/intervention/preuve.regle.ts` ; ici on ne fait que l'appliquer.
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
  const lignes = deps.signalements.interventionsDe(idSignalement);
  const active = interventionActive(lignes.map(versIntervention));
  const medias = deps.signalements.mediasDe(idSignalement);

  const type = deciderTypePhoto({
    role: acteur.role,
    estAuteur: dossier.idAuteur === acteur.idUtilisateur,
    idEquipeAgent: acteur.idEquipe,
    idEquipeAffectee: active ? active.idEquipe : null,
    statut: dossier.statut,
    photosSignalement: medias.filter((media) => media.type === "SIGNALEMENT").length,
    photosResolution: medias.filter((media) => media.type === "RESOLUTION").length,
  });

  const enregistree = await deps.stockagePhotos.enregistrer(octets, mimeAnnonce);
  const maintenant = deps.horloge.maintenant();
  const ligneIntervention = type === "RESOLUTION" ? ligneDe(lignes, active) : null;

  const media: MediaLu = {
    idMedia: deps.identifiants.nouveau("med"),
    idSignalement,
    idIntervention: ligneIntervention ? ligneIntervention.idIntervention : null,
    type,
    chemin: enregistree.chemin,
    mime: enregistree.mime,
    tailleOctets: enregistree.tailleOctets,
    masque: false,
    dateAjout: maintenant,
  };
  deps.signalements.ajouterMedia(media);

  // Une preuve de résolution n'a rien à faire classer par l'IA : ce n'est pas un dépôt à qualifier.
  let classificationEnfilee = false;
  if (type === "SIGNALEMENT" && dossier.modeIa === "AUCUN") {
    deps.travaux.enfiler({
      idTache: deps.identifiants.nouveau("tache"),
      type: "classification_ia",
      cible: idSignalement,
      disponibleLe: maintenant,
    });
    classificationEnfilee = true;
  }

  journaliser(deps, acteur, `signalement.photo.${type.toLowerCase()}`, idSignalement, null, media.chemin);
  return { media, classificationEnfilee };
}

/** Le refus doit dire pourquoi : « rôle » et « pas l'auteur » ne sont pas le même reproche. */
export function expliquerRefusPhoto(erreur: ErreurMetier): string | null {
  if (erreur.code !== "DROIT_REFUSE") {
    return null;
  }
  return "Seul l'auteur du signalement ou un agent de l'équipe affectée peut joindre une photo.";
}
