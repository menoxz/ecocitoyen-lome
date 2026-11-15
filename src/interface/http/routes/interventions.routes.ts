import { Router } from "express";
import { rbac } from "../middlewares/rbac.ts";
import { attraper } from "../middlewares/erreurs.ts";
import { exigerSession } from "../middlewares/session.ts";
import { projeter } from "../presentation/vers-signalement.ts";
import { affecter } from "@application/intervention/affecter.cas.ts";
import { demarrer } from "@application/intervention/demarrer.cas.ts";
import { cloturer } from "@application/intervention/cloturer.cas.ts";
import { annuler } from "@application/intervention/annuler.cas.ts";
import type { Dependances } from "@application/dependances.type.ts";

const texte = (valeur: unknown): string | undefined => (typeof valeur === "string" && valeur.length > 0 ? valeur : undefined);

/**
 * Transitions touchant l'intervention. Montées sous `/signalements` : le dossier est la ressource
 * et l'intervention un de ses états, donc `/signalements/:id/affecter` et pas `/interventions`.
 */
export function routesInterventions(deps: Dependances): Router {
  const routeur = Router();

  const projeterDossier = (dossier: Parameters<typeof projeter>[0], role: Parameters<typeof projeter>[1]) =>
    projeter(dossier, role, {
      categorie: deps.referentiel.categories().find((c) => c.idCategorie === dossier.idCategorie)?.nom,
      quartier: deps.referentiel.quartiers().find((q) => q.idQuartier === dossier.idQuartier)?.nom,
    });

  routeur.post(
    "/:id/affecter",
    rbac("affecterEquipe"),
    attraper(async (req, res) => {
      const acteur = exigerSession(req);
      const corps = req.body as Record<string, unknown>;
      const dossier = affecter(
        req.params.id,
        { idEquipe: String(corps.id_equipe ?? ""), commentaire: texte(corps.commentaire) ?? null },
        acteur,
        deps,
      );
      res.json(projeterDossier(dossier, acteur.role));
    }),
  );

  routeur.post(
    "/:id/demarrer",
    rbac("demarrerIntervention"),
    attraper(async (req, res) => {
      const acteur = exigerSession(req);
      demarrer(req.params.id, acteur, deps);
      const dossier = deps.signalements.parId(req.params.id);
      res.json({ demarre: true, statut: dossier?.statut ?? "EN_COURS" });
    }),
  );

  routeur.post(
    "/:id/resoudre",
    rbac("cloturerIntervention"),
    attraper(async (req, res) => {
      const acteur = exigerSession(req);
      const corps = req.body as Record<string, unknown>;
      const photo = corps.photo as { chemin?: string; mime?: string; taille_octets?: number } | undefined;
      const dossier = cloturer(
        req.params.id,
        {
          photo: photo && photo.chemin
            ? { chemin: String(photo.chemin), mime: String(photo.mime ?? "image/webp"), tailleOctets: Number(photo.taille_octets ?? 1) }
            : null,
          commentaire: String(corps.commentaire ?? ""),
        },
        acteur,
        deps,
      );
      res.json(projeterDossier(dossier, acteur.role));
    }),
  );

  routeur.post(
    "/:id/annuler-intervention",
    rbac("annulerIntervention"),
    attraper(async (req, res) => {
      const acteur = exigerSession(req);
      const corps = req.body as Record<string, unknown>;
      const dossier = annuler(req.params.id, String(corps.motif ?? ""), acteur, deps);
      res.json(projeterDossier(dossier, acteur.role));
    }),
  );

  return routeur;
}