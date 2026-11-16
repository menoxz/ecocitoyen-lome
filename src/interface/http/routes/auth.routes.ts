import { Router, type Response } from "express";
import { lireCookie, NOM_COOKIE, exigerSession } from "../middlewares/session.ts";
import { projeterCompte } from "../presentation/vers-compte.ts";
import { attraper } from "../middlewares/erreurs.ts";
import { rbac } from "../middlewares/rbac.ts";
import { connecter } from "@application/compte/connecter.cas.ts";
import { deconnecter } from "@application/compte/deconnecter.cas.ts";
import { inscrire } from "@application/compte/inscrire.cas.ts";
import { changerMotDePasse } from "@application/compte/changer-mot-de-passe.cas.ts";
import type { Dependances } from "@application/dependances.type.ts";
import type { Role } from "@domaine/compte/role.type.ts";

const DUREE_COOKIE_MS = 30 * 60 * 1000;

export function routesAuth(deps: Dependances, production: boolean): Router {
  const routeur = Router();

  const poserCookie = (reponse: Response, jeton: string): void => {
    reponse.cookie(NOM_COOKIE, jeton, {
      httpOnly: true,
      sameSite: "lax",
      secure: production,
      maxAge: DUREE_COOKIE_MS,
      path: "/",
    });
  };

  routeur.post(
    "/inscription",
    attraper(async (req, res) => {
      const corps = req.body as Record<string, unknown>;
      const compte = await inscrire(
        {
          nom: String(corps.nom ?? ""),
          prenom: String(corps.prenom ?? ""),
          email: String(corps.email ?? ""),
          telephone: corps.telephone ? String(corps.telephone) : null,
          motDePasse: String(corps.mot_de_passe ?? ""),
          consentement: corps.consentement === true,
        },
        deps,
      );

      const connexion = await connecter(
        { identifiant: compte.email || (compte.telephone ?? ""), motDePasse: String(corps.mot_de_passe ?? ""), adresseIp: req.ip ?? null },
        deps,
      );
      poserCookie(res, connexion.jeton);
      res.status(201).json({ compte: projeterCompte(connexion.compte), expire_le: connexion.expireLe });
    }),
  );

  routeur.post(
    "/connexion",
    attraper(async (req, res) => {
      const corps = req.body as Record<string, unknown>;
      const resultat = await connecter(
        {
          identifiant: String(corps.identifiant ?? ""),
          motDePasse: String(corps.mot_de_passe ?? ""),
          adresseIp: req.ip ?? null,
        },
        deps,
      );
      poserCookie(res, resultat.jeton);
      res.json({ compte: projeterCompte(resultat.compte), expire_le: resultat.expireLe });
    }),
  );

  routeur.post(
    "/deconnexion",
    attraper(async (req, res) => {
      const acteur = exigerSession(req);
      const supprimees = deconnecter(acteur.idUtilisateur, deps);
      res.clearCookie(NOM_COOKIE, { path: "/" });
      res.json({ supprimees });
    }),
  );

  routeur.get(
    "/moi",
    attraper(async (req, res) => {
      const acteur = exigerSession(req);
      const compte = deps.comptes.parId(acteur.idUtilisateur);
      const role: Role = acteur.role;
      res.json({ compte: compte ? projeterCompte(compte) : null, role, jeton: lireCookie(req.headers.cookie, NOM_COOKIE) ? "present" : "absent" });
    }),
  );

  /**
   * Changement de son propre mot de passe. L'ancien est exigé : un cookie volé ne suffit donc pas
   * à verrouiller le compte de son propriétaire.
   */
  routeur.post(
    "/mot-de-passe",
    rbac("modifierProfil"),
    attraper(async (req, res) => {
      const corps = req.body as Record<string, unknown>;
      const compte = await changerMotDePasse(
        { ancien: String(corps.ancien ?? ""), nouveau: String(corps.nouveau ?? "") },
        exigerSession(req),
        deps,
      );
      res.json(projeterCompte(compte));
    }),
  );

  return routeur;
}