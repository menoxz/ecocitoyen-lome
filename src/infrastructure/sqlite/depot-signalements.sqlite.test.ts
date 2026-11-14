import { describe, expect, test } from "bun:test";
import { creerDepotSignalements } from "./depot-signalements.sqlite.ts";
import { baseTest, signalementDeTest } from "./fixture-test.ts";

const HISTORIQUE_INITIAL = {
  idHistorique: "hist-1",
  idSignalement: "sig-1",
  ancienStatut: null,
  nouveauStatut: "NOUVEAU" as const,
  idAuteur: "usr-cit-1",
  dateChangement: "2026-11-10T08:00:00.000Z",
  commentaire: "Création",
};

describe("dépôt des signalements", () => {
  test("crée un dossier avec sa ligne d historique initiale", () => {
    const base = baseTest();
    const depot = creerDepotSignalements(base);

    depot.creer(signalementDeTest(), HISTORIQUE_INITIAL);

    const relu = depot.parId("sig-1");
    expect(relu?.statut).toBe("NOUVEAU");
    expect(relu?.description).toContain("déchets plastiques");
    expect(relu?.sansPhoto).toBe(false);
    expect(relu?.nbConfirmations).toBe(0);
    expect(depot.historiqueDe("sig-1").length).toBe(1);
    expect(depot.historiqueDe("sig-1")[0].ancienStatut).toBeNull();
    base.close();
  });

  test("retourne null pour un dossier inconnu", () => {
    const base = baseTest();
    expect(creerDepotSignalements(base).parId("sig-absente")).toBeNull();
    base.close();
  });

  test("filtre par statut, quartier et catégorie, et plafonne la liste", () => {
    const base = baseTest();
    const depot = creerDepotSignalements(base);
    depot.creer(signalementDeTest({ idSignalement: "sig-1", statut: "NOUVEAU" }), {
      ...HISTORIQUE_INITIAL,
      idSignalement: "sig-1",
    });
    depot.creer(signalementDeTest({ idSignalement: "sig-2", statut: "VALIDE", dateValidation: "2026-11-10T09:00:00.000Z" }), {
      ...HISTORIQUE_INITIAL,
      idHistorique: "hist-2",
      idSignalement: "sig-2",
    });
    depot.creer(signalementDeTest({ idSignalement: "sig-3", idQuartier: "qrt-tokoin", idCategorie: "cat-2" }), {
      ...HISTORIQUE_INITIAL,
      idHistorique: "hist-3",
      idSignalement: "sig-3",
    });

    expect(depot.lister({ statut: "VALIDE" }).map((s) => s.idSignalement)).toEqual(["sig-2"]);
    expect(depot.lister({ idQuartier: "qrt-tokoin" }).map((s) => s.idSignalement)).toEqual(["sig-3"]);
    expect(depot.lister({ idCategorie: "cat-2" }).length).toBe(1);
    expect(depot.lister({ limite: 2 }).length).toBe(2);
    base.close();
  });

  test("enregistre une confirmation une seule fois par utilisateur (RG05)", () => {
    const base = baseTest();
    const depot = creerDepotSignalements(base);
    depot.creer(signalementDeTest(), HISTORIQUE_INITIAL);

    expect(depot.ajouterConfirmation("sig-1", "usr-cit-2", "2026-11-11T08:00:00.000Z")).toBe(true);
    expect(depot.ajouterConfirmation("sig-1", "usr-cit-2", "2026-11-11T09:00:00.000Z")).toBe(false);
    expect(depot.nombreConfirmations("sig-1")).toBe(1);
    expect(depot.parId("sig-1")?.nbConfirmations).toBe(1);
    base.close();
  });

  test("refuse une intervention sur un dossier inexistant (clé étrangère)", () => {
    const base = baseTest();
    const depot = creerDepotSignalements(base);

    expect(() =>
      depot.creerIntervention({
        idIntervention: "int-1",
        idSignalement: "sig-absente",
        idEquipe: "eq-1",
        idAgent: null,
        idAffectePar: "usr-sup-1",
        statutIntervention: "PLANIFIEE",
        dateAffectation: "2026-11-10T10:00:00.000Z",
        dateDebut: null,
        dateFin: null,
        commentaire: null,
      }),
    ).toThrow();
    base.close();
  });

  test("refuse une seconde intervention active sur le même dossier (§9.2)", () => {
    const base = baseTest();
    const depot = creerDepotSignalements(base);
    depot.creer(signalementDeTest({ statut: "EN_COURS", dateValidation: "2026-11-10T09:00:00.000Z" }), HISTORIQUE_INITIAL);

    const intervention = {
      idIntervention: "int-1",
      idSignalement: "sig-1",
      idEquipe: "eq-1",
      idAgent: null,
      idAffectePar: "usr-sup-1",
      statutIntervention: "PLANIFIEE" as const,
      dateAffectation: "2026-11-10T10:00:00.000Z",
      dateDebut: null,
      dateFin: null,
      commentaire: null,
    };

    depot.creerIntervention(intervention);
    expect(() => depot.creerIntervention({ ...intervention, idIntervention: "int-2" })).toThrow();

    depot.majIntervention({ ...intervention, statutIntervention: "TERMINEE" });
    expect(() => depot.creerIntervention({ ...intervention, idIntervention: "int-3" })).not.toThrow();
    expect(depot.interventionsDe("sig-1").length).toBe(2);
    base.close();
  });

  test("met à jour le statut sans perdre l historique", () => {
    const base = baseTest();
    const depot = creerDepotSignalements(base);
    depot.creer(signalementDeTest(), HISTORIQUE_INITIAL);

    const dossier = depot.parId("sig-1");
    expect(dossier).not.toBeNull();
    depot.enregistrer({
      ...(dossier as NonNullable<typeof dossier>),
      statut: "VALIDE",
      dateValidation: "2026-11-10T12:00:00.000Z",
    });
    depot.ajouterHistorique({
      idHistorique: "hist-2",
      idSignalement: "sig-1",
      ancienStatut: "NOUVEAU",
      nouveauStatut: "VALIDE",
      idAuteur: "usr-sup-1",
      dateChangement: "2026-11-10T12:00:00.000Z",
      commentaire: "Validé",
    });

    expect(depot.parId("sig-1")?.statut).toBe("VALIDE");
    expect(depot.parId("sig-1")?.dateValidation).toBe("2026-11-10T12:00:00.000Z");
    expect(depot.historiqueDe("sig-1").length).toBe(2);
    base.close();
  });

  test("conserve les médias avec leur chemin, jamais un contenu", () => {
    const base = baseTest();
    const depot = creerDepotSignalements(base);
    depot.creer(signalementDeTest(), HISTORIQUE_INITIAL);
    depot.ajouterMedia({
      idMedia: "med-1",
      idSignalement: "sig-1",
      idIntervention: null,
      type: "SIGNALEMENT",
      chemin: "2026/11/photo-1.webp",
      mime: "image/webp",
      tailleOctets: 180_000,
      masque: false,
      dateAjout: "2026-11-10T08:00:00.000Z",
    });

    const medias = depot.mediasDe("sig-1");
    expect(medias.length).toBe(1);
    expect(medias[0].chemin).toBe("2026/11/photo-1.webp");
    expect(Object.keys(medias[0])).not.toContain("contenu");
    base.close();
  });

  test("compte les dossiers par statut, tous statuts présents", () => {
    const base = baseTest();
    const depot = creerDepotSignalements(base);
    depot.creer(signalementDeTest(), HISTORIQUE_INITIAL);

    const compte = depot.compterParStatut();
    expect(compte.NOUVEAU).toBe(1);
    expect(compte.RESOLU).toBe(0);
    expect(Object.keys(compte).sort()).toEqual(["EN_COURS", "NOUVEAU", "REJETE", "RESOLU", "ROUVERT", "VALIDE"]);
    base.close();
  });
});
