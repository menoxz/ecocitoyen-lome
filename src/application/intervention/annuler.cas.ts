import { aLeDroit } from "@domaine/compte/droits.regle.ts";
import { ErreurMetier } from "@domaine/erreurs.ts";
import { verifierTransition } from "@domaine/signalement/transitions.regle.ts";
import { interventionActive } from "@domaine/intervention/unicite-active.regle.ts";
import type { Signalement } from "@domaine/signalement/signalement.type.ts";
import type { Acteur, Dependances } from "../dependances.type.ts";
import { journaliser } from "../compte/inscrire.cas.ts";
import { chargerDossier } from "../signalement/commun.ts";
import { contexteDe } from "../signalement/contexte.ts";
import { ligneDe, versIntervention } from "./adaptation.ts";

/**
 * Annulation d'une intervention (T6) : le dossier revient à Validé pour être réaffecté.
 * Le motif est obligatoire, sinon l'annulation devient un trou dans l'historique.
 */
export function annuler(idSignalement: string, motif: string, acteur: Acteur, deps: Dependances): Signalement {
  if (!aLeDroit(acteur.role, "annulerIntervention")) {
    throw new ErreurMetier("DROIT_REFUSE", { action: "annulerIntervention" });
  }

  const dossier = chargerDossier(idSignalement, deps);
  verifierTransition(dossier.statut, "VALIDE", contexteDe(acteur, dossier), { commentaire: motif });

  const lignes = deps.signalements.interventionsDe(idSignalement);
  const active = interventionActive(lignes.map(versIntervention));
  const ligne = ligneDe(lignes, active);
  const maintenant = deps.horloge.maintenant();

  if (ligne) {
    deps.signalements.majIntervention({
      ...ligne,
      statutIntervention: "ANNULEE",
      dateFin: maintenant,
      commentaire: motif,
    });
  }

  const maj: Signalement = { ...dossier, statut: "VALIDE", dateMiseAJour: maintenant };
  deps.signalements.enregistrer(maj);
  deps.signalements.ajouterHistorique({
    idHistorique: deps.identifiants.nouveau("hist"),
    idSignalement,
    ancienStatut: "EN_COURS",
    nouveauStatut: "VALIDE",
    idAuteur: acteur.idUtilisateur,
    dateChangement: maintenant,
    commentaire: `Intervention annulée : ${motif}`,
  });

  journaliser(deps, acteur, "intervention.annulation", idSignalement, "EN_COURS", "VALIDE");
  return maj;
}