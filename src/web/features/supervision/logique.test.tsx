import { describe, expect, test } from "bun:test";
import type { SignalementApi } from "../../api/client.ts";
import {
  construireRejet,
  construireValidation,
  dossiersATrier,
  libellePriorite,
  peutRejeter,
  peutValider,
} from "./logique.ts";

const dossier = (surcharge: Partial<SignalementApi>): SignalementApi => ({
  id_signalement: "sig-1",
  statut: "NOUVEAU",
  niveau_priorite: "NORMALE",
  score_priorite: 3,
  id_quartier: "qrt-tokoin",
  date_signalement: "2026-11-15T08:00:00.000Z",
  sans_photo: false,
  nb_confirmations: 0,
  ...surcharge,
});

describe("file de tri du superviseur", () => {
  test("ne garde que les dossiers qui attendent une décision", () => {
    const file = dossiersATrier([
      dossier({ id_signalement: "nouveau" }),
      dossier({ id_signalement: "valide", statut: "VALIDE" }),
      dossier({ id_signalement: "encours", statut: "EN_COURS" }),
      dossier({ id_signalement: "rejete", statut: "REJETE" }),
    ]);
    expect(file.map((d) => d.id_signalement)).toEqual(["nouveau"]);
  });

  test("l'urgence passe avant l'ancienneté, l'ancienneté tranche à urgence égale", () => {
    const file = dossiersATrier([
      dossier({ id_signalement: "basse-ancienne", niveau_priorite: "BASSE", date_signalement: "2026-11-01T08:00:00.000Z" }),
      dossier({ id_signalement: "urgente-recente", niveau_priorite: "URGENTE", date_signalement: "2026-11-14T08:00:00.000Z" }),
      dossier({ id_signalement: "urgente-ancienne", niveau_priorite: "URGENTE", date_signalement: "2026-11-02T08:00:00.000Z" }),
    ]);
    expect(file.map((d) => d.id_signalement)).toEqual(["urgente-ancienne", "urgente-recente", "basse-ancienne"]);
  });

  test("la liste d'origine n'est pas modifiée", () => {
    const origine = [dossier({ id_signalement: "a", niveau_priorite: "BASSE" }), dossier({ id_signalement: "b", niveau_priorite: "URGENTE" })];
    dossiersATrier(origine);
    expect(origine.map((d) => d.id_signalement)).toEqual(["a", "b"]);
  });
});

describe("décision de validation", () => {
  test("refuse une priorité vide et dit pourquoi", () => {
    const decision = peutValider("  ");
    expect(decision.ok).toBe(false);
    expect(decision.raison).toContain("priorité");
  });

  test("accepte une priorité choisie", () => {
    expect(peutValider("HAUTE").ok).toBe(true);
  });

  test("n'envoie pas de champ vide au serveur", () => {
    expect(construireValidation("HAUTE", "   ", "cat-dechets")).toEqual({
      id_categorie: "cat-dechets",
      niveau_priorite: "HAUTE",
    });
  });

  test("transmet le commentaire nettoyé quand il existe", () => {
    expect(construireValidation("NORMALE", "  Dépôt confirmé sur place.  ")).toEqual({
      niveau_priorite: "NORMALE",
      commentaire: "Dépôt confirmé sur place.",
    });
  });
});

describe("décision de rejet", () => {
  test("refuse l'absence de motif", () => {
    expect(peutRejeter("", "peu importe").ok).toBe(false);
  });

  test("refuse « Autre » sans explication suffisante", () => {
    const decision = peutRejeter("Autre", "court");
    expect(decision.ok).toBe(false);
    expect(decision.raison).toContain("10 caractères");
  });

  test("accepte un motif explicite même sans commentaire", () => {
    expect(peutRejeter("Doublon", "").ok).toBe(true);
  });

  test("le motif part toujours, le commentaire seulement s'il est renseigné", () => {
    expect(construireRejet("Doublon", "  ")).toEqual({ motif_rejet: "Doublon" });
    expect(construireRejet("Hors zone", " Adresse hors commune. ")).toEqual({
      motif_rejet: "Hors zone",
      commentaire: "Adresse hors commune.",
    });
  });
});

describe("affichage des priorités", () => {
  test("traduit les valeurs du serveur et laisse passer l'inconnue", () => {
    expect(libellePriorite("URGENTE")).toBe("Urgente");
    expect(libellePriorite("HAUTE")).toBe("Haute");
    expect(libellePriorite("INCONNUE")).toBe("INCONNUE");
  });
});
