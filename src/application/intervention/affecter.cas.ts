import { ErreurMetier } from "@domaine/erreurs.ts";
import { aLeDroit } from "@domaine/compte/droits.regle.ts";
import { verifierTransition } from "@domaine/signalement/transitions.regle.ts";
import { verifierAffectationPossible } from "@domaine/intervention/unicite-active.regle.ts";
import type { Signalement } from "@domaine/signalement/signalement.type.ts";
import type { Acteur, Dependances } from "../dependances.type.ts";
import { journaliser } from "../compte/inscrire.cas.ts";
import { chargerDossier } from "../signalement/commun.ts";
import { contexteDe } from "../signalement/contexte.ts";
import { versIntervention } from "./adaptation.ts";

export interface CommandeAffectation {
  readonly idEquipe: string;
  readonly commentaire: string | null;
}

/**
 * Affectation d'une équipe (T3 depuis Validé, T8 depuis Rouvert).
 *
 * Deux gardes indépendantes : la transition est autorisée par le domaine, et aucune intervention
 * ne doit déjà être active. La seconde est aussi portée par un index unique en base : le code
 * protège, la base garantit.
 */
export function affecter(
  idSignalement: string,
  commande: CommandeAffectation,
  acteur: Acteur,
  deps: Dependances,
): Signalement {
  if (!aLeDroit(acteur.role, "affecterEquipe")) {
    throw new ErreurMetier("DROIT_REFUSE", { action: "affecterEquipe" });
  }

  const dossier = chargerDossier(idSignalement, deps);
  verifierAffectationPossible(deps.signalements.interventionsDe(idSignalement).map(versIntervention));

  const equipe = deps.referentiel.equipes().find((e) => e.idEquipe === commande.idEquipe);
  if (!equipe) {
    throw new ErreurMetier("CONTRAT_INVALIDE", { champ: "id_equipe" });
  }

  verifierTransition(dossier.statut, "EN_COURS", contexteDe(acteur, dossier), { idEquipe: commande.idEquipe });

  const maintenant = deps.horloge.maintenant();

  deps.signalements.creerIntervention({
    idIntervention: deps.identifiants.nouveau("int"),
    idSignalement,
    idEquipe: commande.idEquipe,
    idAgent: null,
    idAffectePar: acteur.idUtilisateur,
    statutIntervention: "PLANIFIEE",
    dateAffectation: maintenant,
    dateDebut: null,
    dateFin: null,
    commentaire: commande.commentaire,
  });

  const maj: Signalement = { ...dossier, statut: "EN_COURS", dateAffectation: maintenant, dateMiseAJour: maintenant };
  deps.signalements.enregistrer(maj);
  deps.signalements.ajouterHistorique({
    idHistorique: deps.identifiants.nouveau("hist"),
    idSignalement,
    ancienStatut: dossier.statut,
    nouveauStatut: "EN_COURS",
    idAuteur: acteur.idUtilisateur,
    dateChangement: maintenant,
    commentaire: `Affecté à ${equipe.nom}`,
  });

  const agents = deps.comptes
    .lister()
    .filter((compte) => compte.role === "AGENT" && compte.idEquipe === commande.idEquipe && compte.actif)
    .map((compte) => compte.idUtilisateur);

  if (agents.length > 0) {
    deps.notifications.notifierPlusieurs(
      agents,
      {
        idSignalement,
        titre: "Nouvelle intervention affectée",
        message: `Un dossier du quartier est affecté à votre équipe (${equipe.nom}).`,
        type: "ALERT",
        dateCreation: maintenant,
      },
      () => deps.identifiants.nouveau("notif"),
    );
  }

  deps.notifications.notifier({
    idNotification: deps.identifiants.nouveau("notif"),
    idUtilisateur: dossier.idAuteur,
    idSignalement,
    titre: "Intervention programmée",
    message: `Une équipe a été mobilisée pour votre signalement (${equipe.nom}).`,
    type: "INFO",
    dateCreation: maintenant,
  });

  journaliser(deps, acteur, "intervention.affectation", idSignalement, dossier.statut, "EN_COURS");
  return maj;
}