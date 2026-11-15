import { ErreurMetier } from "@domaine/erreurs.ts";
import { aLeDroit } from "@domaine/compte/droits.regle.ts";
import { verifierConfirmable } from "@domaine/signalement/confirmation.regle.ts";
import type { Acteur, Dependances } from "../dependances.type.ts";
import { journaliser } from "../compte/inscrire.cas.ts";
import { chargerDossier } from "./commun.ts";

export interface ResultatConfirmation {
  readonly confirme: boolean;
  readonly nb_confirmations: number;
}

/**
 * Confirmation « Moi aussi » (RG05).
 *
 * L'unicité par utilisateur est tenue par le schéma : le dépôt renvoie false quand la ligne existe
 * déjà, et ce refus devient `DOUBLON_CONFIRMATION` plutôt qu'un second incrément silencieux.
 * La priorité du dossier n'est pas recalculée ici : une confirmation la renforce lors du prochain
 * calcul, elle ne réécrit pas un score déjà décidé.
 */
export function confirmer(idSignalement: string, acteur: Acteur, deps: Dependances): ResultatConfirmation {
  if (!aLeDroit(acteur.role, "confirmerSignalement")) {
    throw new ErreurMetier("DROIT_REFUSE", { action: "confirmerSignalement" });
  }

  const dossier = chargerDossier(idSignalement, deps);
  verifierConfirmable(dossier, acteur.idUtilisateur);

  const enregistree = deps.signalements.ajouterConfirmation(
    idSignalement,
    acteur.idUtilisateur,
    deps.horloge.maintenant(),
  );
  if (!enregistree) {
    throw new ErreurMetier("DOUBLON_CONFIRMATION");
  }

  journaliser(deps, acteur, "signalement.confirmation", idSignalement, dossier.statut, dossier.statut);

  return { confirme: true, nb_confirmations: deps.signalements.nombreConfirmations(idSignalement) };
}
