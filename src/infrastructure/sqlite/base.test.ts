import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appliquerMigrations, ouvrirBase, preparerBase, transactionner } from "./base.ts";

function dossierTemporaire(): string {
  return mkdtempSync(join(tmpdir(), "ecocitoyen-test-"));
}

function nombre(base: ReturnType<typeof ouvrirBase>, sql: string): number {
  return (base.prepare(sql).get() as { c: number }).c;
}

describe("migrations", () => {
  test("applique chaque migration une seule fois", () => {
    const base = ouvrirBase({ chemin: ":memory:" });
    const premiere = appliquerMigrations(base);
    const seconde = appliquerMigrations(base);

    expect(premiere).toBeGreaterThan(0);
    expect(seconde).toBe(0);
    expect(nombre(base, "SELECT COUNT(*) AS c FROM sqlite_master WHERE type='table' AND name='signalement'")).toBe(1);
    expect(nombre(base, "SELECT COUNT(*) AS c FROM migration_appliquee")).toBe(premiere);
    base.close();
  });

  test("active les clés étrangères à l ouverture", () => {
    const base = preparerBase({ chemin: ":memory:" });

    expect(Number(base.pragma("foreign_keys", { simple: true }))).toBe(1);
    expect(() =>
      base
        .prepare("INSERT INTO quartier (id_quartier, id_commune, nom, centre_lat, centre_lon) VALUES ('q-x','absente','X',6.1,1.2)")
        .run(),
    ).toThrow();
    base.close();
  });

  test("refuse un signalement dont la description est hors bornes", () => {
    const base = preparerBase({ chemin: ":memory:" });
    base.prepare("INSERT INTO commune VALUES ('c1','Test',6.0,6.3,1.1,1.4,1)").run();
    base.prepare("INSERT INTO quartier VALUES ('q1','c1','Q1',6.13,1.22,1)").run();
    base.prepare("INSERT INTO categorie VALUES ('cat-1','Depot','',3,'',1)").run();
    base
      .prepare(
        "INSERT INTO utilisateur (id_utilisateur, nom, prenom, email, empreinte_mot_de_passe, role, actif, date_consentement, date_creation) VALUES ('u1','N','P','u1@example.tg','x','CITOYEN',1,'2026-01-01','2026-01-01')",
      )
      .run();

    let numero = 0;
    const inserer = (description: string): void => {
      numero += 1;
      base
        .prepare(
          `INSERT INTO signalement (id_signalement, id_utilisateur, id_categorie, id_quartier, latitude, longitude,
             description, statut, niveau_priorite, score_priorite, date_signalement, date_mise_a_jour)
           VALUES (?, 'u1', 'cat-1', 'q1', 6.13, 1.22, ?, 'NOUVEAU', 'NORMALE', 2, '2026-01-01', '2026-01-01')`,
        )
        .run(`sig-${numero}`, description);
    };

    expect(() => inserer("court")).toThrow();
    expect(() => inserer("a".repeat(501))).toThrow();
    expect(() => inserer("Un tas de dechets visible depuis la rue")).not.toThrow();
    base.close();
  });
});

describe("persistance", () => {
  test("retrouve les données après fermeture et réouverture du fichier", () => {
    const dossier = dossierTemporaire();
    const chemin = join(dossier, "ecocitoyen.db");

    const premiere = preparerBase({ chemin });
    premiere.prepare("INSERT INTO parametre (cle, valeur) VALUES ('doublon.rayonMetres','30')").run();
    premiere.close();

    const seconde = preparerBase({ chemin });
    const ligne = seconde.prepare("SELECT valeur FROM parametre WHERE cle = 'doublon.rayonMetres'").get() as {
      valeur: string;
    };

    expect(ligne.valeur).toBe("30");
    seconde.close();
    rmSync(dossier, { recursive: true, force: true });
  });
});

describe("transaction", () => {
  test("annule tout le travail en cas d erreur", () => {
    const base = preparerBase({ chemin: ":memory:" });

    expect(() =>
      transactionner(base, () => {
        base.prepare("INSERT INTO parametre (cle, valeur) VALUES ('a','1')").run();
        throw new Error("panne simulée");
      }),
    ).toThrow();

    expect(nombre(base, "SELECT COUNT(*) AS c FROM parametre")).toBe(0);
    base.close();
  });
});
