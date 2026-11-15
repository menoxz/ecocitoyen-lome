import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AssistantSignalement } from "./AssistantSignalement.tsx";
import { RecuSignalement } from "./RecuSignalement.tsx";
import {
  BROUILLON_INITIAL,
  construireDemande,
  etapeSuivante,
  peutAvancer,
  type Brouillon,
} from "./etapes.ts";

/**
 * Le parcours est piloté par une logique pure (`etapes.ts`) et un composant sans effet de bord
 * au rendu. Ces tests couvrent les deux : les décisions de progression, et le contenu de chaque
 * vue. La navigation par clic relève de la revue navigateur, elle n'est pas simulée ici — le dire
 * vaut mieux que de la faire passer pour testée.
 */

const PHOTO = { id: "p1", nom: "photo-1.jpg" };
const POSITION = { latitude: 6.1255, longitude: 1.2222 };

const brouillon = (surcharge: Partial<Brouillon> = {}): Brouillon => ({ ...BROUILLON_INITIAL, ...surcharge });

const CATEGORIES = [
  { valeur: "cat-1", libelle: "Dépôt sauvage" },
  { valeur: "cat-2", libelle: "Caniveau bouché" },
];
const QUARTIERS = [{ valeur: "qrt-be", libelle: "Bè" }];

const rendu = (element: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(element);

describe("progression du parcours (logique pure)", () => {
  test("etape preuve : une photo ou un refus explicite, rien d'autre", () => {
    expect(peutAvancer("preuve", brouillon()).ok).toBe(false);
    const refus = peutAvancer("preuve", brouillon());
    expect(refus.ok === false && refus.raison).toContain("photo");

    expect(peutAvancer("preuve", brouillon({ photos: [PHOTO] })).ok).toBe(true);
    expect(peutAvancer("preuve", brouillon({ sansPhoto: true })).ok).toBe(true);
  });

  test("etape lieu : position et quartier sont tous deux necessaires", () => {
    expect(peutAvancer("lieu", brouillon()).ok).toBe(false);
    expect(peutAvancer("lieu", brouillon({ position: POSITION })).ok).toBe(false);
    expect(peutAvancer("lieu", brouillon({ idQuartier: "qrt-be" })).ok).toBe(false);
    expect(peutAvancer("lieu", brouillon({ position: POSITION, idQuartier: "qrt-be" })).ok).toBe(true);
  });

  test("etape probleme : categorie et description bornee", () => {
    expect(peutAvancer("probleme", brouillon()).ok).toBe(false);
    expect(peutAvancer("probleme", brouillon({ idCategorie: "cat-1" })).ok).toBe(false);
    expect(peutAvancer("probleme", brouillon({ idCategorie: "cat-1", description: "court" })).ok).toBe(false);
    expect(
      peutAvancer("probleme", brouillon({ idCategorie: "cat-1", description: "a".repeat(501) })).ok,
    ).toBe(false);
    expect(
      peutAvancer("probleme", brouillon({ idCategorie: "cat-1", description: "Tas de déchets devant l école" })).ok,
    ).toBe(true);
  });

  test("chaque refus porte une raison lisible, jamais un bouton muet", () => {
    for (const etape of ["preuve", "lieu", "probleme"] as const) {
      const decision = peutAvancer(etape, brouillon());
      expect(decision.ok).toBe(false);
      if (!decision.ok) {
        expect(decision.raison.length).toBeGreaterThan(20);
      }
    }
  });

  test("trois etapes, pas quatre", () => {
    expect(etapeSuivante("preuve")).toBe("lieu");
    expect(etapeSuivante("lieu")).toBe("probleme");
    expect(etapeSuivante("probleme")).toBeNull();
  });
});

describe("construction de la demande", () => {
  test("produit la charge conforme au contrat /signalements", () => {
    const demande = construireDemande(
      brouillon({
        photos: [PHOTO],
        position: POSITION,
        idQuartier: "qrt-be",
        repere: "  devant la pharmacie  ",
        idCategorie: "cat-1",
        description: "  Tas de déchets devant l école  ",
      }),
    );

    expect(demande.id_categorie).toBe("cat-1");
    expect(demande.description).toBe("Tas de déchets devant l école");
    expect(demande.latitude).toBe(POSITION.latitude);
    expect(demande.repere).toBe("devant la pharmacie");
    expect(demande.sans_photo).toBe(false);
    expect(demande.nombre_photos).toBe(1);
  });

  test("sans photo : le mode degrade est declare, pas simule", () => {
    const demande = construireDemande(brouillon({ sansPhoto: true, position: POSITION, idCategorie: "cat-1" }));

    expect(demande.sans_photo).toBe(true);
    expect(demande.nombre_photos).toBe(0);
    expect(demande.repere).toBeNull();
  });

  test("refuse de construire sans position plutot que d envoyer 0,0", () => {
    expect(() => construireDemande(brouillon({ idCategorie: "cat-1" }))).toThrow();
  });
});

describe("rendu de chaque etape", () => {
  const envoyer = async () => ({ ok: true as const, valeur: { signalement: { id_signalement: "sig-1", statut: "NOUVEAU" } as never } });

  test("etape 1 : fil du parcours, depot photo, action de secours", () => {
    const html = rendu(<AssistantSignalement categories={CATEGORIES} quartiers={QUARTIERS} envoyer={envoyer} />);

    expect(html).toContain("Photo");
    expect(html).toContain("Lieu");
    expect(html).toContain("Problème");
    expect(html).toContain('aria-current="step"');
    expect(html).toContain("Ajouter une photo");
    expect(html).toContain("Je ne peux pas photographier");
    expect(html).toContain("Continuer");
  });

  test("etape 2 : quartier obligatoire, repere facultatif, pas de categorie", () => {
    const html = rendu(
      <AssistantSignalement
        categories={CATEGORIES}
        quartiers={QUARTIERS}
        envoyer={envoyer}
        etapeInitiale="lieu"
        positionInitiale={POSITION}
      />,
    );

    expect(html).toContain("Quartier");
    // La liste est un combobox fermé : les options sont rendues à l ouverture (test du panneau).
    expect(html).toContain('role="combobox"');
    expect(html).toContain("Repère (facultatif)");
    expect(html).toContain("Position enregistrée");
    expect(html).not.toContain("Catégorie");
  });

  test("etape 3 : categorie et description comptee, action finale explicite", () => {
    const html = rendu(
      <AssistantSignalement
        categories={CATEGORIES}
        quartiers={QUARTIERS}
        envoyer={envoyer}
        etapeInitiale="probleme"
      />,
    );

    expect(html).toContain("Catégorie");
    expect(html).toContain('role="combobox"');
    expect(html).toContain("Description");
    expect(html).toContain("/500 caractères");
    expect(html).toContain("Envoyer le signalement");
  });

  test("aucune identite d auteur ni donnee technique dans le formulaire", () => {
    const html = rendu(<AssistantSignalement categories={CATEGORIES} quartiers={QUARTIERS} envoyer={envoyer} />);

    expect(html).not.toContain("id_auteur");
    expect(html).not.toContain("score_priorite");
    expect(html).not.toContain("mode_ia");
  });
});

describe("recu de signalement", () => {
  test("affiche le numero de dossier et le statut, et propose de suivre", () => {
    const html = rendu(<RecuSignalement idSignalement="sig-42" statut="NOUVEAU" onOuvrirDossier={() => {}} />);

    expect(html).toContain("Signalement enregistré");
    expect(html).toContain("sig-42");
    expect(html).toContain("NOUVEAU");
    expect(html).toContain("Suivre ce signalement");
    expect(html).toContain('role="status"');
  });

  test("ne promet aucun delai qui dependrait de la priorite", () => {
    const html = rendu(<RecuSignalement idSignalement="sig-42" statut="NOUVEAU" />);

    expect(html).not.toContain("48 h");
    expect(html).not.toContain("72 h");
    expect(html).toContain("notifié");
  });
});
