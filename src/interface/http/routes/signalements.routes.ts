import { Router, type Request } from "express";
import { rbac } from "../middlewares/rbac.ts";
import { attraper } from "../middlewares/erreurs.ts";
import { exigerSession, type RequeteActeur } from "../middlewares/session.ts";
import { projeter } from "../presentation/vers-signalement.ts";
import { consulter, lister, type FiltresLecture } from "@application/signalement/lister.cas.ts";
import { creer, type CommandeCreation } from "@application/signalement/creer.cas.ts";
import { valider } from "@application/signalement/valider.cas.ts";
import { rejeter } from "@application/signalement/rejeter.cas.ts";
import type { Acteur, Dependances } from "@application/dependances.type.ts";
import type { MotifRejet, Priorite, Statut } from "@domaine/signalement/signalement.type.ts";

const VISITEUR: Acteur = { idUtilisateur: "visiteur", role: "VISITEUR", adresseIp: null };

/** Un visiteur non connecté lit, mais ne crée rien : le RBAC des écritures le refuse ensuite. */
function acteurDe(req: Request): Acteur {
  return (req as RequeteActeur).acteur ?? VISITEUR;
}

function texte(valeur: unknown): string | undefined {
  return typeof valeur === "string" && valeur.length > 0 ? valeur : undefined;
}

export function routesSignalements(deps: Dependances): Router {
  const routeur = Router();

  const noms = (dossier: { idCategorie: string; idQuartier: string }) => ({
    categorie: deps.referentiel.categories().find((c) => c.idCategorie === dossier.idCategorie)?.nom,
    quartier: deps.referentiel.quartiers().find((q) => q.idQuartier === dossier.idQuartier)?.nom,
  });

  routeur.get("/", (req, res) => {
    const acteur = acteurDe(req);
    const filtres: FiltresLecture = {
      statut: texte(req.query.statut) as Statut | undefined,
      idQuartier: texte(req.query.quartier),
      idCategorie: texte(req.query.categorie),
      limite: Number(req.query.limite) > 0 ? Number(req.query.limite) : undefined,
    };
    const dossiers = lister(acteur, filtres, deps);
    res.json(dossiers.map((dossier) => projeter(dossier, acteur.role, noms(dossier))));
  });

  routeur.get("/:id", (req, res) => {
    const acteur = acteurDe(req);
    const dossier = consulter(req.params.id, acteur, deps);
    res.json(projeter(dossier, acteur.role, noms(dossier)));
  });

  routeur.post(
    "/",
    rbac("creerSignalement"),
    attraper(async (req, res) => {
      const acteur = exigerSession(req);
      const corps = req.body as Record<string, unknown>;
      const commande: CommandeCreation = {
        idCategorie: String(corps.id_categorie ?? ""),
        latitude: Number(corps.latitude),
        longitude: Number(corps.longitude),
        description: String(corps.description ?? ""),
        repere: corps.repere ? String(corps.repere) : null,
        sansPhoto: corps.sans_photo === true,
        nombrePhotos: Array.isArray(corps.photos) ? corps.photos.length : Number(corps.nombre_photos ?? 0),
        precisionGpsM: Number(corps.precision_gps_m ?? 10),
        positionManuelle: corps.position_manuelle === true,
        idCategorieIa: corps.id_categorie_ia ? String(corps.id_categorie_ia) : null,
        scoreIa: typeof corps.score_ia === "number" ? corps.score_ia : null,
        modeIa: corps.mode_ia === "MODELE" || corps.mode_ia === "SIMULATION" ? corps.mode_ia : "AUCUN",
        justificationIa: corps.justification_ia ? String(corps.justification_ia) : null,
      };

      const resultat = creer(commande, acteur, deps);
      res.status(201).json({
        signalement: projeter(resultat.dossier, acteur.role, noms(resultat.dossier)),
        doublons: resultat.doublons,
      });
    }),
  );

  routeur.post(
    "/:id/valider",
    rbac("validerSignalement"),
    attraper(async (req, res) => {
      const acteur = exigerSession(req);
      const corps = req.body as Record<string, unknown>;
      const dossier = valider(
        req.params.id,
        {
          idCategorie: texte(corps.id_categorie),
          niveauPriorite: texte(corps.niveau_priorite) as Priorite | undefined,
          commentaire: texte(corps.commentaire),
        },
        acteur,
        deps,
      );
      res.json(projeter(dossier, acteur.role, noms(dossier)));
    }),
  );

  routeur.post(
    "/:id/rejeter",
    rbac("rejeterSignalement"),
    attraper(async (req, res) => {
      const acteur = exigerSession(req);
      const corps = req.body as Record<string, unknown>;
      const dossier = rejeter(
        req.params.id,
        {
          motifRejet: String(corps.motif_rejet ?? "") as MotifRejet,
          commentaire: texte(corps.commentaire),
        },
        acteur,
        deps,
      );
      res.json(projeter(dossier, acteur.role, noms(dossier)));
    }),
  );

  return routeur;
}