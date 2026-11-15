import { ErreurMetier } from "@domaine/erreurs.ts";
import { aLeDroit } from "@domaine/compte/droits.regle.ts";
import { interventionActive, verifierAppartenanceEquipe } from "@domaine/intervention/unicite-active.regle.ts";
import type { Acteur, Dependances } from "../dependances.type.ts";
import { journaliser } from "../compte/inscrire.cas.ts";
import { chargerDossier } from "../signalement/commun.ts";
import { ligneDe, versIntervention } from "./adaptation.ts";

/** Démarrage d'une intervention planifiée : l'agent atteste qu'il est sur place. */
export function demarrer(idSignalement: string, acteur: Acteur, deps: Dependances): void {
  if (!aLeDroit(acteur.role, "demarrerIntervention")) {
    throw new ErreurMetier("DROIT_REFUSE", { action: "demarrerIntervention" });
  }

  const dossier = chargerDossier(idSignalement, deps);
  if (dossier.statut !== "EN_COURS") {
    throw new ErreurMetier("STATUT_INCOMPATIBLE", { statut: dossier.statut });
  }

  const lignes = deps.signalements.interventionsDe(idSignalement);
  const active = interventionActive(lignes.map(versIntervention));
  if (!active) {
    throw new ErreurMetier("INTERVENTION_AUCUNE");
  }
  if (acteur.role === "AGENT") {
    verifierAppartenanceEquipe(active, acteur.idEquipe);
  }
  if (active.statut === "EN_COURS") {
    throw new ErreurMetier("STATUT_INCOMPATIBLE", { statutIntervention: active.statut });
  }

  const ligne = ligneDe(lignes, active);
  if (!ligne) {
    throw new ErreurMetier("INTERVENTION_AUCUNE");
  }

  const maintenant = deps.horloge.maintenant();
  deps.signalements.majIntervention({
    ...ligne,
    statutIntervention: "EN_COURS",
    idAgent: acteur.idUtilisateur,
    dateDebut: maintenant,
  });
  deps.signalements.enregistrer({ ...dossier, dateMiseAJour: maintenant });
  journaliser(deps, acteur, "intervention.demarrage", idSignalement, "PLANIFIEE", "EN_COURS");
}