import { Router } from "express";
import { attraper } from "../middlewares/erreurs.ts";
import { exigerSession } from "../middlewares/session.ts";
import { listerNotifications } from "@application/notification/lister.cas.ts";
import { marquerNotificationLue, marquerToutesLues } from "@application/notification/marquer-lu.cas.ts";
import type { Dependances } from "@application/dependances.type.ts";

/** Notifications in-app : strictement celles du compte connecté, jamais d'identifiant en paramètre. */
export function routesNotifications(deps: Dependances): Router {
  const routeur = Router();

  routeur.get(
    "/",
    attraper(async (req, res) => {
      const acteur = exigerSession(req);
      const limite = Number(req.query.limite) > 0 ? Number(req.query.limite) : undefined;
      res.json(
        listerNotifications(acteur, deps, limite).map((notification) => ({
          id_notification: notification.idNotification,
          id_signalement: notification.idSignalement,
          titre: notification.titre,
          message: notification.message,
          type: notification.type,
          canal: notification.canal,
          lu: notification.lu,
          date_creation: notification.dateCreation,
        })),
      );
    }),
  );

  routeur.patch(
    "/:id",
    attraper(async (req, res) => {
      const acteur = exigerSession(req);
      marquerNotificationLue(req.params.id, acteur, deps);
      res.json({ lu: true });
    }),
  );

  routeur.patch(
    "/",
    attraper(async (req, res) => {
      const acteur = exigerSession(req);
      res.json({ marquees: marquerToutesLues(acteur, deps) });
    }),
  );

  return routeur;
}