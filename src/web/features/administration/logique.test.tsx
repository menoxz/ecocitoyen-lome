import { describe, expect, test } from "bun:test";
import type { CompteApi } from "../../api/client.ts";
import { basculerActivation, comptesTries, libelleRole, nomAffichable } from "./logique.ts";

const compte = (surcharge: Partial<CompteApi>): CompteApi => ({
  id_utilisateur: "usr-1",
  email: "a@example.tg",
  role: "CITOYEN",
  nom: "Adjo",
  prenom: "Kossi",
  actif: true,
  ...surcharge,
});

describe("ordre d affichage des comptes", () => {
  test("les administrateurs passent devant, les citoyens derrière", () => {
    const tries = comptesTries([
      compte({ id_utilisateur: "c", role: "CITOYEN", email: "c@example.tg" }),
      compte({ id_utilisateur: "a", role: "ADMIN", email: "a@example.tg" }),
      compte({ id_utilisateur: "s", role: "SUPERVISEUR", email: "s@example.tg" }),
    ]);
    expect(tries.map((c) => c.role)).toEqual(["ADMIN", "SUPERVISEUR", "CITOYEN"]);
  });

  test("à rôle égal, l ordre suit l adresse", () => {
    const tries = comptesTries([
      compte({ id_utilisateur: "z", email: "z@example.tg" }),
      compte({ id_utilisateur: "a", email: "a@example.tg" }),
    ]);
    expect(tries.map((c) => c.email)).toEqual(["a@example.tg", "z@example.tg"]);
  });

  test("la liste d origine n est pas modifiée", () => {
    const origine = [compte({ role: "CITOYEN" }), compte({ role: "ADMIN", email: "b@example.tg" })];
    comptesTries(origine);
    expect(origine[0].role).toBe("CITOYEN");
  });
});

describe("présentation d un compte", () => {
  test("traduit les rôles et laisse passer l inconnu", () => {
    expect(libelleRole("SUPERVISEUR")).toBe("Superviseur");
    expect(libelleRole("INCONNU")).toBe("INCONNU");
  });

  test("préfère le nom complet, sinon l adresse", () => {
    expect(nomAffichable(compte({ prenom: "Kossi", nom: "Adjo" }))).toBe("Kossi Adjo");
    expect(nomAffichable(compte({ prenom: "", nom: "", email: "seul@example.tg" }))).toBe("seul@example.tg");
  });
});

describe("bascule d activation", () => {
  test("envoie la valeur voulue, pas une bascule implicite", () => {
    expect(basculerActivation(compte({ actif: true }))).toEqual({ actif: false });
    expect(basculerActivation(compte({ actif: false }))).toEqual({ actif: true });
  });

  test("un compte dont l état est absent est traité comme inactif", () => {
    expect(basculerActivation(compte({ actif: undefined }))).toEqual({ actif: true });
  });
});
