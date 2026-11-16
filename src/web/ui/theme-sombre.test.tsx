import { describe, expect, test } from "bun:test";
import { attributTheme, choixDepuis, choixSuivant, libelleTheme } from "./theme-sombre.ts";

describe("choix de thème", () => {
  test("une valeur inconnue ou absente retombe sur l'automatique", () => {
    expect(choixDepuis(null)).toBe("auto");
    expect(choixDepuis(undefined)).toBe("auto");
    expect(choixDepuis("n'importe quoi")).toBe("auto");
    expect(choixDepuis("")).toBe("auto");
  });

  test("les valeurs connues sont conservées", () => {
    expect(choixDepuis("clair")).toBe("clair");
    expect(choixDepuis("sombre")).toBe("sombre");
  });

  test("le cycle parcourt auto, clair, sombre puis revient", () => {
    expect(choixSuivant("auto")).toBe("clair");
    expect(choixSuivant("clair")).toBe("sombre");
    expect(choixSuivant("sombre")).toBe("auto");
  });

  test("l'automatique ne pose aucun attribut : le système décide", () => {
    expect(attributTheme("auto")).toBeNull();
    expect(attributTheme("clair")).toBe("clair");
    expect(attributTheme("sombre")).toBe("sombre");
  });

  test("chaque choix a un libellé lisible", () => {
    expect(libelleTheme("auto")).toBe("Auto");
    expect(libelleTheme("clair")).toBe("Clair");
    expect(libelleTheme("sombre")).toBe("Sombre");
  });
});
