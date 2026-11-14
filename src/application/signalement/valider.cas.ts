import { ErreurMetier } from "@domaine/erreurs.ts";
import { aLeDroit } from "@domaine/compte/droits.regle.ts";
import type { Priorite, Signalement } from "@domaine/signalement/signalement.type.ts";
import { verifierTransition } from "@domaine/signalement/transitions.regle.ts";
import type { Acteur, Dependances } from "../dependances.type.ts";
import { journaliser } from "../compte/inscrire.cas.ts";
import { contexteDe } from "./contexte.ts";
import { chargerDossier } from "./commun.ts";

export interface CommandeValidation {
  readonly idCategorie?: string;
  readonly niveauPriorite?: Priorite;
  readonly commentaire?: string;
}

/**
 * Validation d'un signalement (T1).
 *
 * La transition est jugée par le domaine ; ce cas d'usage ne fait que constater le droit,
 * appliquer la décision, écrire l'historique et journaliser. La notification citoyenne
 * arrive en phase P4 avec le module notification.
 */
export function valider(
  idSignalement: string,
  commande: CommandeValidation,
  acteur: Acteur,
  deps: Dependances,
): Signalement {
  if (!aLeDroit(acteur.role, "validerSignalement")) {
    throw new ErreurMetier("DROIT_REFUSE", { action: "validerSignalement" });
  }

  const dossier = chargerDossier(idSignalement, deps);
  const contexte = contexteDe(acteur, dossier);
  const idCategorie = commande.idCategorie ?? dossier.idCategorie;
  const niveauPriorite = commande.niveauPriorite ?? dossier.niveauPriorite;

  verifierTransition(dossier.statut, "VALIDE", contexte, { idCategorie, niveauPriorite });

  const maintenant = deps.horloge.maintenant();
  const maj: Signalement = {
    ...dossier,
    statut: "VALIDE",
    idCategorie,
    niveauPriorite,
    dateValidation: maintenant,
    dateMiseAJour: maintenant,
  };

  deps.signalements.enregistrer(maj);
  deps.signalements.ajouterHistorique({
    idHistorique: deps.identifiants.nouveau("hist"),
    idSignalement,
    ancienStatut: dossier.statut,
    nouveauStatut: "VALIDE",
    idAuteur: acteur.idUtilisateur,
    dateChangement: maintenant,
    commentaire: commande.commentaire ?? "Signalement validé",
  });
  journaliser(deps, acteur, "signalement.validation", idSignalement, dossier.statut, "VALIDE");

  return maj;
}