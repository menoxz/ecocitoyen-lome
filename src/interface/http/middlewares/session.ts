import type { NextFunction, Request, Response } from "express";
import { ErreurMetier } from "@domaine/erreurs.ts";
import type { Acteur, Dependances } from "@application/dependances.type.ts";

export const NOM_COOKIE = "eco_session";
const DUREE_SESSION_MINUTES = 30;

export interface RequeteActeur extends Request {
  acteur?: Acteur;
}

/** Lecture minimale d''un en-tête Cookie : une seule dépendance évitée pour dix lignes. */
export function lireCookie(entete: string | undefined, nom: string): string | null {
  if (!entete) return null;
  for (const morceau of entete.split(";")) {
    const [cle, ...reste] = morceau.trim().split("=");
    if (cle === nom) {
      return decodeURIComponent(reste.join("="));
    }
  }
  return null;
}

/**
 * Résout l''acteur à chaque requête.
 *
 * Aucun état d''utilisateur global : c''est la correction directe du défaut du prototype, où deux
 * navigateurs partageaient la même identité. La session est prolongée à chaque usage (30 min
 * glissantes, ENF06) et une session expirée est supprimée au passage.
 */
export function session(deps: Dependances) {
  return (req: Request, _res: Response, suivant: NextFunction): void => {
    const jeton = lireCookie(req.headers.cookie, NOM_COOKIE);
    if (!jeton) {
      suivant();
      return;
    }

    const jetonHache = deps.jetons.calculer(jeton);
    const trouvee = deps.sessions.parJetonHache(jetonHache);
    const maintenant = deps.horloge.maintenant();

    if (!trouvee) {
      suivant();
      return;
    }
    if (Date.parse(trouvee.expireLe) <= Date.parse(maintenant)) {
      deps.sessions.supprimer(jetonHache);
      suivant();
      return;
    }

    const compte = deps.comptes.parId(trouvee.idUtilisateur);
    if (!compte || !compte.actif) {
      deps.sessions.supprimer(jetonHache);
      suivant();
      return;
    }

    deps.sessions.prolonger(
      jetonHache,
      new Date(Date.parse(maintenant) + DUREE_SESSION_MINUTES * 60_000).toISOString(),
    );

    (req as RequeteActeur).acteur = {
      idUtilisateur: compte.idUtilisateur,
      role: compte.role,
      idEquipe: compte.idEquipe,
      adresseIp: req.ip ?? null,
    };
    suivant();
  };
}

/** Exige un acteur authentifié : 401 explicite, jamais une redirection silencieuse. */
export function exigerSession(req: Request): Acteur {
  const acteur = (req as RequeteActeur).acteur;
  if (!acteur) {
    throw new ErreurMetier("NON_AUTHENTIFIE");
  }
  return acteur;
}