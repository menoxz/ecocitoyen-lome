import { afterEach, describe, expect, test } from "bun:test";
import { appelJson, creerCompte, demarrerBanc, MOT_DE_PASSE, type Banc } from "./aide.ts";

/**
 * RB03 — un compte interne se crée par un administrateur, avec mot de passe temporaire.
 *
 * Deux propriétés sont protégées ici : le rôle demandé est bien celui enregistré (et non un
 * « CITOYEN » silencieux), et le mot de passe temporaire rendu fonctionne réellement — sans quoi
 * l'administrateur remettrait un secret inutilisable.
 */

let banc: Banc | null = null;

afterEach(async () => {
  await banc?.fermer();
  banc = null;
});

async function contexte(): Promise<{ banc: Banc; admin: string }> {
  const demarre = await demarrerBanc();
  banc = demarre;
  const admin = await creerCompte(demarre, { email: "admin.rb03@example.tg", role: "ADMIN" });
  return { banc: demarre, admin: admin.cookie };
}

describe("RB03 création d'un compte interne", () => {
  test("l'administrateur crée un agent avec son équipe et reçoit un mot de passe temporaire", async () => {
    const { banc: b, admin } = await contexte();

    const reponse = await appelJson(`${b.url}/comptes`, {
      methode: "POST",
      cookie: admin,
      corps: { nom: "Dogbe", prenom: "Yao", email: "agent.rb03@example.tg", role: "AGENT", id_equipe: "eq-1" },
    });

    expect(reponse.statut).toBe(201);
    const compte = reponse.corps.compte as Record<string, unknown>;
    expect(compte.role).toBe("AGENT");
    expect(compte.id_equipe).toBe("eq-1");
    expect(compte.mot_de_passe_temporaire).toBe(true);
    expect(String(reponse.corps.mot_de_passe_temporaire).length).toBeGreaterThanOrEqual(8);
  });

  test("le mot de passe temporaire permet de se connecter, et signale qu'il doit être changé", async () => {
    const { banc: b, admin } = await contexte();

    const creation = await appelJson(`${b.url}/comptes`, {
      methode: "POST",
      cookie: admin,
      corps: { nom: "Kpodo", prenom: "Afi", email: "afi.rb03@example.tg", role: "AGENT", id_equipe: "eq-1" },
    });
    const temporaire = String(creation.corps.mot_de_passe_temporaire);

    const connexion = await appelJson(`${b.url}/auth/connexion`, {
      methode: "POST",
      corps: { identifiant: "afi.rb03@example.tg", mot_de_passe: temporaire },
    });

    expect(connexion.statut).toBe(200);
    const compte = connexion.corps.compte as Record<string, unknown>;
    expect(compte.role).toBe("AGENT");
    expect(compte.mot_de_passe_temporaire).toBe(true);
  });

  test("un agent ne peut pas créer de compte interne : le droit est refusé", async () => {
    const { banc: b } = await contexte();
    const agent = await creerCompte(b, { email: "simple.agent@example.tg", role: "AGENT", idEquipe: "eq-1" });

    const reponse = await appelJson(`${b.url}/comptes`, {
      methode: "POST",
      cookie: agent.cookie,
      corps: { nom: "X", prenom: "Y", email: "interdit@example.tg", role: "ADMIN", id_equipe: null },
    });

    expect(reponse.statut).toBe(403);
    expect(String(reponse.corps.code)).toBe("DROIT_REFUSE");
  });

  test("une équipe inconnue est refusée plutôt qu'ignorée", async () => {
    const { banc: b, admin } = await contexte();

    const reponse = await appelJson(`${b.url}/comptes`, {
      methode: "POST",
      cookie: admin,
      corps: { nom: "Z", prenom: "W", email: "equipe.inexistante@example.tg", role: "AGENT", id_equipe: "eq-fantome" },
    });

    expect(reponse.statut).toBe(400);
    expect(String(reponse.corps.code)).toBe("CONTRAT_INVALIDE");
  });
});

describe("changement de son propre mot de passe", () => {
  test("l'ancien mot de passe est exigé, et le remplacement lève le caractère temporaire", async () => {
    const { banc: b, admin } = await contexte();
    const creation = await appelJson(`${b.url}/comptes`, {
      methode: "POST",
      cookie: admin,
      corps: { nom: "Mensah", prenom: "Koffi", email: "koffi.rb03@example.tg", role: "AGENT", id_equipe: "eq-1" },
    });
    const temporaire = String(creation.corps.mot_de_passe_temporaire);

    // Le cookie de session est dans l'en-tête, que `appelJson` n'expose pas : on lit la réponse.
    const session = await fetch(`${b.url}/auth/connexion`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifiant: "koffi.rb03@example.tg", mot_de_passe: temporaire }),
    });
    const cookieAgent = (session.headers.get("set-cookie") ?? "").split(";")[0];
    expect(cookieAgent).toContain("eco_session");

    const refus = await appelJson(`${b.url}/auth/mot-de-passe`, {
      methode: "POST",
      cookie: cookieAgent,
      corps: { ancien: "Mauvais-Mot-2026", nouveau: "Nouveau-Lome-2026" },
    });
    expect(refus.statut).toBe(401);

    const faible = await appelJson(`${b.url}/auth/mot-de-passe`, {
      methode: "POST",
      cookie: cookieAgent,
      corps: { ancien: temporaire, nouveau: "court" },
    });
    expect(faible.statut).toBe(400);
    expect(String(faible.corps.code)).toBe("MOT_DE_PASSE_FAIBLE");

    const change = await appelJson(`${b.url}/auth/mot-de-passe`, {
      methode: "POST",
      cookie: cookieAgent,
      corps: { ancien: temporaire, nouveau: "Nouveau-Lome-2026" },
    });
    expect(change.statut).toBe(200);
    expect((change.corps as Record<string, unknown>).mot_de_passe_temporaire).toBe(false);

    const ancienRefuse = await appelJson(`${b.url}/auth/connexion`, {
      methode: "POST",
      corps: { identifiant: "koffi.rb03@example.tg", mot_de_passe: temporaire },
    });
    expect(ancienRefuse.statut).toBe(401);

    const nouveauAccepte = await appelJson(`${b.url}/auth/connexion`, {
      methode: "POST",
      corps: { identifiant: "koffi.rb03@example.tg", mot_de_passe: "Nouveau-Lome-2026" },
    });
    expect(nouveauAccepte.statut).toBe(200);
  });

  test("le mot de passe d'origine du banc reste valable pour un compte non temporaire", async () => {
    const { banc: b } = await contexte();
    const citoyen = await creerCompte(b, { email: "citoyen.rb03@example.tg" });

    const change = await appelJson(`${b.url}/auth/mot-de-passe`, {
      methode: "POST",
      cookie: citoyen.cookie,
      corps: { ancien: MOT_DE_PASSE, nouveau: "Autre-Lome-2026" },
    });

    expect(change.statut).toBe(200);
  });
});
