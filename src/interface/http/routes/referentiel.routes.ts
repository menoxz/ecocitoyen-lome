import { Router } from "express";
import type { Dependances } from "@application/dependances.type.ts";
import { MOTIFS_REJET, PRIORITES } from "@domaine/signalement/signalement.type.ts";

/** Référentiels lisibles par tous : ils alimentent les listes du formulaire de signalement. */
export function routesReferentiel(deps: Dependances): Router {
  const routeur = Router();

  routeur.get("/categories", (_req, res) => {
    res.json(
      deps.referentiel.categories().map((categorie) => ({
        id_categorie: categorie.idCategorie,
        nom: categorie.nom,
        priorite_base: categorie.prioriteBase,
        actif: categorie.actif,
      })),
    );
  });

  routeur.get("/quartiers", (_req, res) => {
    res.json(
      deps.referentiel.quartiers().map((quartier) => ({
        id_quartier: quartier.idQuartier,
        nom: quartier.nom,
        centre_lat: quartier.centreLat,
        centre_lon: quartier.centreLon,
      })),
    );
  });

  routeur.get("/equipes", (_req, res) => {
    res.json(
      deps.referentiel.equipes().map((equipe) => ({
        id_equipe: equipe.idEquipe,
        nom: equipe.nom,
        zone: equipe.zone,
      })),
    );
  });

  /**
   * Valeurs de décision du superviseur. Elles viennent du domaine : une liste recopiée dans
   * l'interface finirait par proposer une priorité ou un motif que le serveur refuse.
   */
  routeur.get("/priorites", (_req, res) => {
    res.json(PRIORITES);
  });

  routeur.get("/motifs-rejet", (_req, res) => {
    res.json(MOTIFS_REJET);
  });

  return routeur;
}