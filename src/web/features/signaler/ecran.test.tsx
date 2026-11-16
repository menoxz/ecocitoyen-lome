import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { EcranSignaler, positionDuNavigateur, versOptions } from "./EcranSignaler.tsx";
import type { CategorieApi, ClientApi, QuartierApi } from "../../api/client.ts";

const rendu = (element: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(element);

const CATEGORIES: readonly CategorieApi[] = [
  { id_categorie: "cat-1", nom: "Dépôt sauvage", priorite_base: 3 },
  { id_categorie: "cat-2", nom: "Caniveau bouché", priorite_base: 3 },
];
const QUARTIERS: readonly QuartierApi[] = [
  { id_quartier: "qrt-be", nom: "Bè", centre_lat: 6.1255, centre_lon: 1.2222 },
];

/** Client factice : aucune requête réseau pendant les tests. */
function clientFactice(): ClientApi {
  const jamais = async () => ({ ok: true as const, valeur: [] as never });
  return {
    base: "/api/v1",
    moi: jamais,
    connexion: jamais,
    inscription: jamais,
    deconnexion: jamais,
    categories: jamais,
    quartiers: jamais,
    creerSignalement: jamais,
    envoyerPhoto: jamais,
    listerInterventions: jamais,
    dossier: jamais,
    demarrer: jamais,
    resoudre: jamais,
    listerDossiers: jamais,
    priorites: jamais,
    motifsRejet: jamais,
    historique: jamais,
    confirmer: jamais,
    synthese: jamais,
    comptes: jamais,
    modifierCompte: jamais,
    valider: jamais,
    rejeter: jamais,
  };
}

describe("versOptions", () => {
  test("traduit les référentiels en options, en conservant les libellés du serveur", () => {
    const options = versOptions(CATEGORIES, QUARTIERS);

    expect(options.categories).toEqual([
      { valeur: "cat-1", libelle: "Dépôt sauvage" },
      { valeur: "cat-2", libelle: "Caniveau bouché" },
    ]);
    expect(options.quartiers).toEqual([{ valeur: "qrt-be", libelle: "Bè" }]);
  });

  test("ignore une entrée sans identifiant plutôt que de produire une option vide", () => {
    const options = versOptions([{ id_categorie: "", nom: "Sans identifiant", priorite_base: 1 }], QUARTIERS);

    expect(options.categories.length).toBe(0);
  });

  test("accepte des référentiels vides sans échouer", () => {
    expect(versOptions([], [])).toEqual({ categories: [], quartiers: [] });
  });
});

describe("EcranSignaler — état initial", () => {
  test("vérifie la session avant toute saisie, et ne montre pas d'écran vide", () => {
    const html = rendu(<EcranSignaler client={clientFactice()} />);

    expect(html).toContain("Signaler un problème");
    expect(html).toContain('aria-busy="true"');
    // Régression mesurée au navigateur : le parcours laissait saisir trois étapes puis refusait
    // l'envoi par « Une session valide est requise ». La session se vérifie donc à l'entrée.
    expect(html).toContain("Vérification de votre session");
  });

  test("n'affiche ni identité d'auteur ni donnée technique", () => {
    const html = rendu(<EcranSignaler client={clientFactice()} />);

    expect(html).not.toContain("id_auteur");
    expect(html).not.toContain("score_priorite");
  });
});

describe("positionDuNavigateur", () => {
  test("renvoie null quand la géolocalisation est indisponible, au lieu d'échouer", async () => {
    expect(await positionDuNavigateur()).toBeNull();
  });
});
