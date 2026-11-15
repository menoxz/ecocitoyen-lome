import { preparerBase, type Base } from "@infrastructure/sqlite/base.ts";
import { creerDepotSignalements } from "@infrastructure/sqlite/depot-signalements.sqlite.ts";
import { creerDepotComptes } from "@infrastructure/sqlite/depot-comptes.sqlite.ts";
import { creerDepotReferentiel } from "@infrastructure/sqlite/depot-referentiel.sqlite.ts";
import { creerDepotSessions } from "@infrastructure/sqlite/depot-sessions.sqlite.ts";
import { creerJournalSqlite } from "@infrastructure/journal/journal-sqlite.ts";
import { creerNotificateurSqlite } from "@infrastructure/notifications/notificateur-sqlite.ts";
import { creerLimiteDebitSqlite } from "@infrastructure/limite-debit/limite-sqlite.ts";
import { creerHachageArgon2, creerEmpreinteJeton } from "@infrastructure/hachage/argon2.ts";
import { creerHorlogeFixe } from "@infrastructure/horloge/horloge-fixe.ts";
import { creerIdentifiantsUuid } from "@infrastructure/identifiants/uuid.ts";
import { creerApp } from "@interface/http/app.ts";
import { seedDemonstration } from "@infrastructure/sqlite/seed.ts";
import type { Dependances } from "@application/dependances.type.ts";
import type { Server } from "node:http";

/**
 * Banc de test HTTP : serveur réel sur un port éphémère, base SQLite en mémoire.
 *
 * Mêmes middlewares, mêmes routes, même table de statuts que la production : un test qui passe
 * ici passe en production. La base est créée et détruite par test, donc aucun ordre d'exécution
 * ne peut influencer le résultat.
 */
export interface Banc {
  readonly base: Base;
  readonly deps: Dependances;
  readonly url: string;
  readonly horloge: ReturnType<typeof creerHorlogeFixe>;
  fermer(): Promise<void>;
}

export const MOT_DE_PASSE = "Lome-Propre-2026";
export const MAINTENANT = "2026-11-14T09:00:00.000Z";

export async function demarrerBanc(options: { readonly avecSeed?: boolean } = {}): Promise<Banc> {
  const base = preparerBase({ chemin: ":memory:" });
  const horloge = creerHorlogeFixe(MAINTENANT);
  const referentiel = creerDepotReferentiel(base);
  const comptes = creerDepotComptes(base);

  if (options.avecSeed !== false) {
    seedDemonstration(base, MAINTENANT);
  }

  const deps: Dependances = {
    signalements: creerDepotSignalements(base),
    comptes,
    referentiel,
    sessions: creerDepotSessions(base),
    journal: creerJournalSqlite(base),
    debit: creerLimiteDebitSqlite(base),
    notifications: creerNotificateurSqlite(base),
    hachage: creerHachageArgon2(),
    jetons: creerEmpreinteJeton(),
    identifiants: creerIdentifiantsUuid(),
    horloge,
  };

  const app = creerApp(deps, { production: false });
  const serveur: Server = await new Promise((resoudre) => {
    const instance = app.listen(0, "127.0.0.1", () => resoudre(instance));
  });
  const adresse = serveur.address();
  const port = typeof adresse === "object" && adresse !== null ? adresse.port : 0;

  return {
    base,
    deps,
    horloge,
    url: `http://127.0.0.1:${port}/api/v1`,
    async fermer() {
      await new Promise<void>((resoudre) => serveur.close(() => resoudre()));
      base.close();
    },
  };
}

/** Crée un compte réel (mot de passe haché par Argon2) et retourne son cookie de session. */
export async function creerCompte(
  banc: Banc,
  options: {
    readonly email: string;
    readonly role?: "CITOYEN" | "AGENT" | "SUPERVISEUR" | "ADMIN";
    readonly idEquipe?: string | null;
  },
): Promise<{ readonly idUtilisateur: string; readonly cookie: string }> {
  const inscription = await fetch(`${banc.url}/auth/inscription`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      nom: "Test",
      prenom: options.role ?? "Citoyen",
      email: options.email,
      mot_de_passe: MOT_DE_PASSE,
      consentement: true,
    }),
  });

  if (inscription.status !== 201) {
    throw new Error(`inscription impossible (${inscription.status}) : ${await inscription.text()}`);
  }

  const corps = (await inscription.json()) as { compte: { id_utilisateur: string } };
  const idUtilisateur = corps.compte.id_utilisateur;

  if (options.role && options.role !== "CITOYEN") {
    banc.base.prepare("UPDATE utilisateur SET role = ?, id_equipe = ? WHERE id_utilisateur = ?").run(
      options.role,
      options.idEquipe ?? null,
      idUtilisateur,
    );
  }

  return { idUtilisateur, cookie: cookieDe(inscription) };
}

export function cookieDe(reponse: Response): string {
  const entete = reponse.headers.get("set-cookie") ?? "";
  const valeur = entete.split(";")[0];
  return valeur;
}

export async function appelJson(
  url: string,
  options: { readonly methode?: string; readonly corps?: unknown; readonly cookie?: string } = {},
): Promise<{ readonly statut: number; readonly corps: Record<string, unknown>; readonly texte: string }> {
  const reponse = await fetch(url, {
    method: options.methode ?? "GET",
    headers: {
      ...(options.corps ? { "content-type": "application/json" } : {}),
      ...(options.cookie ? { cookie: options.cookie } : {}),
    },
    body: options.corps ? JSON.stringify(options.corps) : undefined,
  });

  const texte = await reponse.text();
  let corps: Record<string, unknown> = {};
  try {
    corps = JSON.parse(texte) as Record<string, unknown>;
  } catch {
    corps = {};
  }
  return { statut: reponse.status, corps, texte };
}
