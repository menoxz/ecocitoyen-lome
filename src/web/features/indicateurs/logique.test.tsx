import { describe, expect, test } from "bun:test";
import type { SyntheseApi } from "../../api/client.ts";
import {
  NON_MESURABLE,
  formaterHeures,
  formaterNombre,
  formaterPourcentage,
  libelleJalon,
  libelleStatutIndicateur,
  lignesPilotage,
  volumesOrdonnes,
} from "./logique.ts";

const synthese = (surcharge: Partial<SyntheseApi>): SyntheseApi => ({
  volumes: {},
  parCategorie: [],
  parQuartier: [],
  parPriorite: [],
  tauxResolution: null,
  tauxRejet: null,
  delaiMoyenTriHeures: null,
  delaiMoyenTraitementHeures: null,
  respectDelais: { tri: null, affectation: null, resolution: null },
  couvertureGeographique: null,
  qualiteIa: { tauxAccord: null, scoreMoyen: null, evalues: 0 },
  total: 0,
  indisponibles: [],
  ...surcharge,
});

describe("mise en forme des taux", () => {
  test("un taux non mesurable n est jamais affiché zéro", () => {
    expect(formaterPourcentage(null)).toBe(NON_MESURABLE);
    expect(formaterPourcentage(null)).not.toBe("0 %");
  });

  test("un taux mesuré est déjà en points de pourcentage", () => {
    expect(formaterPourcentage(75)).toBe("75 %");
    expect(formaterPourcentage(0)).toBe("0 %");
  });

  test("un zéro mesuré reste distinct d une absence de mesure", () => {
    expect(formaterPourcentage(0)).not.toBe(formaterPourcentage(null));
  });
});

describe("mise en forme des délais et des nombres", () => {
  test("arrondit à une décimale et marque l absence de mesure", () => {
    expect(formaterHeures(12.345)).toBe("12.3 h");
    expect(formaterHeures(null)).toBe(NON_MESURABLE);
  });

  test("un score absent ne devient pas zéro", () => {
    expect(formaterNombre(null)).toBe(NON_MESURABLE);
    expect(formaterNombre(4.5)).toBe("4.5");
  });
});

describe("libellés", () => {
  test("nomme les jalons du suivi des délais", () => {
    expect(libelleJalon("affectation")).toBe("Affectation à une équipe");
    expect(libelleJalon("inconnu")).toBe("inconnu");
  });

  test("traduit les statuts et laisse passer l inconnu", () => {
    expect(libelleStatutIndicateur("EN_COURS")).toBe("En cours");
    expect(libelleStatutIndicateur("X")).toBe("X");
  });
});

describe("lecture d une synthèse", () => {
  test("les volumes suivent le cycle de vie et incluent les statuts à zéro", () => {
    const volumes = volumesOrdonnes(synthese({ volumes: { RESOLU: 9, NOUVEAU: 4 } }));
    expect(volumes.map((v) => v.statut)).toEqual(["NOUVEAU", "VALIDE", "EN_COURS", "RESOLU", "REJETE", "ROUVERT"]);
    expect(volumes.find((v) => v.statut === "RESOLU")?.nombre).toBe(9);
    expect(volumes.find((v) => v.statut === "VALIDE")?.nombre).toBe(0);
  });

  test("les lignes de pilotage marquent ce qui n est pas mesurable", () => {
    const lignes = lignesPilotage(synthese({ tauxResolution: 75 }));
    const resolution = lignes.find((l) => l.libelle === "Taux de résolution");
    const rejet = lignes.find((l) => l.libelle === "Taux de rejet");
    expect(resolution?.valeur).toBe("75 %");
    expect(resolution?.mesurable).toBe(true);
    expect(rejet?.valeur).toBe(NON_MESURABLE);
    expect(rejet?.mesurable).toBe(false);
  });
});
