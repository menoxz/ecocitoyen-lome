import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ACCES_SERVICE } from "./navigation.ts";
import { MenuService } from "./MenuService.tsx";
import { MiseEnPage } from "./MiseEnPage.tsx";

const rendu = (element: Parameters<typeof renderToStaticMarkup>[0]): string =>
  renderToStaticMarkup(element);

/**
 * Le menu des accès de service vivait jusqu'ici dans le seul pied de page. Ces tests fixent les
 * deux propriétés qui comptent : les quatre accès sont atteignables, et la barre mobile garde un
 * libellé accessible quand le texte est masqué par la feuille de style.
 */
describe("accès de service dans la barre", () => {
  test("les quatre accès internes portent leur lien et leur libellé", () => {
    const html = rendu(<MenuService />);

    expect(ACCES_SERVICE).toHaveLength(4);
    for (const acces of ACCES_SERVICE) {
      expect(html).toContain(`href="${acces.href}"`);
      expect(html).toContain(acces.libelle);
    }
  });

  test("le panneau est monté mais masqué au repos, pour qu'aria-controls désigne une cible", () => {
    const html = rendu(<MenuService />);

    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('id="panneau-service"');
    expect(html).toMatch(/id="panneau-service"[^>]*hidden/);
  });

  test("la barre de navigation contient le menu, et les parcours gardent un nom accessible", () => {
    const html = rendu(
      <MiseEnPage>
        <p>contenu</p>
      </MiseEnPage>,
    );

    // En mobile le libellé est masqué : c'est `aria-label` qui porte le nom.
    expect(html).toContain('aria-label="Signaler"');
    expect(html).toContain('aria-label="Suivre"');
    expect(html).toContain('aria-label="Indicateurs"');

    const debutNav = html.indexOf("ui-nav--bureau");
    const finNav = html.indexOf("</nav>");
    expect(debutNav).toBeGreaterThan(-1);
    expect(finNav).toBeGreaterThan(debutNav);

    const nav = html.slice(debutNav, finNav);
    expect(nav).toContain("Service");
    expect(nav).toContain('aria-controls="panneau-service"');
  });
});
