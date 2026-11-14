import Database from "better-sqlite3";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Ouverture de la base et application des migrations.
 *
 * Deux garanties portées ici plutôt que dans le code applicatif :
 * - les clés étrangères sont activées à chaque connexion (SQLite les désactive par défaut) ;
 * - chaque migration s''applique une seule fois, dans l''ordre de son numéro, et reste tracée.
 */
export type Base = Database.Database;

const DOSSIER_MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), "migrations");

export interface OptionsBase {
  /** Chemin du fichier, ou ":memory:" pour un test jetable. */
  readonly chemin: string;
  readonly dossierMigrations?: string;
  readonly journalWal?: boolean;
}

export function ouvrirBase(options: OptionsBase): Base {
  const chemin = options.chemin;
  if (chemin !== ":memory:") {
    mkdirSync(dirname(chemin), { recursive: true });
  }

  const base = new Database(chemin);
  base.pragma("foreign_keys = ON");
  if (options.journalWal !== false && chemin !== ":memory:") {
    base.pragma("journal_mode = WAL");
  }
  return base;
}

/** Liste ordonnée des fichiers de migration disponibles. */
export function migrationsDisponibles(dossier: string = DOSSIER_MIGRATIONS): readonly string[] {
  return readdirSync(dossier)
    .filter((nom) => /^\d{3}-.*\.sql$/.test(nom))
    .sort();
}

/** Applique les migrations manquantes. Retourne le nombre de migrations appliquées. */
export function appliquerMigrations(base: Base, dossier: string = DOSSIER_MIGRATIONS): number {
  base.exec(`CREATE TABLE IF NOT EXISTS migration_appliquee (
    version INTEGER PRIMARY KEY,
    nom TEXT NOT NULL,
    applique_le TEXT NOT NULL
  )`);

  const deja = new Set(
    base.prepare("SELECT version FROM migration_appliquee").all().map((ligne) => Number((ligne as { version: number }).version)),
  );
  const journaliser = base.prepare("INSERT INTO migration_appliquee (version, nom, applique_le) VALUES (?, ?, ?)");
  let appliquees = 0;

  for (const nom of migrationsDisponibles(dossier)) {
    const version = Number(nom.slice(0, 3));
    if (deja.has(version)) continue;

    const sql = readFileSync(join(dossier, nom), "utf8");
    base.exec("BEGIN");
    try {
      base.exec(sql);
      journaliser.run(version, nom, new Date().toISOString());
      base.exec("COMMIT");
      appliquees += 1;
    } catch (erreur) {
      base.exec("ROLLBACK");
      throw new Error(`Migration ${nom} refusée : ${(erreur as Error).message}`);
    }
  }

  return appliquees;
}

/** Ouvre une base prête à l''emploi : migrations appliquées, ordre garanti. */
export function preparerBase(options: OptionsBase): Base {
  const base = ouvrirBase(options);
  appliquerMigrations(base, options.dossierMigrations);
  return base;
}

/** Transaction explicite : le travail s''exécute en entier ou pas du tout. */
export function transactionner<T>(base: Base, travail: () => T): T {
  const enveloppe = base.transaction(travail);
  return enveloppe();
}