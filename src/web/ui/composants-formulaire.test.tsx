import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ChampSelect } from "./ChampSelect.tsx";
import { ChampZoneTexte } from "./ChampZoneTexte.tsx";

const rendu = (element: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(element);

const OPTIONS = [
  { valeur: "cat-1", libelle: "Dépôt sauvage" },
  { valeur: "cat-2", libelle: "Caniveau bouché" },
];

describe("ChampSelect", () => {
  const base = { id: "categorie", libelle: "Catégorie", valeur: "", options: OPTIONS, onChange: () => {} };

  test("propose une option vide non validable, pour ne pas preselectionner a la place de l usager", () => {
    const html = rendu(<ChampSelect {...base} requis />);

    expect(html).toContain('value=""');
    expect(html).toContain("Sélectionner…");
    expect(html).toContain("Dépôt sauvage");
    expect(html).toContain("Caniveau bouché");
    expect(html).toContain("required");
  });

  test("sans aucune option : champ desactive et message explicite", () => {
    const html = rendu(<ChampSelect {...base} options={[]} />);

    expect(html).toContain("Aucune option disponible");
    expect(html).toContain("disabled");
  });

  test("erreur annoncee et reliee au champ", () => {
    const html = rendu(<ChampSelect {...base} erreur="Choisissez la catégorie du problème." />);

    expect(html).toContain('role="alert"');
    expect(html).toContain("Choisissez la catégorie du problème.");
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="categorie-erreur"');
  });

  test("aide affichee quand il n y a pas d erreur", () => {
    const html = rendu(<ChampSelect {...base} aide="Cette catégorie déterminera la priorité." />);

    expect(html).toContain("Cette catégorie déterminera la priorité.");
    expect(html).toContain('aria-describedby="categorie-aide"');
  });
});

describe("ChampZoneTexte", () => {
  const base = { id: "description", libelle: "Description", valeur: "", onChange: () => {} };

  test("affiche le compteur permanent et la borne maximale", () => {
    const html = rendu(<ChampZoneTexte {...base} valeur="Tas de déchets" />);

    expect(html).toContain("14/500 caractères");
    expect(html.toLowerCase()).toContain('maxlength="500"');
    expect(html).toContain('aria-describedby="description-compteur"');
  });

  test("signale le minimum sans bloquer la saisie", () => {
    const html = rendu(<ChampZoneTexte {...base} valeur="court" />);

    expect(html).toContain("5/500 caractères (10 minimum)");
    expect(html).not.toContain("disabled");
    expect(html).not.toContain("aria-invalid");
  });

  test("erreur du serveur affichee sous le champ, avec son code", () => {
    const html = rendu(<ChampZoneTexte {...base} valeur="Une description" erreur="La description doit comporter entre 10 et 500 caractères." />);

    expect(html).toContain('role="alert"');
    expect(html).toContain("entre 10 et 500 caractères");
    expect(html).toContain('aria-invalid="true"');
  });

  test("desactive : saisie impossible, fond distinct", () => {
    const html = rendu(<ChampZoneTexte {...base} desactive />);

    expect(html).toContain("disabled");
    expect(html).toContain("background-color:#f6f7f9");
  });
});