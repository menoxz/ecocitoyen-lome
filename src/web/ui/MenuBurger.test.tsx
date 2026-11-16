import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MenuBurger } from "./MenuBurger.tsx";
import { ACCES_SERVICE, LIENS_NAV } from "./navigation.ts";

const rendu = (element: Parameters<typeof renderToStaticMarkup>[0]): string =>
  renderToStaticMarkup(element);

/**
 * Sous 760 px, le burger est le seul chemin : s'il oublie une entrée, elle devient inatteignable.
 * Ces tests fixent l'exhaustivité (parcours + accès de service + thème) et l'annonce d'état.
 */
describe("menu burger mobile", () => {
  test("il porte tous les parcours et tous les accès de service", () => {
    const html = rendu(<MenuBurger />);

    for (const lien of LIENS_NAV) {
      expect(html).toContain(`href="${lien.href}"`);
      expect(html).toContain(lien.libelle);
    }
    for (const acces of ACCES_SERVICE) {
      expect(html).toContain(acces.libelle);
    }
    expect(html).toContain("Accès de service");
  });

  test("le bouton annonce son état et désigne une cible existante", () => {
    const html = rendu(<MenuBurger />);

    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="panneau-burger"');
    expect(html).toMatch(/id="panneau-burger"[^>]*hidden/);
  });

  test("le réglage du thème est dans le panneau, pas resté dehors", () => {
    const html = rendu(<MenuBurger />);
    const panneau = html.slice(html.indexOf('id="panneau-burger"'));

    expect(panneau).toContain("ui-burger-reglage");
    expect(panneau).toContain("ui-theme");
  });
});
