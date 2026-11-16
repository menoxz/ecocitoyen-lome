import { Router } from "express";
import { rbac } from "../middlewares/rbac.ts";
import { attraper } from "../middlewares/erreurs.ts";
import { exigerSession } from "../middlewares/session.ts";
import { projeterCompte } from "../presentation/vers-compte.ts";
import { listerComptes } from "@application/compte/lister-comptes.cas.ts";
import { modifierCompte } from "@application/compte/modifier-compte.cas.ts";
import { creerCompteInterne } from "@application/compte/creer-compte-interne.cas.ts";
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

  /**
   * Création d'un compte interne (`creerCompteInterne`, réservé à l'administrateur).
   *
   * Le mot de passe temporaire est renvoyé en clair dans cette réponse et dans aucune autre : il
   * n'est ni stocké en clair ni relisible ensuite. C'est à l'administrateur de le remettre.
   */
  routeur.post(
    "/",
    rbac("creerCompteInterne"),
    attraper(async (req, res) => {
      const corps = req.body as Record<string, unknown>;
      const role = roleTransmis(corps.role);
      if (role === undefined) {
        res.status(400).json({ code: "CONTRAT_INVALIDE", message: "Rôle inconnu.", details: { champ: "role" } });
        return;
      }
      const resultat = await creerCompteInterne(
        {
          nom: String(corps.nom ?? ""),
          prenom: String(corps.prenom ?? ""),
          email: String(corps.email ?? ""),
          role,
          idEquipe: typeof corps.id_equipe === "string" && corps.id_equipe !== "" ? corps.id_equipe : null,
        },
        exigerSession(req),
        deps,
      );
      res.status(201).json({
        compte: projeterCompte(resultat.compte),
        mot_de_passe_temporaire: resultat.motDePasseTemporaire,
      });
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
