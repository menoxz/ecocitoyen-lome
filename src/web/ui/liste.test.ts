import { describe, expect, test } from "bun:test";
import { bornesPage, compterPar, correspond, filtrerParTexte, nombreDePages, normaliser, paginer, trierPar } from "./liste.ts";

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

describe("pagination — niveau 2, liste longue découpée", () => {
  const elements = Array.from({ length: 23 }, (_, index) => index + 1);

  test("une page découpe sans perdre ni répéter un élément", () => {
    expect(paginer(elements, 1, 8)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(paginer(elements, 2, 8)).toEqual([9, 10, 11, 12, 13, 14, 15, 16]);
    expect(paginer(elements, 3, 8)).toEqual([17, 18, 19, 20, 21, 22, 23]);
  });

  test("une page hors bornes est ramenée dans la liste, jamais une page vide", () => {
    expect(paginer(elements, 9, 8)).toEqual([17, 18, 19, 20, 21, 22, 23]);
    expect(paginer(elements, 0, 8)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(paginer([], 3, 8)).toEqual([]);
  });

  test("les bornes affichées disent ce qui est visible et sur quoi", () => {
    expect(nombreDePages(23, 8)).toBe(3);
    expect(nombreDePages(0, 8)).toBe(1);
    expect(bornesPage(1, 23, 8)).toEqual({ debut: 1, fin: 8 });
    expect(bornesPage(3, 23, 8)).toEqual({ debut: 17, fin: 23 });
    expect(bornesPage(1, 0, 8)).toEqual({ debut: 0, fin: 0 });
  });
});
