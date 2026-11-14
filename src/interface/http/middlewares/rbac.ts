import type { NextFunction, Request, Response } from "express";
import { aLeDroit, type Action } from "@domaine/compte/droits.regle.ts";
import { ErreurMetier } from "@domaine/erreurs.ts";
import { exigerSession } from "./session.ts";

/**
 * Contrôle d''accès déclaratif (RB06).
 *
 * La route dit l''action, la matrice du domaine dit qui y a droit : une seule source, vérifiée
 * côté serveur. Masquer un bouton dans l''interface n''est jamais un contrôle.
 */
export function rbac(action: Action) {
  return (req: Request, _res: Response, suivant: NextFunction): void => {
    try {
      const acteur = exigerSession(req);
      if (!aLeDroit(acteur.role, action)) {
        suivant(new ErreurMetier("DROIT_REFUSE", { action, role: acteur.role }));
        return;
      }
      suivant();
    } catch (erreur) {
      suivant(erreur);
    }
  };
}

/** Refuse un visiteur : lecture publique uniquement, aucune écriture anonyme. */
export function exigerConnecte() {
  return (req: Request, _res: Response, suivant: NextFunction): void => {
    try {
      exigerSession(req);
      suivant();
    } catch (erreur) {
      suivant(erreur);
    }
  };
}