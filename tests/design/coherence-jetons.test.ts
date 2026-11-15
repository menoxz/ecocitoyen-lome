import { describe, expect, test } from "bun:test";
import { PRIORITES as PRIORITES_DOMAINE, STATUTS as STATUTS_DOMAINE } from "@domaine/signalement/signalement.type.ts";
import { PRIORITES as PRIORITES_UI, STATUTS as STATUTS_UI } from "@web/ui/jetons.ts";

/**
 * Test transversal : la couche `web` ne peut pas importer le domaine (frontière ADR-001), elle
 * redéclare donc les clés métier dans `jetons.ts`. Ce test est la seule chose qui empêche la
 * dérive : ajouter un statut au domaine sans son style casse ici, pas à l'écran.
 */
describe("cohérence jetons ↔ domaine", () => {
  test("les six statuts du domaine ont tous un jeton de style", () => {
    const clesDomaine = [...STATUTS_DOMAINE].sort();
    const clesUi = Object.keys(STATUTS_UI).sort();

    expect(clesUi).toEqual(clesDomaine);
  });

  test("les quatre priorités du domaine ont toutes un jeton de style", () => {
    const clesDomaine = [...PRIORITES_DOMAINE].sort();
    const clesUi = Object.keys(PRIORITES_UI).sort();

    expect(clesUi).toEqual(clesDomaine);
  });

  test("chaque statut porte un libellé français, une teinte de texte et un fond", () => {
    for (const [cle, jeton] of Object.entries(STATUTS_UI)) {
      expect(jeton.libelle.length).toBeGreaterThan(2);
      expect(jeton.libelle).not.toBe(cle);
      expect(jeton.texte).toMatch(/^#[0-9a-f]{6}$/);
      expect(jeton.fond).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  test("chaque priorité porte un libellé et une teinte distincte", () => {
    const teintes = Object.values(PRIORITES_UI).map((jeton) => jeton.texte);
    expect(new Set(teintes).size).toBe(teintes.length);
  });

  test("aucun libellé de statut n'est ambigu avec un autre", () => {
    const libelles = Object.values(STATUTS_UI).map((jeton) => jeton.libelle.toLowerCase());
    expect(new Set(libelles).size).toBe(libelles.length);
  });
});