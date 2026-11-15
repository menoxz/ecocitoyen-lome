import { Router } from "express";
import { rbac } from "../middlewares/rbac.ts";
import { attraper } from "../middlewares/erreurs.ts";
import { exigerSession } from "../middlewares/session.ts";
import { synthese } from "@application/indicateur/synthese.cas.ts";
import type { Dependances } from "@application/dependances.type.ts";

/**
 * Indicateurs de pilotage.
 *
 * Réservé à la supervision (matrice §3.3) : un citoyen voit la carte, pas les délais internes.
 * Les valeurs `null` signifient « non mesurable » et sont accompagnées de leur motif.
 */
export function routesIndicateurs(deps: Dependances): Router {
  const routeur = Router();

  routeur.get(
    "/synthese",
    rbac("voirIndicateurs"),
    attraper(async (req, res) => {
      const acteur = exigerSession(req);
      res.json(synthese(acteur, deps));
    }),
  );

  return routeur;
}