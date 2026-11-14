import { describe, expect, test } from "bun:test";
import { creerDepotComptes } from "./depot-comptes.sqlite.ts";
import { baseTest } from "./fixture-test.ts";

describe("dépôt des comptes", () => {
  test("retrouve un compte par e-mail ou par téléphone", () => {
    const base = baseTest();
    const depot = creerDepotComptes(base);

    expect(depot.parIdentifiant("koffi@example.tg")?.idUtilisateur).toBe("usr-cit-1");
    expect(depot.parIdentifiant("+22890000002")?.idUtilisateur).toBe("usr-cit-2");
    expect(depot.parIdentifiant("inconnu@example.tg")).toBeNull();
    base.close();
  });

  test("expose l empreinte seulement aux lectures qui en ont besoin", () => {
    const base = baseTest();
    const depot = creerDepotComptes(base);

    const avecEmpreinte = depot.parIdentifiant("koffi@example.tg");
    expect(avecEmpreinte?.empreinteMotDePasse).toBe("empreinte-1");

    const projection = depot.parId("usr-cit-1");
    expect(projection).not.toBeNull();
    expect(Object.keys(projection as NonNullable<typeof projection>)).not.toContain("empreinteMotDePasse");
    base.close();
  });

  test("refuse deux comptes sur le même e-mail (index unique)", () => {
    const base = baseTest();
    const depot = creerDepotComptes(base);

    expect(() =>
      depot.creer({
        idUtilisateur: "usr-doublon",
        nom: "Test",
        prenom: "Test",
        email: "koffi@example.tg",
        telephone: null,
        role: "CITOYEN",
        idEquipe: null,
        actif: true,
        motDePasseTemporaire: false,
        empreinteMotDePasse: "x",
        dateConsentement: "2026-01-01T00:00:00.000Z",
        dateCreation: "2026-01-01T00:00:00.000Z",
      }),
    ).toThrow();
    base.close();
  });

  test("refuse un compte sans e-mail ni téléphone", () => {
    const base = baseTest();
    const depot = creerDepotComptes(base);

    expect(() =>
      depot.creer({
        idUtilisateur: "usr-sans-contact",
        nom: "Test",
        prenom: "Test",
        email: "",
        telephone: null,
        role: "CITOYEN",
        idEquipe: null,
        actif: true,
        motDePasseTemporaire: false,
        empreinteMotDePasse: "x",
        dateConsentement: "2026-01-01T00:00:00.000Z",
        dateCreation: "2026-01-01T00:00:00.000Z",
      }),
    ).toThrow();
    base.close();
  });

  test("met à jour rôle et activation, et compte les administrateurs actifs", () => {
    const base = baseTest();
    const depot = creerDepotComptes(base);

    expect(depot.compterAdministrateursActifs()).toBe(1);
    const agent = depot.parId("usr-agent-1");
    expect(agent).not.toBeNull();
    depot.enregistrer({ ...(agent as NonNullable<typeof agent>), role: "SUPERVISEUR" });
    expect(depot.parId("usr-agent-1")?.role).toBe("SUPERVISEUR");

    const admin = depot.parId("usr-adm-1");
    depot.enregistrer({ ...(admin as NonNullable<typeof admin>), actif: false });
    expect(depot.compterAdministrateursActifs()).toBe(0);
    base.close();
  });

  test("change l empreinte et le caractère temporaire du mot de passe", () => {
    const base = baseTest();
    const depot = creerDepotComptes(base);

    depot.changerEmpreinte("usr-agent-1", "nouvelle-empreinte", true);
    const relu = depot.compteAvecEmpreinte("usr-agent-1");
    expect(relu?.empreinteMotDePasse).toBe("nouvelle-empreinte");
    expect(relu?.motDePasseTemporaire).toBe(true);
    base.close();
  });

  test("liste tous les comptes, triés par rôle puis par nom", () => {
    const base = baseTest();
    const depot = creerDepotComptes(base);

    const roles = depot.lister().map((compte) => compte.role);
    expect(roles.length).toBe(5);
    expect(roles).toEqual(["ADMIN", "AGENT", "CITOYEN", "CITOYEN", "SUPERVISEUR"]);
    base.close();
  });
});
