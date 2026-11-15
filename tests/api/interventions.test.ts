import { describe, expect, test } from "bun:test";
import sharp from "sharp";
import { appelJson, creerCompte, demarrerBanc, type Banc } from "./aide.ts";

/** Un JPEG réel : le stockage mesure le type et la taille, il ne croit pas le client. */
async function photoJpeg(): Promise<Buffer> {
  return sharp({ create: { width: 64, height: 64, channels: 3, background: { r: 90, g: 140, b: 70 } } })
    .jpeg({ quality: 70 })
    .toBuffer();
}


const POSITION = { latitude: 6.1255, longitude: 1.2222 };
const DESCRIPTION = "Tas de déchets plastiques devant le marché, signalé ce matin par un riverain";

let compteur = 0;
function email(prefixe: string): string {
  compteur += 1;
  return `${prefixe}.${compteur}@example.tg`;
}

interface Acteurs {
  readonly citoyen: { idUtilisateur: string; cookie: string };
  readonly superviseur: { idUtilisateur: string; cookie: string };
  readonly agent: { idUtilisateur: string; cookie: string };
  readonly agentAutre: { idUtilisateur: string; cookie: string };
}

async function acteurs(banc: Banc): Promise<Acteurs> {
  return {
    citoyen: await creerCompte(banc, { email: email("cite") }),
    superviseur: await creerCompte(banc, { email: email("sup"), role: "SUPERVISEUR" }),
    agent: await creerCompte(banc, { email: email("agent"), role: "AGENT", idEquipe: "eq-1" }),
    agentAutre: await creerCompte(banc, { email: email("agent2"), role: "AGENT", idEquipe: "eq-2" }),
  };
}

async function dossierPret(banc: Banc, acteurs: Acteurs): Promise<string> {
  const creation = await appelJson(`${banc.url}/signalements`, {
    methode: "POST",
    cookie: acteurs.citoyen.cookie,
    corps: { id_categorie: "cat-1", description: DESCRIPTION, nombre_photos: 1, ...POSITION },
  });
  const id = (creation.corps.signalement as { id_signalement: string }).id_signalement;

  await appelJson(`${banc.url}/signalements/${id}/valider`, {
    methode: "POST",
    cookie: acteurs.superviseur.cookie,
    corps: { id_categorie: "cat-1", niveau_priorite: "HAUTE" },
  });

  return id;
}

async function dossierAffecte(banc: Banc, acteurs: Acteurs): Promise<string> {
  const id = await dossierPret(banc, acteurs);
  const affectation = await appelJson(`${banc.url}/signalements/${id}/affecter`, {
    methode: "POST",
    cookie: acteurs.superviseur.cookie,
    corps: { id_equipe: "eq-1" },
  });
  expect(affectation.statut).toBe(200);
  return id;
}

describe("parcours nominal §12.1", () => {
  test("du signalement citoyen à la résolution avec preuve photo", async () => {
    const banc = await demarrerBanc();
    const equipe = await acteurs(banc);
    const id = await dossierAffecte(banc, equipe);

    const avant = await appelJson(`${banc.url}/signalements/${id}`, { cookie: equipe.superviseur.cookie });
    expect(avant.corps.statut).toBe("EN_COURS");

    const demarrage = await appelJson(`${banc.url}/signalements/${id}/demarrer`, {
      methode: "POST",
      cookie: equipe.agent.cookie,
    });
    expect(demarrage.statut).toBe(200);

    const cloture = await appelJson(`${banc.url}/signalements/${id}/resoudre`, {
      methode: "POST",
      cookie: equipe.agent.cookie,
      corps: {
        photo: { chemin: "2026/11/apres-nettoyage.webp", mime: "image/webp", taille_octets: 184320 },
        commentaire: "Site nettoyé, bacs relevés et transportés à la décharge",
      },
    });

    expect(cloture.statut).toBe(200);
    expect(cloture.corps.statut).toBe("RESOLU");
    expect(cloture.corps.date_resolution).toBeString();

    const medias = banc.deps.signalements.mediasDe(id);
    expect(medias.length).toBe(1);
    expect(medias[0].type).toBe("RESOLUTION");
    expect(medias[0].chemin).toContain("apres-nettoyage");

    const historique = banc.deps.signalements.historiqueDe(id);
    expect(historique.map((entree) => entree.nouveauStatut)).toEqual(["NOUVEAU", "VALIDE", "EN_COURS", "RESOLU"]);

    const notificationsCitoyen = banc.deps.notifications.listerPour(equipe.citoyen.idUtilisateur);
    const titres = notificationsCitoyen.map((notification) => notification.titre);
    expect(titres).toContain("Intervention programmée");
    expect(titres).toContain("Signalement résolu");

    const journal = banc.deps.journal.lister({ limite: 200 });
    const actions = journal.map((entree) => entree.action);
    expect(actions).toContain("signalement.creation");
    expect(actions).toContain("signalement.validation");
    expect(actions).toContain("intervention.affectation");
    expect(actions).toContain("intervention.demarrage");
    expect(actions).toContain("intervention.cloture");

    await banc.fermer();
  });

  test("l'agent joint lui-même la preuve et la clôture ne la duplique pas", async () => {
    const banc = await demarrerBanc();
    const equipe = await acteurs(banc);
    const id = await dossierAffecte(banc, equipe);

    await appelJson(`${banc.url}/signalements/${id}/demarrer`, {
      methode: "POST",
      cookie: equipe.agent.cookie,
    });

    // L'agent n'est pas l'auteur du signalement : le prototype refusait cette photo, donc CR8
    // était impossible à tenir pour lui.
    const envoi = await fetch(`${banc.url}/signalements/${id}/photos`, {
      method: "POST",
      headers: { "content-type": "image/jpeg", cookie: equipe.agent.cookie },
      body: new Uint8Array(await photoJpeg()),
    });
    expect(envoi.status).toBe(201);
    const enregistree = (await envoi.json()) as { media: { chemin: string; mime: string; taille_octets: number } };

    const cloture = await appelJson(`${banc.url}/signalements/${id}/resoudre`, {
      methode: "POST",
      cookie: equipe.agent.cookie,
      corps: {
        photo: {
          chemin: enregistree.media.chemin,
          mime: enregistree.media.mime,
          taille_octets: enregistree.media.taille_octets,
        },
        commentaire: "Caniveau curé et déchets évacués, chaussée rendue à la circulation",
      },
    });

    expect(cloture.statut).toBe(200);
    expect(cloture.corps.statut).toBe("RESOLU");

    // Une seule preuve, et c'est celle que le serveur a mesurée : pas de second média créé par
    // la clôture avec le mime et la taille annoncés par le client.
    const preuves = banc.deps.signalements.mediasDe(id).filter((media) => media.type === "RESOLUTION");
    expect(preuves.length).toBe(1);
    expect(preuves[0].chemin).toBe(enregistree.media.chemin);
    expect(preuves[0].mime).toBe("image/webp");

    await banc.fermer();
  });

  test("notifie les agents de l'équipe affectée", async () => {
    const banc = await demarrerBanc();
    const equipe = await acteurs(banc);

    const id = await dossierPret(banc, equipe);
    await appelJson(`${banc.url}/signalements/${id}/affecter`, {
      methode: "POST",
      cookie: equipe.superviseur.cookie,
      corps: { id_equipe: "eq-1" },
    });

    const notificationsAgent = banc.deps.notifications.listerPour(equipe.agent.idUtilisateur);
    expect(notificationsAgent.length).toBe(1);
    expect(notificationsAgent[0].titre).toBe("Nouvelle intervention affectée");
    expect(notificationsAgent[0].type).toBe("ALERT");

    const notificationsAutreEquipe = banc.deps.notifications.listerPour(equipe.agentAutre.idUtilisateur);
    expect(notificationsAutreEquipe.length).toBe(0);

    await banc.fermer();
  });
});

describe("refus d'intervention", () => {
  test("refuse la clôture par un agent d'une autre équipe (CR7)", async () => {
    const banc = await demarrerBanc();
    const equipe = await acteurs(banc);
    const id = await dossierAffecte(banc, equipe);

    const reponse = await appelJson(`${banc.url}/signalements/${id}/resoudre`, {
      methode: "POST",
      cookie: equipe.agentAutre.cookie,
      corps: {
        photo: { chemin: "2026/11/faux.webp", mime: "image/webp", taille_octets: 1000 },
        commentaire: "Nettoyage effectué par une autre équipe",
      },
    });

    expect(reponse.statut).toBe(403);
    expect(reponse.corps.code).toBe("DROIT_REFUSE");
    await banc.fermer();
  });

  test("refuse la clôture sans photo de résolution (CR8)", async () => {
    const banc = await demarrerBanc();
    const equipe = await acteurs(banc);
    const id = await dossierAffecte(banc, equipe);
    await appelJson(`${banc.url}/signalements/${id}/demarrer`, { methode: "POST", cookie: equipe.agent.cookie });

    const reponse = await appelJson(`${banc.url}/signalements/${id}/resoudre`, {
      methode: "POST",
      cookie: equipe.agent.cookie,
      corps: { commentaire: "Nettoyage effectué sans preuve photographique" },
    });

    expect(reponse.statut).toBe(400);
    expect(reponse.corps.code).toBe("PHOTO_MANQUANTE");
    expect(banc.deps.signalements.mediasDe(id).length).toBe(0);
    await banc.fermer();
  });

  test("refuse une seconde affectation sur une intervention active (409)", async () => {
    const banc = await demarrerBanc();
    const equipe = await acteurs(banc);
    const id = await dossierAffecte(banc, equipe);

    const reponse = await appelJson(`${banc.url}/signalements/${id}/affecter`, {
      methode: "POST",
      cookie: equipe.superviseur.cookie,
      corps: { id_equipe: "eq-2" },
    });

    expect(reponse.statut).toBe(409);
    expect(reponse.corps.code).toBe("INTERVENTION_ACTIVE_EXISTANTE");
    await banc.fermer();
  });

  test("refuse à un citoyen de démarrer une intervention (403)", async () => {
    const banc = await demarrerBanc();
    const equipe = await acteurs(banc);
    const id = await dossierAffecte(banc, equipe);

    const reponse = await appelJson(`${banc.url}/signalements/${id}/demarrer`, {
      methode: "POST",
      cookie: equipe.citoyen.cookie,
    });

    expect(reponse.statut).toBe(403);
    await banc.fermer();
  });
});

describe("notifications", () => {
  test("ne renvoie que les notifications du compte connecté", async () => {
    const banc = await demarrerBanc();
    const equipe = await acteurs(banc);
    await dossierAffecte(banc, equipe);

    const notifCitoyen = await appelJson(`${banc.url}/notifications`, { cookie: equipe.citoyen.cookie });
    const notifAgentAutre = await appelJson(`${banc.url}/notifications`, { cookie: equipe.agentAutre.cookie });

    expect(notifCitoyen.statut).toBe(200);
    expect((notifCitoyen.corps as unknown as unknown[]).length).toBe(1);
    expect((notifAgentAutre.corps as unknown as unknown[]).length).toBe(0);
    await banc.fermer();
  });

  test("marque une notification comme lue, et refuse celle d'un autre", async () => {
    const banc = await demarrerBanc();
    const equipe = await acteurs(banc);
    await dossierAffecte(banc, equipe);

    const notifications = banc.deps.notifications.listerPour(equipe.citoyen.idUtilisateur);
    const idNotification = notifications[0].idNotification;

    const parAutrui = await appelJson(`${banc.url}/notifications/${idNotification}`, {
      methode: "PATCH",
      cookie: equipe.agentAutre.cookie,
    });
    expect(parAutrui.statut).toBe(404);

    const parTitulaire = await appelJson(`${banc.url}/notifications/${idNotification}`, {
      methode: "PATCH",
      cookie: equipe.citoyen.cookie,
    });
    expect(parTitulaire.statut).toBe(200);
    expect(banc.deps.notifications.listerPour(equipe.citoyen.idUtilisateur)[0].lu).toBe(true);
    await banc.fermer();
  });
});
