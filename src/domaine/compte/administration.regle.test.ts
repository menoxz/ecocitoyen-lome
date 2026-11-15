import { describe, expect, test } from "bun:test";
import { ErreurMetier } from "@domaine/erreurs.ts";
import { verifierModificationCompte } from "./administration.regle.ts";

const admin = { role: "ADMIN", actif: true } as const;
const agent = { role: "AGENT", actif: true } as const;

function codeDuRefus(action: () => void): string | null {
  try {
    action();
    return null;
  } catch (erreur) {
    return erreur instanceof ErreurMetier ? erreur.code : "AUTRE";
  }
}

describe("modification d un compte", () => {
  test("accepte de retirer le rôle d un administrateur quand il en reste un autre", () => {
    expect(codeDuRefus(() => verifierModificationCompte(admin, { role: "SUPERVISEUR" }, 2))).toBeNull();
  });

  test("refuse de retirer le rôle du dernier administrateur actif", () => {
    expect(codeDuRefus(() => verifierModificationCompte(admin, { role: "SUPERVISEUR" }, 1))).toBe("DERNIER_ADMINISTRATEUR");
  });

  test("refuse de désactiver le dernier administrateur actif", () => {
    expect(codeDuRefus(() => verifierModificationCompte(admin, { actif: false }, 1))).toBe("DERNIER_ADMINISTRATEUR");
  });

  test("accepte de désactiver un administrateur quand un autre reste actif", () => {
    expect(codeDuRefus(() => verifierModificationCompte(admin, { actif: false }, 2))).toBeNull();
  });

  test("un administrateur qui reste administrateur actif n est jamais bloqué", () => {
    expect(codeDuRefus(() => verifierModificationCompte(admin, { role: "ADMIN", actif: true }, 1))).toBeNull();
  });

  test("modifier un compte non administrateur ne touche pas au verrou", () => {
    expect(codeDuRefus(() => verifierModificationCompte(agent, { role: "CITOYEN", actif: false }, 1))).toBeNull();
  });

  test("un administrateur déjà inactif ne compte pas comme dernier actif", () => {
    const adminInactif = { role: "ADMIN", actif: false } as const;
    expect(codeDuRefus(() => verifierModificationCompte(adminInactif, { role: "CITOYEN" }, 1))).toBeNull();
  });
});
