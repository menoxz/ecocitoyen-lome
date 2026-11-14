import { describe, expect, test } from "bun:test";
import { appelJson, creerCompte, demarrerBanc, MOT_DE_PASSE } from "./aide.ts";

describe("santé et authentification", () => {
  test("expose une route de santé publique", async () => {
    const banc = await demarrerBanc();
    const reponse = await appelJson(`${banc.url}/sante`);

    expect(reponse.statut).toBe(200);
    expect(reponse.corps.statut).toBe("ok");
    await banc.fermer();
  });

  test("refuse une route protégée sans cookie : 401 (NON_AUTHENTIFIE)", async () => {
    const banc = await demarrerBanc();
    const reponse = await appelJson(`${banc.url}/auth/moi`);

    expect(reponse.statut).toBe(401);
    expect(reponse.corps.code).toBe("NON_AUTHENTIFIE");
    await banc.fermer();
  });

  test("inscrit un citoyen, pose un cookie et le reconnaît ensuite", async () => {
    const banc = await demarrerBanc();

    const inscription = await fetch(`${banc.url}/auth/inscription`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        nom: "Mensah",
        prenom: "Koffi",
        email: "koffi.inscription@example.tg",
        mot_de_passe: MOT_DE_PASSE,
        consentement: true,
      }),
    });
    const corps = (await inscription.json()) as { compte: { role: string; email: string } };
    const cookie = (inscription.headers.get("set-cookie") ?? "").split(";")[0];

    expect(inscription.status).toBe(201);
    expect(corps.compte.role).toBe("CITOYEN");
    expect(cookie).toContain("eco_session=");

    const moi = await appelJson(`${banc.url}/auth/moi`, { cookie });
    expect(moi.statut).toBe(200);
    expect((moi.corps.compte as { email: string }).email).toBe("koffi.inscription@example.tg");
    await banc.fermer();
  });

  test("refuse une inscription sans consentement", async () => {
    const banc = await demarrerBanc();
    const reponse = await appelJson(`${banc.url}/auth/inscription`, {
      methode: "POST",
      corps: { nom: "A", prenom: "B", email: "sans.consentement@example.tg", mot_de_passe: MOT_DE_PASSE },
    });

    expect(reponse.statut).toBe(400);
    expect(reponse.corps.code).toBe("CONTRAT_INVALIDE");
    await banc.fermer();
  });

  test("refuse un mot de passe faible avec le bon code", async () => {
    const banc = await demarrerBanc();
    const reponse = await appelJson(`${banc.url}/auth/inscription`, {
      methode: "POST",
      corps: {
        nom: "A",
        prenom: "B",
        email: "faible@example.tg",
        mot_de_passe: "court",
        consentement: true,
      },
    });

    expect(reponse.statut).toBe(400);
    expect(reponse.corps.code).toBe("MOT_DE_PASSE_FAIBLE");
    await banc.fermer();
  });

  test("refuse un mauvais mot de passe sans révéler si le compte existe", async () => {
    const banc = await demarrerBanc();
    await creerCompte(banc, { email: "citoyen.auth@example.tg" });

    const mauvais = await appelJson(`${banc.url}/auth/connexion`, {
      methode: "POST",
      corps: { identifiant: "citoyen.auth@example.tg", mot_de_passe: "Mauvais-Mot-De-Passe" },
    });
    const inconnu = await appelJson(`${banc.url}/auth/connexion`, {
      methode: "POST",
      corps: { identifiant: "inconnu@example.tg", mot_de_passe: "Mauvais-Mot-De-Passe" },
    });

    expect(mauvais.statut).toBe(401);
    expect(inconnu.statut).toBe(401);
    expect(mauvais.corps.code).toBe("IDENTIFIANTS_INVALIDES");
    expect(inconnu.corps.code).toBe("IDENTIFIANTS_INVALIDES");
    await banc.fermer();
  });

  test("verrouille le compte après cinq échecs (RG24, 423)", async () => {
    const banc = await demarrerBanc();
    await creerCompte(banc, { email: "verrou@example.tg" });

    const tentatives: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      const reponse = await appelJson(`${banc.url}/auth/connexion`, {
        methode: "POST",
        corps: { identifiant: "verrou@example.tg", mot_de_passe: `faux-${i}` },
      });
      tentatives.push(reponse.statut);
    }

    expect(tentatives.slice(0, 4)).toEqual([401, 401, 401, 401]);
    expect(tentatives[4]).toBe(423);
    expect(tentatives[5]).toBe(423);
    await banc.fermer();
  });

  test("invalide la session à la déconnexion", async () => {
    const banc = await demarrerBanc();
    const compte = await creerCompte(banc, { email: "deco@example.tg" });

    expect((await appelJson(`${banc.url}/auth/moi`, { cookie: compte.cookie })).statut).toBe(200);
    expect((await appelJson(`${banc.url}/auth/deconnexion`, { methode: "POST", cookie: compte.cookie })).statut).toBe(200);
    expect((await appelJson(`${banc.url}/auth/moi`, { cookie: compte.cookie })).statut).toBe(401);
    await banc.fermer();
  });
});
