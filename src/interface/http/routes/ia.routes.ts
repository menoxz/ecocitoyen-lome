import { Router } from "express";
import { rbac } from "../middlewares/rbac.ts";
import { attraper } from "../middlewares/erreurs.ts";
import { traiterClassifications } from "@application/signalement/classer.cas.ts";
import type { Dependances } from "@application/dependances.type.ts";

/**
 * Déclenchement du traitement des classifications en attente.
 *
 * Réservé à l'administrateur : c'est une opération d'exploitation, pas une action métier.
 * Le planificateur l'appellera en phase P7 ; en attendant, elle rend le comportement asynchrone
 * observable et testable sans minuteur.
 */
export function routesIa(deps: Dependances): Router {
  const routeur = Router();

  routeur.post(
    "/tick",
    rbac("modifierParametres"),
    attraper(async (_req, res) => {
      const bilan = await traiterClassifications(deps, 10);
      res.json({ traitees: bilan.traitees, echouees: bilan.echouees, ignorees: bilan.ignorees });
    }),
  );

  return routeur;
}