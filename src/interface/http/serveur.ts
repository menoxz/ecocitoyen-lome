import { existsSync } from "node:fs";
import { join } from "node:path";
import { creerApp } from "./app.ts";
import { chargerFichierEnv } from "@infrastructure/environnement/charger-dotenv.ts";
import { chargerEnvironnement } from "@config/environnement.ts";
import { preparerBase, type Base } from "@infrastructure/sqlite/base.ts";
import { seedDemonstration } from "@infrastructure/sqlite/seed.ts";
import { creerDepotSignalements } from "@infrastructure/sqlite/depot-signalements.sqlite.ts";
import { creerDepotComptes } from "@infrastructure/sqlite/depot-comptes.sqlite.ts";
import { creerDepotReferentiel } from "@infrastructure/sqlite/depot-referentiel.sqlite.ts";
import { creerDepotSessions } from "@infrastructure/sqlite/depot-sessions.sqlite.ts";
import { creerJournalSqlite } from "@infrastructure/journal/journal-sqlite.ts";
import { creerNotificateurSqlite } from "@infrastructure/notifications/notificateur-sqlite.ts";
import { creerDepotTravaux } from "@infrastructure/sqlite/depot-travaux.sqlite.ts";
import { creerStockageDisque } from "@infrastructure/photos/stockage-disque.ts";
import { creerClassificateurGemini } from "@infrastructure/gemini/classificateur-gemini.ts";
import { creerClassificateurSimulation } from "@infrastructure/gemini/classificateur-simulation.ts";
import { creerLimiteDebitSqlite } from "@infrastructure/limite-debit/limite-sqlite.ts";
import { creerHachageArgon2, creerEmpreinteJeton } from "@infrastructure/hachage/argon2.ts";
import { creerHorlogeSysteme } from "@infrastructure/horloge/horloge-systeme.ts";
import { creerIdentifiantsUuid } from "@infrastructure/identifiants/uuid.ts";
import type { Dependances } from "@application/dependances.type.ts";

/**
 * Composition root : le seul fichier qui choisit les implémentations.
 *
 * Tout le reste reçoit ses dépendances par paramètre. Remplacer SQLite par PostgreSQL ou Argon2
 * par un autre algorithme se décide ici et nulle part ailleurs.
 */
export function assembler(cheminBase: string, modeDemo: boolean): { app: ReturnType<typeof creerApp>; base: Base } {
  const base = preparerBase({ chemin: cheminBase });
  const horloge = creerHorlogeSysteme();
  const identifiants = creerIdentifiantsUuid();
  const dossierPhotos = process.env.DOSSIER_PHOTOS ?? "data/photos";
  const cleIa = process.env.GEMINI_API_KEY;

  if (modeDemo) {
    seedDemonstration(base, horloge.maintenant());
  }

  const deps: Dependances = {
    signalements: creerDepotSignalements(base),
    comptes: creerDepotComptes(base),
    referentiel: creerDepotReferentiel(base),
    sessions: creerDepotSessions(base),
    journal: creerJournalSqlite(base),
    debit: creerLimiteDebitSqlite(base),
    notifications: creerNotificateurSqlite(base),
    stockagePhotos: creerStockageDisque(dossierPhotos, identifiants, horloge),
    classificateur: cleIa ? creerClassificateurGemini(cleIa) : creerClassificateurSimulation(),
    travaux: creerDepotTravaux(base),
    hachage: creerHachageArgon2(),
    jetons: creerEmpreinteJeton(),
    identifiants,
    horloge,
  };

  // Le build n'existe qu'après `bun run build` : sans lui, le serveur reste une API pure.
  const dossierStatique = process.env.DOSSIER_STATIQUE ?? "dist";
  const servirStatique = existsSync(join(dossierStatique, "signaler.html"));

  return { app: creerApp(deps, { production: false, dossierStatique: servirStatique ? dossierStatique : undefined }), base };
}

async function demarrer(): Promise<void> {
  chargerFichierEnv();
  const env = chargerEnvironnement(process.env);
  const cheminBase = process.env.DB_CHEMIN ?? "data/ecocitoyen.db";
  const { app } = assembler(cheminBase, env.modeDemo);

  for (const avertissement of env.avertissements) {
    process.stderr.write(`[configuration] ${avertissement}` + "\n");
  }

  app.listen(env.port, "0.0.0.0", () => {
    process.stdout.write(`[EcoCitoyen API v1] http://localhost:${env.port}/api/v1/sante (demo=${env.modeDemo})` + "\n");
  });
}

if (process.env.NODE_ENV !== "test") {
  void demarrer();
}