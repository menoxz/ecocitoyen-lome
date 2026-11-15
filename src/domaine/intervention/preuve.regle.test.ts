import { describe, expect, test } from "bun:test";
import { ErreurMetier } from "../erreurs.ts";
import {
  MAX_PHOTOS_RESOLUTION,
  MAX_PHOTOS_SIGNALEMENT,
  deciderTypePhoto,
  type ContextePhoto,
} from "./preuve.regle.ts";

function contexte(surcharge: Partial<ContextePhoto> = {}): ContextePhoto {
  return {
    role: "CITOYEN",
    estAuteur: true,
    idEquipeAgent: null,
    idEquipeAffectee: null,
    statut: "EN_COURS",
    photosSignalement: 0,
    photosResolution: 0,
    ...surcharge,
  };
}

function code(declencheur: () => unknown): string {
  try {
    declencheur();
    return "AUCUN_REFUS";
  } catch (erreur) {
    return erreur instanceof ErreurMetier ? erreur.code : "AUTRE_ERREUR";
  }
}

describe("photo de signalement — l'auteur", () => {
  test("l auteur joint une photo de signalement", () => {
    expect(deciderTypePhoto(contexte())).toBe("SIGNALEMENT");
  });

  test("refuse la quatrieme photo de signalement", () => {
    expect(code(() => deciderTypePhoto(contexte({ photosSignalement: MAX_PHOTOS_SIGNALEMENT })))).toBe(
      "CONTRAT_INVALIDE",
    );
  });

  test("refuse une photo sur un dossier deja clos ou rejete", () => {
    expect(code(() => deciderTypePhoto(contexte({ statut: "RESOLU" })))).toBe("STATUT_INCOMPATIBLE");
    expect(code(() => deciderTypePhoto(contexte({ statut: "REJETE" })))).toBe("STATUT_INCOMPATIBLE");
  });
});

describe("preuve de resolution — l'agent de l'equipe affectee (CR8)", () => {
  test("l agent de l equipe affectee joint la preuve d un dossier en cours", () => {
    const type = deciderTypePhoto(
      contexte({ role: "AGENT", estAuteur: false, idEquipeAgent: "eq-1", idEquipeAffectee: "eq-1" }),
    );

    expect(type).toBe("RESOLUTION");
  });

  test("refuse l agent d une autre equipe : l appartenance ne se deduit pas du role", () => {
    expect(
      code(() =>
        deciderTypePhoto(
          contexte({ role: "AGENT", estAuteur: false, idEquipeAgent: "eq-2", idEquipeAffectee: "eq-1" }),
        ),
      ),
    ).toBe("DROIT_REFUSE");
  });

  test("refuse une preuve sur un dossier qui n est pas en cours", () => {
    expect(
      code(() =>
        deciderTypePhoto(
          contexte({
            role: "AGENT",
            estAuteur: false,
            idEquipeAgent: "eq-1",
            idEquipeAffectee: "eq-1",
            statut: "VALIDE",
          }),
        ),
      ),
    ).toBe("STATUT_INCOMPATIBLE");
  });

  test("refuse une seconde preuve de resolution", () => {
    expect(
      code(() =>
        deciderTypePhoto(
          contexte({
            role: "AGENT",
            estAuteur: false,
            idEquipeAgent: "eq-1",
            idEquipeAffectee: "eq-1",
            photosResolution: MAX_PHOTOS_RESOLUTION,
          }),
        ),
      ),
    ).toBe("CONTRAT_INVALIDE");
  });

  test("refuse un citoyen qui n est pas l auteur : la preuve n est pas ouverte a tous", () => {
    expect(code(() => deciderTypePhoto(contexte({ estAuteur: false })))).toBe("DROIT_REFUSE");
  });

  test("refuse un agent sans equipe, meme sur un dossier en cours", () => {
    expect(
      code(() =>
        deciderTypePhoto(
          contexte({ role: "AGENT", estAuteur: false, idEquipeAgent: null, idEquipeAffectee: "eq-1" }),
        ),
      ),
    ).toBe("DROIT_REFUSE");
  });
});
