import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { EcranRecette } from "./EcranRecette.tsx";
import { PREUVES_RECETTE } from "../../recette/preuves.ts";
import { TAILLE_PAGE } from "../../ui/liste.ts";

const rendu = (): string => renderToStaticMarkup(<EcranRecette />);

describe("écran de recette", () => {
  test("annonce les quatorze critères et en montre une page à la fois", () => {
    const html = rendu();
    expect(PREUVES_RECETTE.length).toBe(14);
    // La liste est paginée : la page montre TAILLE_PAGE objets, le résumé annonce le total.
    expect(html).toContain(`sur ${PREUVES_RECETTE.length}`);
    for (const preuve of PREUVES_RECETTE.slice(0, TAILLE_PAGE)) {
      expect(html).toContain(preuve.code);
      expect(html).toContain(preuve.fichier);
    }
    expect(html).toContain("Pagination de la liste");
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

