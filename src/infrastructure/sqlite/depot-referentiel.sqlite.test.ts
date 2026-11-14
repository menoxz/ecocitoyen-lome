import { describe, expect, test } from "bun:test";
import { creerDepotReferentiel } from "./depot-referentiel.sqlite.ts";
import { baseTest } from "./fixture-test.ts";

describe("dépôt des référentiels", () => {
  test("lit communes, quartiers, catégories et équipes", () => {
    const base = baseTest();
    const depot = creerDepotReferentiel(base);

    expect(depot.communes().length).toBe(1);
    expect(depot.communes()[0].nom).toBe("Grand Lomé");
    expect(depot.quartiers().map((q) => q.idQuartier).sort()).toEqual(["qrt-be", "qrt-tokoin"]);
    expect(depot.categories().length).toBe(2);
    expect(depot.categories()[0].prioriteBase).toBeGreaterThanOrEqual(1);
    expect(depot.equipes().length).toBe(2);
    base.close();
  });

  test("écrit un paramètre puis le remplace sans doublon", () => {
    const base = baseTest();
    const depot = creerDepotReferentiel(base);

    expect(depot.parametre("doublon.rayonMetres")).toBeNull();
    depot.ecrireParametre("doublon.rayonMetres", "30");
    expect(depot.parametre("doublon.rayonMetres")).toBe("30");

    depot.ecrireParametre("doublon.rayonMetres", "45");
    expect(depot.parametre("doublon.rayonMetres")).toBe("45");
    expect(depot.parametres().length).toBe(1);
    base.close();
  });

  test("ajoute une catégorie et un quartier sans modifier le code", () => {
    const base = baseTest();
    const depot = creerDepotReferentiel(base);

    depot.ajouterCategorie({
      idCategorie: "cat-9",
      nom: "Déchets de marché",
      description: "Reste de tri des étals",
      prioriteBase: 2,
      icone: "",
      actif: true,
    });
    depot.ajouterQuartier({
      idQuartier: "qrt-nouveau",
      idCommune: "cmp-lome",
      nom: "Nouveau quartier",
      centreLat: 6.18,
      centreLon: 1.24,
      actif: true,
    });

    expect(depot.categories().length).toBe(3);
    expect(depot.quartiers().length).toBe(3);
    base.close();
  });

  test("refuse une priorité de base hors barème (contrainte du schéma)", () => {
    const base = baseTest();
    const depot = creerDepotReferentiel(base);

    expect(() =>
      depot.ajouterCategorie({
        idCategorie: "cat-invalide",
        nom: "Hors barème",
        description: "",
        prioriteBase: 9,
        icone: "",
        actif: true,
      }),
    ).toThrow();
    base.close();
  });

  test("refuse un quartier rattaché à une commune inexistante", () => {
    const base = baseTest();
    const depot = creerDepotReferentiel(base);

    expect(() =>
      depot.ajouterQuartier({
        idQuartier: "qrt-orphelin",
        idCommune: "cmp-inconnue",
        nom: "Orphelin",
        centreLat: 6.1,
        centreLon: 1.2,
        actif: true,
      }),
    ).toThrow();
    base.close();
  });
});
