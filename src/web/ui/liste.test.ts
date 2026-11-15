import { describe, expect, test } from "bun:test";
import { compterPar, correspond, filtrerParTexte, normaliser, trierPar } from "./liste.ts";

describe("liste — niveau 2 de la hiérarchie de découverte", () => {
  test("la recherche ignore casse et accents dans les deux sens", () => {
    expect(normaliser("Amoutivé")).toBe("amoutive");
    expect(correspond("Amoutivé", "amouti")).toBe(true);
    expect(correspond("Amoutivé", "AMOUTIVE")).toBe(true);
    expect(correspond("Bè-Kpota", "bekpota")).toBe(false);
    expect(correspond("Bè-Kpota", "bè-kp")).toBe(true);
  });

  test("un terme vide ne restreint rien, un terme absent vide la liste", () => {
    const elements = [{ nom: "Amoutivé" }, { nom: "Baguida" }];
    expect(filtrerParTexte(elements, "   ", (e) => [e.nom])).toHaveLength(2);
    expect(filtrerParTexte(elements, "kodjoviakopé", (e) => [e.nom])).toHaveLength(0);
  });

  test("le filtre interroge tous les champs annoncés", () => {
    const elements = [{ quartier: "Amoutivé", reference: "SIG-2026-0071" }];
    expect(filtrerParTexte(elements, "0071", (e) => [e.quartier, e.reference])).toHaveLength(1);
  });

  test("les compteurs de filtre portent sur les éléments reçus", () => {
    const elements = [{ statut: "NOUVEAU" }, { statut: "NOUVEAU" }, { statut: "VALIDE" }];
    expect(compterPar(elements, (e) => e.statut)).toEqual({ NOUVEAU: 2, VALIDE: 1 });
  });

  test("le tri est stable et réversible, sur nombres comme sur textes", () => {
    const elements = [
      { nom: "b", rang: 2 },
      { nom: "a", rang: 1 },
      { nom: "c", rang: 2 },
    ];
    expect(trierPar(elements, (e) => e.rang).map((e) => e.nom)).toEqual(["a", "b", "c"]);
    expect(trierPar(elements, (e) => e.rang, "descendant").map((e) => e.nom)).toEqual(["b", "c", "a"]);
    expect(trierPar(elements, (e) => e.nom).map((e) => e.nom)).toEqual(["a", "b", "c"]);
  });
});
