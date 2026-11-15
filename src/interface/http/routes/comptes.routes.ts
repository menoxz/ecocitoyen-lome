import { Router } from "express";
import { rbac } from "../middlewares/rbac.ts";
import { attraper } from "../middlewares/erreurs.ts";
import { exigerSession } from "../middlewares/session.ts";
import { projeterCompte } from "../presentation/vers-compte.ts";
import { listerComptes } from "@application/compte/lister-comptes.cas.ts";
import { modifierCompte } from "@application/compte/modifier-compte.cas.ts";
import type { Dependances } from "@application/dependances.type.ts";
import { ROLES, type Role } from "@domaine/compte/role.type.ts";

/** Lit un rôle transmis ; une valeur hors vocabulaire est ignorée plutôt que propagée en base. */
function roleTransmis(valeur: unknown): Role | undefined {
  return typeof valeur === "string" && (ROLES as readonly string[]).includes(valeur) ? (valeur as Role) : undefined;
}

/**
 * Administration des comptes (matrice §3.3 : `modifierCompte`, réservé à l'administrateur).
 *
 * La route ne décide de rien : elle transmet, et laisse le cas d'usage constater le droit puis la
 * règle vérifier qu'on ne retire pas le dernier administrateur actif.
 */
export function routesComptes(deps: Dependances): Router {
  const routeur = Router();

  routeur.get(
    "/",
    rbac("modifierCompte"),
    attraper(async (req, res) => {
      res.json(listerComptes(exigerSession(req), deps).map(projeterCompte));
    }),
  );

  routeur.patch(
    "/:id",
    rbac("modifierCompte"),
    attraper(async (req, res) => {
      const corps = req.body as Record<string, unknown>;
      const actif = typeof corps.actif === "boolean" ? corps.actif : undefined;
      const dossier = modifierCompte(
        req.params.id,
        { role: roleTransmis(corps.role), actif },
        exigerSession(req),
        deps,
      );
      res.json(projeterCompte(dossier));
    }),
  );

  return routeur;
}
