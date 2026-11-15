import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PREUVES_RECETTE, criteresProuves, preuveDe } from "@web/recette/preuves.ts";

/**
 * Garde mécanique : un critère de recette ne peut plus être « déclaré » couvert.
 *
 * L'écran du prototype affichait quatorze « PASSED » écrits à la main. Ici, chaque critère doit
 * citer un fichier de test qui existe **et** contenir le libellé du test invoqué. Citer un test
 * inexistant, ou renommer un test sans mettre à jour la cartographie, casse cette suite.
 */
const RACINE = process.cwd();

const lire = (chemin: string): string => readFileSync(join(RACINE, chemin), "utf8");

describe("cartographie des critères de recette", () => {
  test("couvre les quatorze critères du cahier des charges, sans doublon", () => {
    const codes = PREUVES_RECETTE.map((preuve) => preuve.code);

    expect(codes.length).toBe(14);
    expect(new Set(codes).size).toBe(14);
    expect(codes[0]).toBe("CR1");
    expect(codes[13]).toBe("CR14");
  });

  test("chaque critère cite un fichier de test qui existe réellement", () => {
    for (const preuve of PREUVES_RECETTE) {
      expect({ code: preuve.code, existe: existsSync(join(RACINE, preuve.fichier)) }).toEqual({
        code: preuve.code,
        existe: true,
      });
    }
  });

  test("chaque critère cite un test présent dans ce fichier, pas un test inventé", () => {
    for (const preuve of PREUVES_RECETTE) {
      const contenu = lire(preuve.fichier);
      const present = contenu.includes(preuve.test);

      expect({ code: preuve.code, fichier: preuve.fichier, present }).toEqual({
        code: preuve.code,
        fichier: preuve.fichier,
        present: true,
      });
    }
  });

  test("chaque preuve dit ce qui est réellement vérifié, en une phrase non vide", () => {
    for (const preuve of PREUVES_RECETTE) {
      expect(preuve.preuve.length).toBeGreaterThan(15);
      expect(preuve.critere.length).toBeGreaterThan(10);
    }
  });

  test("les quatorze critères sont adossés à un fichier existant, donc prouvés", () => {
    const fichiers = new Set(
      PREUVES_RECETTE.filter((preuve) => existsSync(join(RACINE, preuve.fichier))).map((preuve) => preuve.fichier),
    );

    expect(criteresProuves(fichiers)).toEqual({ prouves: 14, total: 14 });
  });

  test("un fichier absent ne compte pas comme une preuve", () => {
    expect(criteresProuves(new Set(["chemin/inexistant.test.ts"]))).toEqual({ prouves: 0, total: 14 });
  });

  test("recherche par code, et null pour un code inconnu", () => {
    expect(preuveDe("CR8")?.fichier).toBe("tests/api/interventions.test.ts");
    expect(preuveDe("CR99")).toBeNull();
  });
});
