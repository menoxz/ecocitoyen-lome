import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CarteSignalement, ageRelatif } from "./CarteSignalement.tsx";
import { FilParcours } from "./FilParcours.tsx";
import { Modale } from "./Modale.tsx";
import { OngletsFiltres, ongletsDepuisCompteurs } from "./OngletsFiltres.tsx";
import { PHOTOS_MAX, ZoneDepotPhoto } from "./ZoneDepotPhoto.tsx";

const rendu = (element: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(element);

const MAINTENANT = "2026-11-15T12:00:00.000Z";

describe("CarteSignalement", () => {
  const base = {
    id: "sig-1",
    statut: "EN_COURS",
    priorite: "HAUTE",
    scorePriorite: 4,
    description: "Tas de déchets plastiques devant le marché de Bè, très fréquenté le matin",
    quartier: "Bè",
    dateSignalement: "2026-11-15T09:00:00.000Z",
    maintenantIso: MAINTENANT,
    nbConfirmations: 2,
  };

  test("affiche statut, priorité avec score, description, quartier et âge", () => {
    const html = rendu(<CarteSignalement {...base} />);

    expect(html).toContain("En cours");
    expect(html).toContain("Priorité haute");
    expect(html).toContain("Score 4");
    expect(html).toContain("déchets plastiques");
    expect(html).toContain("Bè");
    expect(html).toContain("il y a 3 h");
    expect(html).toContain("2 confirmation(s)");
  });

  test("tronque une description trop longue au lieu de casser la carte", () => {
    const longue = "a".repeat(300);
    const html = rendu(<CarteSignalement {...base} description={longue} />);

    expect(html).toContain("…");
    expect(html).not.toContain(longue);
  });

  test("sans photo : le motif est écrit, pas un cadre vide", () => {
    const html = rendu(<CarteSignalement {...base} />);
    expect(html).toContain("Photo");

    const degrade = rendu(<CarteSignalement {...base} sansPhoto />);
    expect(degrade).toContain("Sans photo");
    expect(degrade).toContain("mode dégradé");
  });

  test("avec photo : image décorative et texte alternatif vide (le texte porte l'information)", () => {
    const html = rendu(<CarteSignalement {...base} photoUrl="/medias/med-1/fichier" />);

    expect(html).toContain('src="/medias/med-1/fichier"');
    expect(html).toContain('alt=""');
  });

  test("états sélectionnée et chargement annoncés", () => {
    const selectionnee = rendu(<CarteSignalement {...base} selectionnee />);
    const chargement = rendu(<CarteSignalement {...base} enChargement />);

    expect(selectionnee).toContain('data-selectionnee="true"');
    expect(chargement).toContain('aria-busy="true"');
    expect(chargement).toContain("chargement");
  });

  test("n'expose jamais l'identité de l'auteur (RG28)", () => {
    const html = rendu(<CarteSignalement {...base} />);

    expect(html).not.toContain("id_auteur");
    expect(html).not.toContain("auteur");
  });
});

describe("ageRelatif", () => {
  test("couvre les quatre formes attendues", () => {
    expect(ageRelatif("2026-11-15T11:45:00.000Z", MAINTENANT)).toBe("à l'instant");
    expect(ageRelatif("2026-11-15T09:00:00.000Z", MAINTENANT)).toBe("il y a 3 h");
    expect(ageRelatif("2026-11-14T09:00:00.000Z", MAINTENANT)).toBe("hier");
    expect(ageRelatif("2026-11-10T12:00:00.000Z", MAINTENANT)).toBe("il y a 5 j");
  });

  test("ne prétend rien pour une date inexploitable", () => {
    expect(ageRelatif("pas-une-date", MAINTENANT)).toBe("date inconnue");
    expect(ageRelatif("2026-11-16T12:00:00.000Z", MAINTENANT)).toBe("date inconnue");
  });
});

describe("ZoneDepotPhoto", () => {
  test("vide : trois emplacements dessinés, invite explicite et issue de secours", () => {
    const html = rendu(<ZoneDepotPhoto photos={[]} onDeclarerSansPhoto={() => {}} />);

    // L'absence de photo est montrée par la grille, pas décrite par une phrase.
    expect(html).toContain('data-site="photo-1"');
    expect(html).toContain('data-site="photo-2"');
    expect(html).toContain('data-site="photo-3"');
    // Le contrôle fichier natif est visible dans chaque case : trois champs, aucun bouton relais.
    expect((html.match(/type="file"/g) ?? []).length).toBe(3);
    expect(html).toContain('aria-label="Choisir une photo, emplacement 1"');
    expect(html).not.toContain("Choisir un fichier");
    expect(html).toContain("Ajouter une photo");
    expect(html).toContain("Je ne peux pas photographier");
    expect(html).toContain("JPEG, PNG ou WebP");
    expect(html).toContain("5 Mo maximum");
  });

  test("annonce le maximum atteint et neutralise l'ajout", () => {
    const photos = [
      { id: "p1", nom: "photo-1.jpg" },
      { id: "p2", nom: "photo-2.jpg" },
      { id: "p3", nom: "photo-3.jpg" },
    ];
    const html = rendu(<ZoneDepotPhoto photos={photos} />);

    expect(html).toContain(`(3/${PHOTOS_MAX})`);
    expect(html).toContain("Maximum de 3 photos atteint");
    // Aucun emplacement libre : la grille n offre plus de cible d ajout du tout.
    expect(html).not.toContain("data-site");
    expect(html).toContain("Retirer la photo photo-2.jpg");
  });

  test("erreur serveur affichée telle quelle, jamais reformulée", () => {
    const html = rendu(
      <ZoneDepotPhoto photos={[]} erreur="Le fichier fourni n'est pas une image acceptée (JPEG, PNG, WebP ; 5 Mo maximum)." />,
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain("image acceptée");
  });

  test("mode dégradé déclaré : mention de vérification humaine", () => {
    const html = rendu(<ZoneDepotPhoto photos={[]} sansPhoto />);

    expect(html).toContain("vérification humaine");
  });
});

describe("OngletsFiltres", () => {
  test("construit sept onglets et un total juste", () => {
    const onglets = ongletsDepuisCompteurs({ NOUVEAU: 3, VALIDE: 2, EN_COURS: 0, RESOLU: 4, REJETE: 1, ROUVERT: 0 });

    expect(onglets.length).toBe(7);
    expect(onglets[0].cle).toBe("TOUS");
    expect(onglets[0].nombre).toBe(10);
    expect(onglets.find((onglet) => onglet.cle === "RESOLU")?.nombre).toBe(4);
  });

  test("sélection annoncée par aria-selected, pas seulement par la couleur", () => {
    const onglets = ongletsDepuisCompteurs({ NOUVEAU: 1 });
    const html = rendu(<OngletsFiltres onglets={onglets} selection="NOUVEAU" />);

    expect(html).toContain('role="tablist"');
    expect(html).toContain('data-cle="NOUVEAU"');
    expect((html.match(/aria-selected="true"/g) ?? []).length).toBe(1);
    expect(html).toContain('data-cle="TOUS"');
    expect(html).toContain("Tous (1)");
  });

  test("un statut sans dossier reste visible mais désactivé", () => {
    const onglets = ongletsDepuisCompteurs({ NOUVEAU: 1 });
    const html = rendu(<OngletsFiltres onglets={onglets} selection="TOUS" />);

    expect(html).toContain("Resolu (0)".replace("Resolu", "Résolu"));
    expect((html.match(/disabled/g) ?? []).length).toBeGreaterThanOrEqual(5);
  });
});

describe("Modale", () => {
  test("fermée : rien n'est rendu, donc rien n'est atteignable au clavier", () => {
    expect(rendu(<Modale ouverte={false} titre="Détail">contenu</Modale>)).toBe("");
  });

  test("ouverte : dialogue modal, titre relié, fermeture accessible", () => {
    const html = rendu(<Modale ouverte titre="Détail du signalement" libelleFermeture="Fermer le détail">corps</Modale>);

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="ui-modale-titre"');
    expect(html).toContain('id="ui-modale-titre"');
    expect(html).toContain("Détail du signalement");
    expect(html).toContain('aria-label="Fermer le détail"');
    expect(html).toContain("corps");
  });
});

describe("FilParcours", () => {
  const etapes = [
    { cle: "preuve", libelle: "Photo" },
    { cle: "lieu", libelle: "Lieu" },
    { cle: "probleme", libelle: "Problème" },
  ];

  test("trois étapes nommées, courante annoncée", () => {
    const html = rendu(<FilParcours etapes={etapes} courante="lieu" />);

    expect(html).toContain("Photo");
    expect(html).toContain("Lieu");
    expect(html).toContain("Problème");
    expect(html).toContain('aria-current="step"');
    expect((html.match(/aria-current="step"/g) ?? []).length).toBe(1);
  });

  test("les étapes franchies gardent leur numéro, en vert", () => {
    const html = rendu(<FilParcours etapes={etapes} courante="probleme" />);

    // Le numéro reste affiché : un cercle vert seul ne dit plus quelle étape est la 2e.
    expect((html.match(/data-etat="faite"/g) ?? []).length).toBe(2);
    expect(html).toContain(">1<");
    expect(html).toContain(">2<");
    expect(html).toContain(">3<");
    expect(html).not.toContain("✓");
  });

  test("les étapes faites peuvent être imposées explicitement", () => {
    const html = rendu(<FilParcours etapes={etapes} courante="preuve" faites={["lieu"]} />);

    expect((html.match(/data-etat="faite"/g) ?? []).length).toBe(1);
  });
});





