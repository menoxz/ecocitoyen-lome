import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { actionPossible, dossiersActionnables, peutCloturer } from "./logique.ts";
import { EcranInterventions } from "./EcranInterventions.tsx";
import type { ClientApi, SignalementApi } from "../../api/client.ts";

const rendu = (element: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(element);

function dossier(surcharge: Partial<SignalementApi> = {}): SignalementApi {
  return {
    id_signalement: "sig-1",
    statut: "EN_COURS",
    niveau_priorite: "NORMALE",
    score_priorite: 3,
    id_quartier: "qrt-be",
    date_signalement: "2026-11-10T08:00:00.000Z",
    sans_photo: false,
    nb_confirmations: 0,
    ...surcharge,
  };
}

/** Client factice : aucune requête réseau, et aucune session (donc le formulaire s'afficherait). */
function clientFactice(): ClientApi {
  const jamais = async () => ({ ok: true as const, valeur: [] as never });
  return {
    base: "/api/v1",
    moi: jamais,
    connexion: jamais,
    inscription: jamais,
    categories: jamais,
    quartiers: jamais,
    creerSignalement: jamais,
    envoyerPhoto: jamais,
    listerInterventions: jamais,
    dossier: jamais,
    demarrer: jamais,
    resoudre: jamais,
  };
}

describe("dossiers actionnables (parcours agent §6)", () => {
  test("ne retient que les interventions en cours", () => {
    const dossiers = [
      dossier({ id_signalement: "a", statut: "EN_COURS" }),
      dossier({ id_signalement: "b", statut: "VALIDE" }),
      dossier({ id_signalement: "c", statut: "RESOLU" }),
      dossier({ id_signalement: "d", statut: "NOUVEAU" }),
    ];

    expect(dossiersActionnables(dossiers).map((d) => d.id_signalement)).toEqual(["a"]);
  });

  test("trie par urgence réelle puis par ancienneté, pas par date de création brute", () => {
    const dossiers = [
      dossier({ id_signalement: "basse-vieille", niveau_priorite: "BASSE", date_signalement: "2026-11-01T08:00:00.000Z" }),
      dossier({ id_signalement: "urgente-recente", niveau_priorite: "URGENTE", date_signalement: "2026-11-12T08:00:00.000Z" }),
      dossier({ id_signalement: "urgente-ancienne", niveau_priorite: "URGENTE", date_signalement: "2026-11-05T08:00:00.000Z" }),
      dossier({ id_signalement: "haute", niveau_priorite: "HAUTE", date_signalement: "2026-11-09T08:00:00.000Z" }),
    ];

    expect(dossiersActionnables(dossiers).map((d) => d.id_signalement)).toEqual([
      "urgente-ancienne",
      "urgente-recente",
      "haute",
      "basse-vieille",
    ]);
  });

  test("accepte une liste vide sans échouer", () => {
    expect(dossiersActionnables([])).toEqual([]);
  });
});

describe("action proposée sur un dossier", () => {
  test("démarrer tant que l intervention n a pas commencé, puis clôturer", () => {
    expect(actionPossible(dossier(), false)).toBe("demarrer");
    expect(actionPossible(dossier(), false) === "demarrer").toBe(true);
  });

  test("clôturer une fois démarrée", () => {
    const d = dossier();
    expect(actionPossible(d, true)).toBe("cloturer");
  });

  test("aucune action hors du statut En cours", () => {
    expect(actionPossible(dossier({ statut: "VALIDE" }), false)).toBe("aucune");
    expect(actionPossible(dossier({ statut: "RESOLU" }), true)).toBe("aucune");
  });
});

describe("clôture avec preuve (CR8)", () => {
  test("refuse sans photographie, en disant pourquoi", () => {
    const decision = peutCloturer("Site nettoyé entièrement", false);
    const raison = decision.ok ? "" : (decision.raison ?? "");

    expect(decision.ok).toBe(false);
    expect(raison).toContain("photographie");
    expect(raison).toContain("obligatoire");
  });

  test("refuse un compte rendu trop court", () => {
    const decision = peutCloturer("fait", true);
    const raison = decision.ok ? "" : (decision.raison ?? "");

    expect(decision.ok).toBe(false);
    expect(raison).toContain("10 caractères");
  });

  test("accepte photo et compte rendu suffisant", () => {
    expect(peutCloturer("Site nettoyé, bacs relevés et transportés", true).ok).toBe(true);
  });
});

describe("écran agent — états", () => {
  test("vérifie la session avant d afficher la file, sans écran vide", () => {
    const html = rendu(<EcranInterventions client={clientFactice()} maintenantIso="2026-11-15T12:00:00.000Z" />);

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Vérification de votre session");
  });

  test("n expose ni identité d auteur ni donnée technique avant chargement", () => {
    const html = rendu(<EcranInterventions client={clientFactice()} maintenantIso="2026-11-15T12:00:00.000Z" />);

    expect(html).not.toContain("id_auteur");
    expect(html).not.toContain("score_ia");
  });
});
