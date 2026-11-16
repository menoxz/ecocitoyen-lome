import { describe, expect, test } from "bun:test";
import type { EtapeHistoriqueApi } from "../../api/client.ts";
import { etapesLisibles, idDuFragment, libelleStatut } from "./logique.ts";

const etape = (surcharge: Partial<EtapeHistoriqueApi>): EtapeHistoriqueApi => ({
  ancien_statut: "NOUVEAU",
  nouveau_statut: "VALIDE",
  date_changement: "2026-11-15T08:00:00.000Z",
  commentaire: null,
  ...surcharge,
});

describe("identifiant de dossier dans l'adresse", () => {
  test("lit un identifiant après dossier", () => {
    expect(idDuFragment("#/dossier/sig-42")).toBe("sig-42");
    expect(idDuFragment("#dossier/sig-42")).toBe("sig-42");
    expect(idDuFragment("#/dossier/sig-42?x=1")).toBe("sig-42");
  });

  test("ne devine rien quand l'adresse ne désigne pas de dossier", () => {
    expect(idDuFragment("#/signaler")).toBeNull();
    expect(idDuFragment("#/dossier")).toBeNull();
    expect(idDuFragment("")).toBeNull();
  });
});

describe("étapes lisibles", () => {
  test("la première étape est la création, sans état précédent", () => {
    const [creation] = etapesLisibles([etape({ ancien_statut: null, nouveau_statut: "NOUVEAU", commentaire: "Signalement créé" })]);
    expect(creation.titre).toBe("Dossier créé (Nouveau)");
    expect(creation.detail).toBe("Signalement créé");
  });

  test("une transition se lit avec ses deux états", () => {
    const [transition] = etapesLisibles([etape({ ancien_statut: "NOUVEAU", nouveau_statut: "VALIDE" })]);
    expect(transition.titre).toBe("Nouveau → Validé");
  });

  test("un commentaire absent n'est pas remplacé par un texte inventé", () => {
    const [sansMotif] = etapesLisibles([etape({ commentaire: null })]);
    expect(sansMotif.detail).toBe("");
  });

  test("aucune étape inventée quand l'historique est vide", () => {
    expect(etapesLisibles([])).toEqual([]);
  });
});

describe("libellés de statut", () => {
  test("traduit les statuts du dossier et laisse passer l'inconnu", () => {
    expect(libelleStatut("EN_COURS")).toBe("En cours");
    expect(libelleStatut("REJETE")).toBe("Rejeté");
    expect(libelleStatut("INCONNU")).toBe("INCONNU");
  });
});
