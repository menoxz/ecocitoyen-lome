import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { EcranRecette } from "./EcranRecette.tsx";
import { PREUVES_RECETTE } from "../../recette/preuves.ts";

const rendu = (): string => renderToStaticMarkup(<EcranRecette />);

describe("écran de recette", () => {
  test("liste les quatorze critères avec le test qui les porte", () => {
    const html = rendu();
    expect(PREUVES_RECETTE.length).toBe(14);
    for (const preuve of PREUVES_RECETTE) {
      expect(html).toContain(preuve.code);
      expect(html).toContain(preuve.fichier);
    }
  });

  test("n affiche aucun verdict : ni PASSED, ni pourcentage inventé", () => {
    const html = rendu();
    expect(html).not.toContain("PASSED");
    expect(html).not.toContain("100 %");
    expect(html).not.toContain("100%");
    expect(html).not.toContain("Critères validés");
  });

  test("dit où le résultat se mesure réellement", () => {
    expect(rendu()).toContain("bun test");
  });
});
