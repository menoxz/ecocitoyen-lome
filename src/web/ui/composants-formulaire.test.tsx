import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ChampSelect } from "./ChampSelect.tsx";
import { ChampZoneTexte } from "./ChampZoneTexte.tsx";
import { PanneauOptions } from "./PanneauOptions.tsx";

const rendu = (element: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(element);

const OPTIONS = [
  { valeur: "cat-1", libelle: "Dépôt sauvage" },
  { valeur: "cat-2", libelle: "Caniveau bouché" },
];

describe("ChampSelect", () => {
  const base = { id: "categorie", libelle: "Catégorie", valeur: "", options: OPTIONS, onChange: () => {} };

  test("n invente aucune valeur et annonce le champ obligatoire", () => {
    const html = rendu(<ChampSelect {...base} requis />);

    // Aucune option n est preselectionnee : le declencheur affiche l invite, pas une valeur.
    expect(html).toContain("Sélectionner…");
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-required="true"');
    expect(html).toContain('data-etat="vide"');
    // Le panneau ne se rend pas ferme : les options n apparaissent qu a l ouverture.
    expect(html).not.toContain("Dépôt sauvage");
  });

  test("une valeur choisie s affiche dans le declencheur", () => {
    const html = rendu(<ChampSelect {...base} valeur="cat-2" />);

    expect(html).toContain("Caniveau bouché");
    expect(html).toContain('data-etat="choisi"');
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
    // Le fond désactivé vient désormais de la feuille (`var(--ui-surface-douce)`), pas d'un
    // littéral dans le composant : c'est ce qui le fait suivre le thème clair ou sombre.
    expect(html).toContain("var(--ui-surface-douce)");
  });
});

describe("PanneauOptions", () => {
  const options = [
    { valeur: "q-1", libelle: "Bè-Kpota" },
    { valeur: "q-2", libelle: "Amoutivé" },
    { valeur: "q-3", libelle: "Baguida" },
  ];

  test("les options sont toutes rendues, avec la sélection annoncée", () => {
    const html = rendu(
      <PanneauOptions idPanneau="p" options={options} valeur="q-2" seuilRecherche={7} onChoisir={() => {}} />,
    );

    expect(html).toContain('role="listbox"');
    expect(html).toContain("Bè-Kpota");
    expect(html).toContain("Amoutivé");
    expect(html).toContain('aria-selected="true"');
  });

  test("sous le seuil, aucune recherche ; au-dessus, un champ de recherche", () => {
    const court = rendu(<PanneauOptions idPanneau="p" options={options} valeur="" seuilRecherche={7} onChoisir={() => {}} />);
    expect(court).not.toContain('type="search"');

    const long = rendu(
      <PanneauOptions idPanneau="p" options={[...options, ...options, ...options]} valeur="" seuilRecherche={7} onChoisir={() => {}} />,
    );
    expect(long).toContain('type="search"');
    expect(long).toContain("Chercher dans la liste");
  });
});
