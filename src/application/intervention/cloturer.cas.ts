import { ErreurMetier } from "@domaine/erreurs.ts";
import { aLeDroit } from "@domaine/compte/droits.regle.ts";
import { verifierTransition } from "@domaine/signalement/transitions.regle.ts";
import { interventionActive, verifierAppartenanceEquipe } from "@domaine/intervention/unicite-active.regle.ts";
import type { Signalement } from "@domaine/signalement/signalement.type.ts";
import type { Acteur, Dependances } from "../dependances.type.ts";
import { journaliser } from "../compte/inscrire.cas.ts";
import { chargerDossier } from "../signalement/commun.ts";
import { contexteDe } from "../signalement/contexte.ts";
import { ligneDe, versIntervention } from "./adaptation.ts";

export interface PhotoResolution {
  readonly chemin: string;
  readonly mime: string;
  readonly tailleOctets: number;
}

export interface CommandeCloture {
  readonly photo: PhotoResolution | null;
  readonly commentaire: string;
}

/**
 * Clôture d'une intervention (T5).
 *
 * CR8 est tenu par le domaine : sans photo de résolution, la transition est refusée avant toute
 * écriture. La preuve est stockée comme média RESOLUTION rattaché à l'intervention, jamais comme
 * contenu binaire dans la base (Z-09).
 */
export function cloturer(
  idSignalement: string,
  commande: CommandeCloture,
  acteur: Acteur,
  deps: Dependances,
): Signalement {
  if (!aLeDroit(acteur.role, "cloturerIntervention")) {
    throw new ErreurMetier("DROIT_REFUSE", { action: "cloturerIntervention" });
  }

  const dossier = chargerDossier(idSignalement, deps);
  const lignes = deps.signalements.interventionsDe(idSignalement);
  const active = interventionActive(lignes.map(versIntervention));

  if (acteur.role === "AGENT") {
    verifierAppartenanceEquipe(active, acteur.idEquipe);
  }

  verifierTransition(
    dossier.statut,
    "RESOLU",
    contexteDe(acteur, dossier, {
      estDeLEquipeAffectee: active !== null && active.idEquipe === acteur.idEquipe,
      maintenantIso: deps.horloge.maintenant(),
    }),
    { aPhotoResolution: commande.photo !== null, commentaire: commande.commentaire },
  );

  if (!commande.photo) {
    throw new ErreurMetier("PHOTO_MANQUANTE");
  }

  const maintenant = deps.horloge.maintenant();
  const ligne = ligneDe(lignes, active);

  // La photo de preuve arrive par /photos (elle est déjà écrite sur le disque et rattachée au
  // dossier). Réenregistrer un média ici créait un doublon du même chemin, avec le mime et la
  // taille annoncés par le client au lieu de ceux mesurés par le serveur.
  const preuve = deps.signalements
    .mediasDe(idSignalement)
    .find((media) => media.type === "RESOLUTION" && media.chemin === commande.photo?.chemin);

  if (!preuve) {
    deps.signalements.ajouterMedia({
      idMedia: deps.identifiants.nouveau("med"),
      idSignalement,
      idIntervention: ligne ? ligne.idIntervention : null,
      type: "RESOLUTION",
      chemin: commande.photo.chemin,
      mime: commande.photo.mime,
      tailleOctets: commande.photo.tailleOctets,
      masque: false,
      dateAjout: maintenant,
    });
  }

  if (ligne) {
    deps.signalements.majIntervention({
      ...ligne,
      statutIntervention: "TERMINEE",
      idAgent: ligne.idAgent ?? acteur.idUtilisateur,
      dateFin: maintenant,
      commentaire: commande.commentaire,
    });
  }

  const maj: Signalement = {
    ...dossier,
    statut: "RESOLU",
    dateResolution: maintenant,
    dateMiseAJour: maintenant,
  };
  deps.signalements.enregistrer(maj);
  deps.signalements.ajouterHistorique({
    idHistorique: deps.identifiants.nouveau("hist"),
    idSignalement,
    ancienStatut: "EN_COURS",
    nouveauStatut: "RESOLU",
    idAuteur: acteur.idUtilisateur,
    dateChangement: maintenant,
    commentaire: `Intervention terminée avec preuve photo. ${commande.commentaire}`,
  });

  deps.notifications.notifier({
    idNotification: deps.identifiants.nouveau("notif"),
    idUtilisateur: dossier.idAuteur,
    idSignalement,
    titre: "Signalement résolu",
    message:
      "Votre signalement a été traité et une preuve photo a été enregistrée. Vous pouvez contester cette résolution pendant 7 jours.",
    type: "SUCCESS",
    dateCreation: maintenant,
  });

  journaliser(deps, acteur, "intervention.cloture", idSignalement, "EN_COURS", "RESOLU");
  return maj;
}