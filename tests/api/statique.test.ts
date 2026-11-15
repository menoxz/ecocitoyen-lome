import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Server } from "node:http";
import { creerApp } from "@interface/http/app.ts";
import { demarrerBanc, type Banc } from "./aide.ts";

/**
 * Le serveur sert-il l'interface ET l'API sur le même port, sans que l'une avale l'autre ?
 *
 * C'est le défaut mesuré sur le prototype : `/api/v1/sante` renvoyait le HTML de `index.html`
 * parce que le middleware du bundler captait tout. Ce test l'interdit explicitement.
 */
const dossiers: string[] = [];
const serveurs: { fermer: () => Promise<void> }[] = [];

function dossierBuild(): string {
  const dossier = mkdtempSync(join(tmpdir(), "eco-dist-"));
  dossiers.push(dossier);
  writeFileSync(join(dossier, "index.html"), '<!doctype html><html><body><div id="racine"></div></body></html>');
  writeFileSync(join(dossier, "signaler.html"), "<!doctype html><html><body>ancienne page retiree en P8</body></html>");
  return dossier;
}

async function servirAvecStatique(banc: Banc, dossier: string): Promise<string> {
  const app = creerApp(banc.deps, { dossierStatique: dossier });
  const serveur: Server = await new Promise((resoudre) => {
    const instance = app.listen(0, "127.0.0.1", () => resoudre(instance));
  });
  const adresse = serveur.address();
  const port = typeof adresse === "object" && adresse !== null ? adresse.port : 0;
  serveurs.push({
    fermer: () => new Promise<void>((resoudre) => serveur.close(() => resoudre())),
  });
  return `http://127.0.0.1:${port}`;
}

afterEach(async () => {
  for (const serveur of serveurs.splice(0)) {
    await serveur.fermer();
  }
  for (const dossier of dossiers.splice(0)) {
    rmSync(dossier, { recursive: true, force: true });
  }
});

describe("interface servie sur le port de l'API", () => {
  test("sert l index du front et laisse /api/v1 en JSON", async () => {
    const banc = await demarrerBanc({ avecSeed: false });
    const racine = await servirAvecStatique(banc, dossierBuild());

    const page = await fetch(`${racine}/`);
    const sante = await fetch(`${racine}/api/v1/sante`);
    const corpsSante = (await sante.json()) as { statut?: string };

    expect(page.status).toBe(200);
    expect(await page.text()).toContain('id="racine"');
    expect(sante.status).toBe(200);
    expect(corpsSante.statut).toBe("ok");
    await banc.fermer();
  });

  test("replie toute route inconnue sur l index du front, jamais sur l ancienne page", async () => {
    const banc = await demarrerBanc({ avecSeed: false });
    const racine = await servirAvecStatique(banc, dossierBuild());

    const repli = await fetch(`${racine}/un/chemin`);
    const contenu = await repli.text();

    expect(repli.status).toBe(200);
    expect(contenu).toContain('id="racine"');
    expect(contenu).not.toContain("ancienne page");
    await banc.fermer();
  });

  test("une route /api inconnue reste un 404 JSON, pas une page HTML", async () => {
    const banc = await demarrerBanc({ avecSeed: false });
    const racine = await servirAvecStatique(banc, dossierBuild());

    const reponse = await fetch(`${racine}/api/v1/inconnu`);
    const corps = (await reponse.json()) as { code?: string };

    expect(reponse.status).toBe(404);
    expect(corps.code).toBe("RESSOURCE_INTROUVABLE");
    await banc.fermer();
  });

  test("sans dossier statique, le serveur reste une API pure", async () => {
    const banc = await demarrerBanc({ avecSeed: false });
    const app = creerApp(banc.deps);
    const serveur: Server = await new Promise((resoudre) => {
      const instance = app.listen(0, "127.0.0.1", () => resoudre(instance));
    });
    const adresse = serveur.address();
    const port = typeof adresse === "object" && adresse !== null ? adresse.port : 0;

    const page = await fetch(`http://127.0.0.1:${port}/signaler.html`);
    expect(page.status).toBe(404);

    await new Promise<void>((resoudre) => serveur.close(() => resoudre()));
    await banc.fermer();
  });
});
