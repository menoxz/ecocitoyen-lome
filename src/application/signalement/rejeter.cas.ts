import { ErreurMetier } from "@domaine/erreurs.ts";
import { aLeDroit } from "@domaine/compte/droits.regle.ts";
import type { MotifRejet, Signalement } from "@domaine/signalement/signalement.type.ts";
import { verifierTransition } from "@domaine/signalement/transitions.regle.ts";
import type { Acteur, Dependances } from "../dependances.type.ts";
import { journaliser } from "../compte/inscrire.cas.ts";
import { contexteDe } from "./contexte.ts";
import { chargerDossier } from "./commun.ts";

export interface CommandeRejet {
  readonly motifRejet: MotifRejet;
  readonly commentaire?: string;
}

/** Rejet d'un signalement (T2 depuis Nouveau, T4 depuis Validé). Le motif est une donnée obligatoire. */
export function rejeter(
  idSignalement: string,
  commande: CommandeRejet,
  acteur: Acteur,
  deps: Dependances,
): Signalement {
  if (!aLeDroit(acteur.role, "rejeterSignalement")) {
    throw new ErreurMetier("DROIT_REFUSE", { action: "rejeterSignalement" });
  }

  const dossier = chargerDossier(idSignalement, deps);
  const contexte = contexteDe(acteur, dossier);

  verifierTransition(dossier.statut, "REJETE", contexte, {
    motifRejet: commande.motifRejet,
    commentaire: commande.commentaire,
  });

  const maintenant = deps.horloge.maintenant();
  const maj: Signalement = {
    ...dossier,
    statut: "REJETE",
    motifRejet: commande.motifRejet,
    dateMiseAJour: maintenant,
  };

  deps.signalements.enregistrer(maj);
  deps.signalements.ajouterHistorique({
    idHistorique: deps.identifiants.nouveau("hist"),
    idSignalement,
    ancienStatut: dossier.statut,
    nouveauStatut: "REJETE",
    idAuteur: acteur.idUtilisateur,
    dateChangement: maintenant,
    commentaire: `Rejet : ${commande.motifRejet}. ${commande.commentaire ?? ""}`.trim(),
  });
  journaliser(deps, acteur, "signalement.rejet", idSignalement, dossier.statut, "REJETE");

  return maj;
}