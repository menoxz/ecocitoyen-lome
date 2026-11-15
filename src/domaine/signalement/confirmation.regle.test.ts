import { describe, expect, test } from "bun:test";
import { ErreurMetier } from "@domaine/erreurs.ts";
import { verifierConfirmable } from "./confirmation.regle.ts";

describe("confirmation « Moi aussi »", () => {
  test("accepte la confirmation d un dossier ouvert par un autre citoyen", () => {
    for (const statut of ["NOUVEAU", "VALIDE", "EN_COURS", "ROUVERT"] as const) {
      expect(() => verifierConfirmable({ statut, idAuteur: "usr-autre" }, "usr-moi")).not.toThrow();
    }
  });

  test("refuse de confirmer son propre signalement", () => {
    expect(() => verifierConfirmable({ statut: "NOUVEAU", idAuteur: "usr-moi" }, "usr-moi")).toThrow(ErreurMetier);
    try {
      verifierConfirmable({ statut: "NOUVEAU", idAuteur: "usr-moi" }, "usr-moi");
    } catch (erreur) {
      expect((erreur as ErreurMetier).code).toBe("CONFIRMATION_PROPRE");
    }
  });

  test("refuse un dossier clos : résolu ou rejeté ne se corrobore plus", () => {
    for (const statut of ["RESOLU", "REJETE"] as const) {
      try {
        verifierConfirmable({ statut, idAuteur: "usr-autre" }, "usr-moi");
        throw new Error("le refus attendu n'a pas eu lieu");
      } catch (erreur) {
        expect((erreur as ErreurMetier).code).toBe("STATUT_INCOMPATIBLE");
      }
    }
  });
});
