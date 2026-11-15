import type { NotificationItem } from "@ports/notificateur.port.ts";
import type { Acteur, Dependances } from "../dependances.type.ts";

/** Les notifications d'un utilisateur, et seulement les siennes : le filtre vient du compte. */
export function listerNotifications(acteur: Acteur, deps: Dependances, limite?: number): readonly NotificationItem[] {
  return deps.notifications.listerPour(acteur.idUtilisateur, limite);
}