import type { DepotReferentiel } from "@ports/depot-referentiel.port.ts";
import type { Categorie, Commune, Equipe, Parametre, Quartier } from "@domaine/referentiel/referentiel.type.ts";
import type { Base } from "./base.ts";

/**
 * Dépôt SQLite des référentiels.
 *
 * Tout ce qui décrit le territoire et le vocabulaire du service (communes, quartiers, catégories,
 * équipes, paramètres) est lu ici et nulle part ailleurs : changer un délai cible ou ajouter
 * un quartier ne demande aucune modification de code.
 */
export function creerDepotReferentiel(base: Base): DepotReferentiel {
  return {
    communes() {
      const lignes = base
        .prepare("SELECT id_commune, nom, lat_min, lat_max, lon_min, lon_max, actif FROM commune ORDER BY nom")
        .all() as {
        id_commune: string;
        nom: string;
        lat_min: number;
        lat_max: number;
        lon_min: number;
        lon_max: number;
        actif: number;
      }[];
      return lignes.map(
        (ligne): Commune => ({
          idCommune: ligne.id_commune,
          nom: ligne.nom,
          latMin: ligne.lat_min,
          latMax: ligne.lat_max,
          lonMin: ligne.lon_min,
          lonMax: ligne.lon_max,
          actif: ligne.actif === 1,
        }),
      );
    },

    quartiers() {
      const lignes = base
        .prepare("SELECT id_quartier, id_commune, nom, centre_lat, centre_lon, actif FROM quartier ORDER BY nom")
        .all() as {
        id_quartier: string;
        id_commune: string;
        nom: string;
        centre_lat: number;
        centre_lon: number;
        actif: number;
      }[];
      return lignes.map(
        (ligne): Quartier => ({
          idQuartier: ligne.id_quartier,
          idCommune: ligne.id_commune,
          nom: ligne.nom,
          centreLat: ligne.centre_lat,
          centreLon: ligne.centre_lon,
          actif: ligne.actif === 1,
        }),
      );
    },

    categories() {
      const lignes = base
        .prepare("SELECT id_categorie, nom, description, priorite_base, icone, actif FROM categorie ORDER BY id_categorie")
        .all() as {
        id_categorie: string;
        nom: string;
        description: string;
        priorite_base: number;
        icone: string;
        actif: number;
      }[];
      return lignes.map(
        (ligne): Categorie => ({
          idCategorie: ligne.id_categorie,
          nom: ligne.nom,
          description: ligne.description,
          prioriteBase: ligne.priorite_base,
          icone: ligne.icone,
          actif: ligne.actif === 1,
        }),
      );
    },

    equipes() {
      const lignes = base
        .prepare("SELECT id_equipe, id_commune, nom, description, zone, actif FROM equipe ORDER BY nom")
        .all() as {
        id_equipe: string;
        id_commune: string;
        nom: string;
        description: string;
        zone: string;
        actif: number;
      }[];
      return lignes.map(
        (ligne): Equipe => ({
          idEquipe: ligne.id_equipe,
          idCommune: ligne.id_commune,
          nom: ligne.nom,
          description: ligne.description,
          zone: ligne.zone,
          actif: ligne.actif === 1,
        }),
      );
    },

    parametres() {
      const lignes = base.prepare("SELECT cle, valeur FROM parametre ORDER BY cle").all() as Parametre[];
      return lignes;
    },

    parametre(cle) {
      const ligne = base.prepare("SELECT valeur FROM parametre WHERE cle = ?").get(cle) as
        | { valeur: string }
        | undefined;
      return ligne ? ligne.valeur : null;
    },

    ecrireParametre(cle, valeur) {
      base
        .prepare(
          "INSERT INTO parametre (cle, valeur) VALUES (?, ?) ON CONFLICT (cle) DO UPDATE SET valeur = excluded.valeur",
        )
        .run(cle, valeur);
    },

    ajouterCommune(commune) {
      base
        .prepare(
          "INSERT INTO commune (id_commune, nom, lat_min, lat_max, lon_min, lon_max, actif) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .run(
          commune.idCommune,
          commune.nom,
          commune.latMin,
          commune.latMax,
          commune.lonMin,
          commune.lonMax,
          commune.actif ? 1 : 0,
        );
    },

    ajouterQuartier(quartier) {
      base
        .prepare(
          "INSERT INTO quartier (id_quartier, id_commune, nom, centre_lat, centre_lon, actif) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .run(
          quartier.idQuartier,
          quartier.idCommune,
          quartier.nom,
          quartier.centreLat,
          quartier.centreLon,
          quartier.actif ? 1 : 0,
        );
    },

    ajouterCategorie(categorie) {
      base
        .prepare(
          "INSERT INTO categorie (id_categorie, nom, description, priorite_base, icone, actif) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .run(
          categorie.idCategorie,
          categorie.nom,
          categorie.description,
          categorie.prioriteBase,
          categorie.icone,
          categorie.actif ? 1 : 0,
        );
    },

    ajouterEquipe(equipe) {
      base
        .prepare(
          "INSERT INTO equipe (id_equipe, id_commune, nom, description, zone, actif) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .run(equipe.idEquipe, equipe.idCommune, equipe.nom, equipe.description, equipe.zone, equipe.actif ? 1 : 0);
    },
  };
}