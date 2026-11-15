import { describe, expect, test } from "bun:test";
import sharp from "sharp";
import { appelJson, creerCompte, demarrerBanc, type Banc } from "./aide.ts";

const POSITION = { latitude: 6.1255, longitude: 1.2222 };
const DESCRIPTION = "Dépôt de déchets plastiques devant le marché, à traiter cette semaine";

let compteur = 0;
function email(prefixe: string): string {
  compteur += 1;
  return `${prefixe}.${compteur}@example.tg`;
}

async function photoJpeg(): Promise<Buffer> {
  return sharp({ create: { width: 48, height: 36, channels: 3, background: { r: 180, g: 90, b: 30 } } })
    .jpeg()
    .toBuffer();
}

/** Crée un dossier en mode dégradé, pour pouvoir y ajouter une photo ensuite. */
async function dossierSansPhoto(banc: Banc, cookie: string): Promise<string> {
  const creation = await appelJson(`${banc.url}/signalements`, {
    methode: "POST",
    cookie,
    corps: {
      id_categorie: "cat-1",
      description: DESCRIPTION,
      nombre_photos: 0,
      sans_photo: true,
      ...POSITION,
    },
  });
  expect(creation.statut).toBe(201);
  return (creation.corps.signalement as { id_signalement: string }).id_signalement;
}

async function posterPhoto(
  banc: Banc,
  id: string,
  cookie: string,
  octets: Buffer,
  mime = "image/jpeg",
): Promise<{ statut: number; corps: Record<string, unknown> }> {
  const reponse = await fetch(`${banc.url}/signalements/${id}/photos`, {
    method: "POST",
    headers: { "content-type": mime, cookie },
    body: new Uint8Array(octets),
  });
  const texte = await reponse.text();
  return { statut: reponse.status, corps: texte ? (JSON.parse(texte) as Record<string, unknown>) : {} };
}

describe("photos sur disque (ENF08, Z-09)", () => {
  test("enregistre une photo et enfile la classification", async () => {
    const banc = await demarrerBanc();
    const citoyen = await creerCompte(banc, { email: email("photo") });
    const id = await dossierSansPhoto(banc, citoyen.cookie);

    const reponse = await posterPhoto(banc, id, citoyen.cookie, await photoJpeg());

    expect(reponse.statut).toBe(201);
    expect(reponse.corps.classification_enfilee).toBe(true);

    const media = reponse.corps.media as { chemin: string; mime: string; taille_octets: number };
    expect(media.chemin).toMatch(/^2026\/11\/photo-[0-9a-f-]{36}\.webp$/);
    expect(media.mime).toBe("image/webp");
    expect(media.taille_octets).toBeGreaterThan(0);

    expect(banc.deps.signalements.mediasDe(id).length).toBe(1);
    expect(banc.deps.travaux.compterEnAttente()).toBe(1);
    await banc.fermer();
  });

  test("refuse un faux fichier image, quel que soit le type annoncé", async () => {
    const banc = await demarrerBanc();
    const citoyen = await creerCompte(banc, { email: email("faux") });
    const id = await dossierSansPhoto(banc, citoyen.cookie);

    const reponse = await posterPhoto(banc, id, citoyen.cookie, Buffer.from("<html>alert(1)</html>"));

    expect(reponse.statut).toBe(400);
    expect(reponse.corps.code).toBe("PHOTO_INVALIDE");
    expect(banc.deps.signalements.mediasDe(id).length).toBe(0);
    await banc.fermer();
  });

  test("refuse l'ajout par un autre utilisateur que l'auteur", async () => {
    const banc = await demarrerBanc();
    const auteur = await creerCompte(banc, { email: email("auteurPhoto") });
    const autre = await creerCompte(banc, { email: email("autrePhoto") });
    const id = await dossierSansPhoto(banc, auteur.cookie);

    const reponse = await posterPhoto(banc, id, autre.cookie, await photoJpeg());

    expect(reponse.statut).toBe(403);
    await banc.fermer();
  });

  test("plafonne à trois photos par signalement", async () => {
    const banc = await demarrerBanc();
    const citoyen = await creerCompte(banc, { email: email("trois") });
    const id = await dossierSansPhoto(banc, citoyen.cookie);
    const photo = await photoJpeg();

    const statuts: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      statuts.push((await posterPhoto(banc, id, citoyen.cookie, photo)).statut);
    }

    expect(statuts).toEqual([201, 201, 201, 400]);
    await banc.fermer();
  });
});

describe("classification asynchrone (CR13, RG18)", () => {
  test("classe le dossier en simulation, avec mention affichable", async () => {
    const banc = await demarrerBanc();
    const citoyen = await creerCompte(banc, { email: email("ia-citoyen") });
    const admin = await creerCompte(banc, { email: email("ia-admin"), role: "ADMIN" });
    const id = await dossierSansPhoto(banc, citoyen.cookie);
    await posterPhoto(banc, id, citoyen.cookie, await photoJpeg());

    const tick = await appelJson(`${banc.url}/ia/tick`, { methode: "POST", cookie: admin.cookie });
    expect(tick.statut).toBe(200);
    expect(tick.corps.traitees).toBe(1);

    const dossier = banc.deps.signalements.parId(id);
    expect(dossier?.modeIa).toBe("SIMULATION");
    expect(dossier?.idCategorieIa).not.toBeNull();
    expect(dossier?.scoreIa).toBeGreaterThan(0);

    const classification = await appelJson(`${banc.url}/signalements/${id}/classification`, {
      cookie: citoyen.cookie,
    });
    expect(classification.statut).toBe(200);
    expect(classification.corps.mode_ia).toBe("SIMULATION");
    expect(classification.corps.simulation_notice).toContain("simulée");
    await banc.fermer();
  });

  test("ne reclasse pas deux fois le même dossier", async () => {
    const banc = await demarrerBanc();
    const citoyen = await creerCompte(banc, { email: email("idem-citoyen") });
    const admin = await creerCompte(banc, { email: email("idem-admin"), role: "ADMIN" });
    const id = await dossierSansPhoto(banc, citoyen.cookie);
    await posterPhoto(banc, id, citoyen.cookie, await photoJpeg());

    const premier = await appelJson(`${banc.url}/ia/tick`, { methode: "POST", cookie: admin.cookie });
    const second = await appelJson(`${banc.url}/ia/tick`, { methode: "POST", cookie: admin.cookie });

    expect(premier.corps.traitees).toBe(1);
    expect(second.corps.traitees).toBe(0);
    expect(banc.deps.travaux.compterEnAttente()).toBe(0);
    await banc.fermer();
  });

  test("réserve le déclenchement à l'administrateur", async () => {
    const banc = await demarrerBanc();
    const citoyen = await creerCompte(banc, { email: email("tick-citoyen") });

    const reponse = await appelJson(`${banc.url}/ia/tick`, { methode: "POST", cookie: citoyen.cookie });

    expect(reponse.statut).toBe(403);
    expect(reponse.corps.code).toBe("DROIT_REFUSE");
    await banc.fermer();
  });

  test("accepte un signalement même sans photo classifiable (CR13)", async () => {
    const banc = await demarrerBanc();
    const citoyen = await creerCompte(banc, { email: email("cr13") });
    const admin = await creerCompte(banc, { email: email("cr13-admin"), role: "ADMIN" });
    const id = await dossierSansPhoto(banc, citoyen.cookie);

    // Tâche sans photo : elle doit être close sans classement, jamais laissée en attente.
    banc.deps.travaux.enfiler({
      idTache: "tache-sans-photo",
      type: "classification_ia",
      cible: id,
      disponibleLe: "2026-11-14T09:00:00.000Z",
    });

    const tick = await appelJson(`${banc.url}/ia/tick`, { methode: "POST", cookie: admin.cookie });

    expect(tick.statut).toBe(200);
    expect(tick.corps.ignorees).toBe(1);
    expect(banc.deps.travaux.parId("tache-sans-photo")?.etat).toBe("TERMINEE");
    expect(banc.deps.signalements.parId(id)?.modeIa).toBe("AUCUN");
    await banc.fermer();
  });
});
