import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  actionPossible,
  construireEntreeCloture,
  dossiersActionnables,
  peutCloturer,
  type PhotoPreuve,
} from "./logique.ts";
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

/** Fichier réel choisi par l'agent : un Blob, pas un booléen déclaratif. */
function photo(octets = 1024, typeMime = "image/jpeg"): PhotoPreuve {
  return {
    octets: new Blob([new Uint8Array(octets)], { type: typeMime }),
    nom: "site-nettoye.jpg",
    typeMime,
  };
}

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
    listerDossiers: jamais,
    priorites: jamais,
    motifsRejet: jamais,
    historique: jamais,
    confirmer: jamais,
    valider: jamais,
    rejeter: jamais,
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

  test("trie par urgence réelle puis par ancienneté", () => {
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
    expect(actionPossible(dossier(), true)).toBe("cloturer");
  });

  test("aucune action hors du statut En cours", () => {
    expect(actionPossible(dossier({ statut: "VALIDE" }), false)).toBe("aucune");
    expect(actionPossible(dossier({ statut: "RESOLU" }), true)).toBe("aucune");
  });
});

describe("clôture avec preuve réelle (CR8)", () => {
  test("refuse sans fichier, en disant pourquoi", () => {
    const decision = peutCloturer("Site nettoyé entièrement", null);
    const raison = decision.ok ? "" : (decision.raison ?? "");

    expect(decision.ok).toBe(false);
    expect(raison).toContain("photographie");
    expect(raison).toContain("obligatoire");
  });

  test("refuse un fichier vide : une photo de zéro octet n'est pas une preuve", () => {
    const decision = peutCloturer("Site nettoyé entièrement", photo(0));

    expect(decision.ok).toBe(false);
  });

  test("refuse un fichier qui n'est pas une image", () => {
    const decision = peutCloturer("Site nettoyé entièrement", photo(1024, "application/pdf"));
    const raison = decision.ok ? "" : (decision.raison ?? "");

    expect(decision.ok).toBe(false);
    expect(raison).toContain("image");
  });

  test("refuse un compte rendu trop court", () => {
    const decision = peutCloturer("fait", photo());
    const raison = decision.ok ? "" : (decision.raison ?? "");

    expect(decision.ok).toBe(false);
    expect(raison).toContain("10 caractères");
  });

  test("accepte fichier image et compte rendu suffisant", () => {
    expect(peutCloturer("Site nettoyé, bacs relevés et transportés", photo()).ok).toBe(true);
  });
});

describe("entrée de clôture construite depuis le média du serveur", () => {
  test("reprend le chemin renvoyé par le serveur, jamais un chemin forgé", () => {
    const entree = construireEntreeCloture("  Site nettoyé, bacs relevés  ", {
      chemin: "2026/11/photo-abc.webp",
      mime: "image/webp",
      tailleOctets: 184320,
    });

    expect(entree.photo.chemin).toBe("2026/11/photo-abc.webp");
    expect(entree.photo.mime).toBe("image/webp");
    expect(entree.photo.taille_octets).toBe(184320);
    expect(entree.commentaire).toBe("Site nettoyé, bacs relevés");
  });

  test("refuse de construire sans média plutôt que de clôturer sans preuve", () => {
    expect(() => construireEntreeCloture("Site nettoyé", null)).toThrow();
    expect(() =>
      construireEntreeCloture("Site nettoyé", { chemin: "  ", mime: "image/webp", tailleOctets: 10 }),
    ).toThrow();
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
