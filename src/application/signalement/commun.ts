import { ErreurMetier } from "@domaine/erreurs.ts";
import type { Signalement } from "@domaine/signalement/signalement.type.ts";
import type { Dependances } from "../dependances.type.ts";

/** Charge un dossier ou échoue avec un code stable, jamais avec un message libre. */
export function chargerDossier(idSignalement: string, deps: Dependances): Signalement {
  const dossier = deps.signalements.parId(idSignalement);
  if (!dossier) {
    throw new ErreurMetier("RESSOURCE_INTROUVABLE", { ressource: "signalement" });
  }
  return dossier;
}