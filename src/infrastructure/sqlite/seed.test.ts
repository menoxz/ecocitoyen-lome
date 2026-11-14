import { describe, expect, test } from "bun:test";
import { preparerBase } from "./base.ts";
import { seedDemonstration } from "./seed.ts";
import { creerDepotSignalements } from "./depot-signalements.sqlite.ts";
import { creerDepotReferentiel } from "./depot-referentiel.sqlite.ts";
import { STATUTS } from "@domaine/signalement/signalement.type.ts";

const MAINTENANT = "2026-11-14T00:00:00.000Z";

describe("seed de démonstration", () => {
  test("charge le référentiel, les comptes et les vingt-deux dossiers", () => {
    const base = preparerBase({ chemin: ":memory:" });
    const compteurs = seedDemonstration(base, MAINTENANT);

    expect(compteurs).not.toBeNull();
    expect(compteurs?.communes).toBe(1);
    expect(compteurs?.quartiers).toBe(12);
    expect(compteurs?.categories).toBe(5);
    expect(compteurs?.equipes).toBe(4);
    expect(compteurs?.comptes).toBe(6);
    expect(compteurs?.signalements).toBe(22);
    expect(compteurs?.parametres).toBe(18);
    base.close();
  });

  test("ne fait rien au second appel (idempotent)", () => {
    const base = preparerBase({ chemin: ":memory:" });
    seedDemonstration(base, MAINTENANT);

    expect(seedDemonstration(base, MAINTENANT)).toBeNull();
    expect(creerDepotSignalements(base).lister({ limite: 500 }).length).toBe(22);
    base.close();
  });

  test("couvre les six statuts du cycle de vie", () => {
    const base = preparerBase({ chemin: ":memory:" });
    seedDemonstration(base, MAINTENANT);
    const depot = creerDepotSignalements(base);

    for (const statut of STATUTS) {
      expect(depot.lister({ statut, limite: 500 }).length).toBeGreaterThan(0);
    }
    base.close();
  });

  test("écrit un motif pour chaque rejet et une date de décision pour chaque dossier décidé", () => {
    const base = preparerBase({ chemin: ":memory:" });
    seedDemonstration(base, MAINTENANT);
    const depot = creerDepotSignalements(base);
    const dossiers = depot.lister({ limite: 500 });

    for (const dossier of dossiers) {
      if (dossier.statut === "REJETE") {
        expect(dossier.motifRejet).not.toBeNull();
      }
      if (["VALIDE", "EN_COURS", "RESOLU", "ROUVERT"].includes(dossier.statut)) {
        expect(dossier.dateValidation).not.toBeNull();
      }
    }
    base.close();
  });

  test("raconte une histoire cohérente dans l historique de chaque dossier", () => {
    const base = preparerBase({ chemin: ":memory:" });
    seedDemonstration(base, MAINTENANT);
    const depot = creerDepotSignalements(base);

    for (const dossier of depot.lister({ limite: 500 })) {
      const historique = depot.historiqueDe(dossier.idSignalement);
      expect(historique.length).toBeGreaterThanOrEqual(1);
      expect(historique[0].ancienStatut).toBeNull();
      expect(historique[0].nouveauStatut).toBe("NOUVEAU");
      expect(historique[historique.length - 1].nouveauStatut).toBe(dossier.statut);
      // Les dates montent : une histoire ne remonte jamais le temps.
      for (let i = 1; i < historique.length; i += 1) {
        expect(Date.parse(historique[i].dateChangement)).toBeGreaterThanOrEqual(
          Date.parse(historique[i - 1].dateChangement),
        );
      }
    }
    base.close();
  });

  test("crée une intervention pour chaque dossier en cours ou traité", () => {
    const base = preparerBase({ chemin: ":memory:" });
    seedDemonstration(base, MAINTENANT);
    const depot = creerDepotSignalements(base);

    for (const dossier of depot.lister({ limite: 500 })) {
      const interventions = depot.interventionsDe(dossier.idSignalement);
      if (["EN_COURS", "RESOLU", "ROUVERT"].includes(dossier.statut)) {
        expect(interventions.length).toBe(1);
      } else {
        expect(interventions.length).toBe(0);
      }
    }
    base.close();
  });

  test("peuple les paramètres attendus par le domaine", () => {
    const base = preparerBase({ chemin: ":memory:" });
    seedDemonstration(base, MAINTENANT);
    const referentiel = creerDepotReferentiel(base);

    expect(referentiel.parametre("doublon.rayonMetres")).toBe("30");
    expect(referentiel.parametre("doublon.fenetreJours")).toBe("30");
    expect(referentiel.parametre("contestation.jours")).toBe("7");
    expect(referentiel.parametre("sla.URGENTE.tri")).toBe("12");
    expect(referentiel.parametre("sla.URGENTE.resolution")).toBe("72");
    base.close();
  });
});
