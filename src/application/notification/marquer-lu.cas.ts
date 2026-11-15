import { ErreurMetier } from "@domaine/erreurs.ts";
import type { Acteur, Dependances } from "../dependances.type.ts";

/** Marque une notification comme lue ; refus si elle appartient à quelqu'un d'autre. */
export function marquerNotificationLue(idNotification: string, acteur: Acteur, deps: Dependances): void {
  const modifiee = deps.notifications.marquerLu(idNotification, acteur.idUtilisateur);
  if (!modifiee) {
    throw new ErreurMetier("RESSOURCE_INTROUVABLE", { ressource: "notification" });
  }
}

export function marquerToutesLues(acteur: Acteur, deps: Dependances): number {
  return deps.notifications.marquerToutLu(acteur.idUtilisateur);
}