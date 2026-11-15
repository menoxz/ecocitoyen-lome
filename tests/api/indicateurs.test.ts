import { describe, expect, test } from "bun:test";
import { appelJson, creerCompte, demarrerBanc, type Banc } from "./aide.ts";
import type { Signalement, Statut } from "@domaine/signalement/signalement.type.ts";

let compteur = 0;
function email(prefixe: string): string {
  compteur += 1;
  return `${prefixe}.${compteur}@example.tg`;
}

/** Les 22 dossiers de démonstration fausseraient un calcul manuel : on part d'une base vide. */
function viderDossiers(banc: Banc): void {
  banc.base.exec("DELETE FROM confirmation");
  banc.base.exec("DELETE FROM media");
  banc.base.exec("DELETE FROM historique_statut");
  banc.base.exec("DELETE FROM intervention");
  banc.base.exec("DELETE FROM signalement");
}

interface Modele {
  readonly id: string;
  readonly statut: Statut;
  readonly priorite: Signalement["niveauPriorite"];
  readonly quartier: string;
  readonly dateSignalement: string;
  readonly dateValidation: string | null;
  readonly dateAffectation: string | null;
  readonly dateResolution: string | null;
}

/**
 * Jeu de référence dont chaque résultat est calculé à la main (§13, CR14).
 * Total 6 dossiers : 3 résolus, 1 validé, 1 rejeté, 1 nouveau.
 */
const MODELES: readonly Modele[] = [
  {
    id: "sig-ref-1",
    statut: "RESOLU",
    priorite: "URGENTE",
    quartier: "qrt-be",
    dateSignalement: "2026-01-01T00:00:00.000Z",
    dateValidation: "2026-01-01T06:00:00.000Z",
    dateAffectation: "2026-01-01T12:00:00.000Z",
    dateResolution: "2026-01-02T00:00:00.000Z",
  },
  {
    id: "sig-ref-2",
    statut: "RESOLU",
    priorite: "HAUTE",
    quartier: "qrt-be",
    dateSignalement: "2026-01-01T00:00:00.000Z",
    dateValidation: "2026-01-02T00:00:00.000Z",
    dateAffectation: "2026-01-03T00:00:00.000Z",
    dateResolution: "2026-01-04T00:00:00.000Z",
  },
  {
    id: "sig-ref-3",
    statut: "RESOLU",
    priorite: "NORMALE",
    quartier: "qrt-tokoin",
    dateSignalement: "2026-01-01T00:00:00.000Z",
    dateValidation: "2026-01-04T00:00:00.000Z",
    dateAffectation: "2026-01-05T00:00:00.000Z",
    dateResolution: "2026-01-20T00:00:00.000Z",
  },
  {
    id: "sig-ref-4",
    statut: "NOUVEAU",
    priorite: "BASSE",
    quartier: "qrt-kodjoviakope",
    dateSignalement: "2026-01-01T00:00:00.000Z",
    dateValidation: null,
    dateAffectation: null,
    dateResolution: null,
  },
  {
    id: "sig-ref-5",
    statut: "REJETE",
    priorite: "BASSE",
    quartier: "qrt-tokoin",
    dateSignalement: "2026-01-01T00:00:00.000Z",
    dateValidation: null,
    dateAffectation: null,
    dateResolution: null,
  },
  {
    id: "sig-ref-6",
    statut: "VALIDE",
    priorite: "BASSE",
    quartier: "qrt-be",
    dateSignalement: "2026-01-01T00:00:00.000Z",
    dateValidation: "2026-01-02T00:00:00.000Z",
    dateAffectation: null,
    dateResolution: null,
  },
];

function dossierDeTest(modele: Modele, idAuteur: string): Signalement {
  return {
    idSignalement: modele.id,
    idAuteur,
    idCategorie: "cat-1",
    idQuartier: modele.quartier,
    latitude: 6.1255,
    longitude: 1.2222,
    description: "Dossier de référence pour le calcul manuel des indicateurs",
    statut: modele.statut,
    niveauPriorite: modele.priorite,
    scorePriorite: 3,
    sansPhoto: false,
    nbConfirmations: 0,
    idCategorieIa: null,
    scoreIa: null,
    modeIa: "AUCUN",
    iaDesaccord: false,
    motifRejet: modele.statut === "REJETE" ? "Doublon" : null,
    dateSignalement: modele.dateSignalement,
    dateValidation: modele.dateValidation,
    dateAffectation: modele.dateAffectation,
    dateResolution: modele.dateResolution,
    dateMiseAJour: modele.dateSignalement,
  };
}

async function bancAvecReferences(): Promise<{ banc: Banc; cookie: string }> {
  const banc = await demarrerBanc();
  viderDossiers(banc);
  const superviseur = await creerCompte(banc, { email: email("indic"), role: "SUPERVISEUR" });

  for (const modele of MODELES) {
    banc.deps.signalements.creer(dossierDeTest(modele, superviseur.idUtilisateur), {
      idHistorique: `hist-${modele.id}`,
      idSignalement: modele.id,
      ancienStatut: null,
      nouveauStatut: "NOUVEAU",
      idAuteur: superviseur.idUtilisateur,
      dateChangement: modele.dateSignalement,
      commentaire: "Création de référence",
    });
  }

  return { banc, cookie: superviseur.cookie };
}

describe("indicateurs calculés (§13, CR14)", () => {
  test("retrouve exactement les valeurs du calcul manuel", async () => {
    const { banc, cookie } = await bancAvecReferences();

    const reponse = await appelJson(`${banc.url}/indicateurs/synthese`, { cookie });
    const corps = reponse.corps;

    expect(reponse.statut).toBe(200);
    expect(corps.total).toBe(6);
    // 3 résolus ÷ 4 dossiers décidés (Validé + En cours + Résolu + Rouvert)
    expect(corps.tauxResolution).toBe(75);
    // 1 rejeté ÷ 5 décidés, rejets compris
    expect(corps.tauxRejet).toBe(20);
    // (6 + 24 + 72 + 24) ÷ 4 = 31,5
    expect(corps.delaiMoyenTriHeures).toBe(31.5);
    // (18 + 48 + 384) ÷ 3 = 150
    expect(corps.delaiMoyenTraitementHeures).toBe(150);
    expect(corps.respectDelais).toEqual({ tri: 75, affectation: 100, resolution: 67 });
    // 3 quartiers atteints sur 12 quartiers actifs = 25 %
    expect(corps.couvertureGeographique).toBe(25);
    await banc.fermer();
  });

  test("décompose les volumes par statut, catégorie, quartier et priorité", async () => {
    const { banc, cookie } = await bancAvecReferences();

    const reponse = await appelJson(`${banc.url}/indicateurs/synthese`, { cookie });
    const corps = reponse.corps as {
      volumes: Record<string, number>;
      parQuartier: { idQuartier: string; nombre: number }[];
      parPriorite: { priorite: string; nombre: number }[];
    };

    expect(corps.volumes.RESOLU).toBe(3);
    expect(corps.volumes.REJETE).toBe(1);
    expect(corps.volumes.NOUVEAU).toBe(1);
    expect(corps.volumes.VALIDE).toBe(1);
    expect(corps.volumes.EN_COURS).toBe(0);
    expect(corps.volumes.ROUVERT).toBe(0);

    const be = corps.parQuartier.find((q) => q.idQuartier === "qrt-be");
    expect(be?.nombre).toBe(3);
    expect(corps.parPriorite.find((p) => p.priorite === "URGENTE")?.nombre).toBe(1);
    await banc.fermer();
  });

  test("déclare un indicateur non mesurable au lieu d'inventer une valeur", async () => {
    const banc = await demarrerBanc();
    viderDossiers(banc);
    const superviseur = await creerCompte(banc, { email: email("vide"), role: "SUPERVISEUR" });

    const reponse = await appelJson(`${banc.url}/indicateurs/synthese`, { cookie: superviseur.cookie });
    const corps = reponse.corps as { tauxResolution: number | null; indisponibles: string[] };

    expect(corps.tauxResolution).toBeNull();
    expect(corps.indisponibles.length).toBeGreaterThan(0);
    expect(corps.indisponibles.join(" ")).toContain("taux_resolution");
    await banc.fermer();
  });

  test("n'expose aucun chiffre constant quand la donnée est absente", async () => {
    const banc = await demarrerBanc();
    viderDossiers(banc);
    const superviseur = await creerCompte(banc, { email: email("const"), role: "SUPERVISEUR" });

    const reponse = await appelJson(`${banc.url}/indicateurs/synthese`, { cookie: superviseur.cookie });
    const corps = reponse.corps as Record<string, unknown>;

    expect(corps.tauxResolution).not.toBe(88);
    expect(corps.respectDelais).toEqual({ tri: null, affectation: null, resolution: null });
    expect((corps.qualiteIa as { tauxAccord: number | null }).tauxAccord).toBeNull();
    expect((corps.qualiteIa as { scoreMoyen: number | null }).scoreMoyen).toBeNull();
    await banc.fermer();
  });

  test("réserve la synthèse à la supervision", async () => {
    const banc = await demarrerBanc();
    const citoyen = await creerCompte(banc, { email: email("interdit") });

    const reponse = await appelJson(`${banc.url}/indicateurs/synthese`, { cookie: citoyen.cookie });
    const anonyme = await appelJson(`${banc.url}/indicateurs/synthese`);

    expect(reponse.statut).toBe(403);
    expect(reponse.corps.code).toBe("DROIT_REFUSE");
    expect(anonyme.statut).toBe(401);
    await banc.fermer();
  });

  test("utilise les délais cibles du référentiel, pas une constante", async () => {
    const { banc, cookie } = await bancAvecReferences();

    // Délai de tri ramené à 1 heure pour toutes les priorités : plus aucun tri n'est dans les temps
    // sauf le dossier 1 (6 h > 1 h, donc 0 %). On vérifie que le calcul suit le paramètre.
    for (const priorite of ["URGENTE", "HAUTE", "NORMALE", "BASSE"]) {
      banc.deps.referentiel.ecrireParametre(`sla.${priorite}.tri`, "1");
    }

    const reponse = await appelJson(`${banc.url}/indicateurs/synthese`, { cookie });
    const respect = (reponse.corps.respectDelais as { tri: number | null }).tri;

    expect(respect).toBe(0);
    await banc.fermer();
  });
});
