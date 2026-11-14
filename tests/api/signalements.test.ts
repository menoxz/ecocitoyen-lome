import { describe, expect, test } from "bun:test";
import { appelJson, creerCompte, demarrerBanc } from "./aide.ts";

const POSITION = { latitude: 6.1255, longitude: 1.2222 };
const DESCRIPTION = "Tas de déchets plastiques devant le marché, très fréquenté le matin";

let compteur = 0;
function emailUnique(prefixe: string): string {
  compteur += 1;
  return `${prefixe}.${compteur}@example.tg`;
}

async function creerSignalement(
  banc: Awaited<ReturnType<typeof demarrerBanc>>,
  cookie: string,
  surcharge: Record<string, unknown> = {},
): Promise<{ statut: number; corps: Record<string, unknown> }> {
  return appelJson(`${banc.url}/signalements`, {
    methode: "POST",
    cookie,
    corps: {
      id_categorie: "cat-1",
      description: DESCRIPTION,
      nombre_photos: 1,
      ...POSITION,
      ...surcharge,
    },
  });
}

describe("création de signalement", () => {
  test("crée un dossier Nouveau pour un citoyen connecté (T0)", async () => {
    const banc = await demarrerBanc();
    const compte = await creerCompte(banc, { email: emailUnique("createur") });

    const reponse = await creerSignalement(banc, compte.cookie);
    const dossier = reponse.corps.signalement as Record<string, unknown>;

    expect(reponse.statut).toBe(201);
    expect(dossier.statut).toBe("NOUVEAU");
    expect(dossier.id_signalement).toBeString();
    expect(dossier.niveau_priorite).toBeOneOf(["BASSE", "NORMALE", "HAUTE", "URGENTE"]);
    await banc.fermer();
  });

  test("refuse un visiteur non connecté : 401", async () => {
    const banc = await demarrerBanc();
    const reponse = await creerSignalement(banc, "");

    expect(reponse.statut).toBe(401);
    await banc.fermer();
  });

  test("refuse une position hors de la zone pilote (CR11)", async () => {
    const banc = await demarrerBanc();
    const compte = await creerCompte(banc, { email: emailUnique("horszone") });

    const reponse = await creerSignalement(banc, compte.cookie, { latitude: 6.9, longitude: 1.22 });

    expect(reponse.statut).toBe(400);
    expect(reponse.corps.code).toBe("HORS_ZONE");
    await banc.fermer();
  });

  test("refuse une description trop courte", async () => {
    const banc = await demarrerBanc();
    const compte = await creerCompte(banc, { email: emailUnique("courte") });

    const reponse = await creerSignalement(banc, compte.cookie, { description: "court" });

    expect(reponse.statut).toBe(400);
    expect(reponse.corps.code).toBe("DESCRIPTION_INVALIDE");
    await banc.fermer();
  });

  test("refuse une création sans photo, sauf mode dégradé", async () => {
    const banc = await demarrerBanc();
    const compte = await creerCompte(banc, { email: emailUnique("photo") });

    const sansPhoto = await creerSignalement(banc, compte.cookie, { nombre_photos: 0 });
    expect(sansPhoto.statut).toBe(400);
    expect(sansPhoto.corps.code).toBe("PHOTO_MANQUANTE");

    const degrade = await creerSignalement(banc, compte.cookie, { nombre_photos: 0, sans_photo: true });
    expect(degrade.statut).toBe(201);
    expect((degrade.corps.signalement as Record<string, unknown>).sans_photo).toBe(true);
    await banc.fermer();
  });

  test("applique le quota horaire de trois signalements (RG23, 429)", async () => {
    const banc = await demarrerBanc();
    const compte = await creerCompte(banc, { email: emailUnique("quota") });

    const statuts: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      const reponse = await creerSignalement(banc, compte.cookie);
      statuts.push(reponse.statut);
    }

    expect(statuts).toEqual([201, 201, 201, 429]);
    await banc.fermer();
  });

  test("propose les doublons proches de même catégorie (RG04)", async () => {
    const banc = await demarrerBanc();
    const premier = await creerCompte(banc, { email: emailUnique("doublon1") });
    const second = await creerCompte(banc, { email: emailUnique("doublon2") });

    await creerSignalement(banc, premier.cookie);
    const reponse = await creerSignalement(banc, second.cookie, { latitude: POSITION.latitude + 0.0001 });

    const doublons = reponse.corps.doublons as { id_signalement: string; distanceMetres: number }[];
    expect(reponse.statut).toBe(201);
    expect(doublons.length).toBe(1);
    expect(doublons[0].distanceMetres).toBeLessThan(30);
    await banc.fermer();
  });
});

describe("transitions et droits", () => {
  test("refuse à un citoyen la validation d'un dossier (403)", async () => {
    const banc = await demarrerBanc();
    const citoyen = await creerCompte(banc, { email: emailUnique("citoyen403") });
    const creation = await creerSignalement(banc, citoyen.cookie);
    const id = (creation.corps.signalement as { id_signalement: string }).id_signalement;

    const reponse = await appelJson(`${banc.url}/signalements/${id}/valider`, {
      methode: "POST",
      cookie: citoyen.cookie,
      corps: { id_categorie: "cat-1", niveau_priorite: "HAUTE" },
    });

    expect(reponse.statut).toBe(403);
    expect(reponse.corps.code).toBe("DROIT_REFUSE");
    await banc.fermer();
  });

  test("valide un dossier en tant que superviseur et journalise l'action (T1, RB08)", async () => {
    const banc = await demarrerBanc();
    const citoyen = await creerCompte(banc, { email: emailUnique("t1citoyen") });
    const superviseur = await creerCompte(banc, { email: emailUnique("t1sup"), role: "SUPERVISEUR" });
    const creation = await creerSignalement(banc, citoyen.cookie);
    const id = (creation.corps.signalement as { id_signalement: string }).id_signalement;

    const reponse = await appelJson(`${banc.url}/signalements/${id}/valider`, {
      methode: "POST",
      cookie: superviseur.cookie,
      corps: { id_categorie: "cat-1", niveau_priorite: "HAUTE", commentaire: "Confirmé sur place" },
    });

    expect(reponse.statut).toBe(200);
    expect(reponse.corps.statut).toBe("VALIDE");
    expect(reponse.corps.date_validation).toBeString();

    const journal = banc.deps.journal.lister({ action: "signalement.validation" });
    expect(journal.length).toBe(1);
    expect(journal[0].cible).toBe(id);
    expect(journal[0].avant).toBe("NOUVEAU");
    expect(journal[0].apres).toBe("VALIDE");
    await banc.fermer();
  });

  test("refuse une transition non prévue : valider deux fois (CR10, 409)", async () => {
    const banc = await demarrerBanc();
    const citoyen = await creerCompte(banc, { email: emailUnique("cr10citoyen") });
    const superviseur = await creerCompte(banc, { email: emailUnique("cr10sup"), role: "SUPERVISEUR" });
    const creation = await creerSignalement(banc, citoyen.cookie);
    const id = (creation.corps.signalement as { id_signalement: string }).id_signalement;

    const premiere = await appelJson(`${banc.url}/signalements/${id}/valider`, {
      methode: "POST",
      cookie: superviseur.cookie,
      corps: { id_categorie: "cat-1", niveau_priorite: "NORMALE" },
    });
    const seconde = await appelJson(`${banc.url}/signalements/${id}/valider`, {
      methode: "POST",
      cookie: superviseur.cookie,
      corps: { id_categorie: "cat-1", niveau_priorite: "NORMALE" },
    });

    expect(premiere.statut).toBe(200);
    expect(seconde.statut).toBe(409);
    expect(seconde.corps.code).toBe("TRANSITION_INTERDITE");
    await banc.fermer();
  });

  test("refuse un rejet sans motif (CR5)", async () => {
    const banc = await demarrerBanc();
    const citoyen = await creerCompte(banc, { email: emailUnique("cr5citoyen") });
    const superviseur = await creerCompte(banc, { email: emailUnique("cr5sup"), role: "SUPERVISEUR" });
    const creation = await creerSignalement(banc, citoyen.cookie);
    const id = (creation.corps.signalement as { id_signalement: string }).id_signalement;

    const reponse = await appelJson(`${banc.url}/signalements/${id}/rejeter`, {
      methode: "POST",
      cookie: superviseur.cookie,
      corps: { commentaire: "Sans motif explicite" },
    });

    expect(reponse.statut).toBe(400);
    expect(reponse.corps.code).toBe("MOTIF_REQUIS");
    await banc.fermer();
  });

  test("cache un dossier Nouveau à un autre citoyen (404, RG28)", async () => {
    const banc = await demarrerBanc();
    const auteur = await creerCompte(banc, { email: emailUnique("auteur") });
    const autre = await creerCompte(banc, { email: emailUnique("autre") });
    const creation = await creerSignalement(banc, auteur.cookie);
    const id = (creation.corps.signalement as { id_signalement: string }).id_signalement;

    const parAuteur = await appelJson(`${banc.url}/signalements/${id}`, { cookie: auteur.cookie });
    const parAutre = await appelJson(`${banc.url}/signalements/${id}`, { cookie: autre.cookie });
    const anonyme = await appelJson(`${banc.url}/signalements/${id}`);

    expect(parAuteur.statut).toBe(200);
    expect(parAutre.statut).toBe(404);
    expect(anonyme.statut).toBe(404);
    await banc.fermer();
  });

  test("n'expose pas l'identité de l'auteur à un citoyen, mais la donne au superviseur", async () => {
    const banc = await demarrerBanc();
    const citoyen = await creerCompte(banc, { email: emailUnique("identiteCitoyen") });
    const superviseur = await creerCompte(banc, { email: emailUnique("identiteSup"), role: "SUPERVISEUR" });
    const creation = await creerSignalement(banc, citoyen.cookie);
    const id = (creation.corps.signalement as { id_signalement: string }).id_signalement;

    await appelJson(`${banc.url}/signalements/${id}/valider`, {
      methode: "POST",
      cookie: superviseur.cookie,
      corps: { id_categorie: "cat-1", niveau_priorite: "NORMALE" },
    });

    const vuParCitoyen = await appelJson(`${banc.url}/signalements/${id}`, { cookie: citoyen.cookie });
    const vuParSuperviseur = await appelJson(`${banc.url}/signalements/${id}`, { cookie: superviseur.cookie });
    const vuParVisiteur = await appelJson(`${banc.url}/signalements/${id}`);

    expect(vuParCitoyen.corps.id_auteur).toBeUndefined();
    expect(vuParVisiteur.corps.id_auteur).toBeUndefined();
    expect(vuParSuperviseur.corps.id_auteur).toBe(citoyen.idUtilisateur);
    await banc.fermer();
  });
});
