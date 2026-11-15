import express, { type Express } from "express";
import { session } from "./middlewares/session.ts";
import { traiterErreurs } from "./middlewares/erreurs.ts";
import { routesAuth } from "./routes/auth.routes.ts";
import { routesReferentiel } from "./routes/referentiel.routes.ts";
import { routesSignalements } from "./routes/signalements.routes.ts";
import { routesInterventions } from "./routes/interventions.routes.ts";
import { routesNotifications } from "./routes/notifications.routes.ts";
import { routesIa } from "./routes/ia.routes.ts";
import { routesIndicateurs } from "./routes/indicateurs.routes.ts";
import { routesComptes } from "./routes/comptes.routes.ts";
import type { Dependances } from "@application/dependances.type.ts";

/**
 * Assemblage de l'interface HTTP, sans aucune règle et sans connaître l'infrastructure.
 *
 * Cette fonction est ce que les tests attaquent : mêmes middlewares, mêmes routes, même table
 * de statuts que la production. Un test qui passerait ici passerait en production.
 */
export function creerApp(
  deps: Dependances,
  options: { readonly production?: boolean; readonly dossierStatique?: string } = {},
): Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", true);
  app.use(express.json({ limit: "1mb" }));

  app.use((_req, res, suivant) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    res.setHeader("X-Frame-Options", "DENY");
    suivant();
  });

  app.use(session(deps));

  app.get("/api/v1/sante", (_req, res) => {
    res.json({ statut: "ok", version: "1" });
  });

  app.use("/api/v1/auth", routesAuth(deps, options.production === true));
  app.use("/api/v1/referentiels", routesReferentiel(deps));
  app.use("/api/v1/signalements", routesSignalements(deps));
  app.use("/api/v1/signalements", routesInterventions(deps));
  app.use("/api/v1/notifications", routesNotifications(deps));
  app.use("/api/v1/ia", routesIa(deps));
  app.use("/api/v1/indicateurs", routesIndicateurs(deps));
  app.use("/api/v1/comptes", routesComptes(deps));

  /**
   * Interface servie depuis le même port que l'API, seulement si un dossier de build est fourni.
   *
   * Optionnel à dessein : les tests d'API créent l'application sans dossier statique, donc leur
   * comportement ne change pas. Le repli renvoie `signaler.html` et non `index.html` : le legacy
   * n'est pas servi par ce serveur, la bascule finale (P8) supprimera l'ancienne page.
   */
  if (options.dossierStatique) {
    const dossier = options.dossierStatique;
    app.use(express.static(dossier, { index: false }));
    app.get(/^(?!\/api\/).*/, (_req, res, suivant) => {
      res.sendFile("index.html", { root: dossier }, (erreur) => {
        if (erreur) {
          suivant();
        }
      });
    });
  }

  app.use((_req, res) => {
    res.status(404).json({ code: "RESSOURCE_INTROUVABLE", message: "Route inconnue." });
  });

  app.use(traiterErreurs);
  return app;
}