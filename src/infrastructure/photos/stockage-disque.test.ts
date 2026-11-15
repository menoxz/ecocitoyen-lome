import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { ErreurMetier } from "@domaine/erreurs.ts";
import { creerHorlogeFixe } from "../horloge/horloge-fixe.ts";
import { creerIdentifiantsUuid } from "../identifiants/uuid.ts";
import { COTES_MAX, TAILLE_MAX_OCTETS, avecExif, creerStockageDisque, photoDeTest } from "./stockage-disque.ts";

const dossiers: string[] = [];

function stockage() {
  const dossier = mkdtempSync(join(tmpdir(), "eco-photos-"));
  dossiers.push(dossier);
  return creerStockageDisque(dossier, creerIdentifiantsUuid(), creerHorlogeFixe("2026-11-15T10:00:00.000Z"));
}

afterEach(() => {
  for (const dossier of dossiers.splice(0)) {
    rmSync(dossier, { recursive: true, force: true });
  }
});

describe("stockage des photos (ENF08, Z-09)", () => {
  test("enregistre une photo valide et retourne un chemin daté au nom aléatoire", async () => {
    const depot = stockage();
    const enregistree = await depot.enregistrer(await photoDeTest(), "image/jpeg");

    expect(enregistree.chemin).toMatch(/^2026\/11\/photo-[0-9a-f-]{36}\.webp$/);
    expect(enregistree.mime).toBe("image/webp");
    expect(enregistree.largeur).toBe(32);
    expect(enregistree.hauteur).toBe(24);
    expect(enregistree.tailleOctets).toBeGreaterThan(0);
  });

  test("retire les métadonnées EXIF au lieu de faire confiance au client", async () => {
    const depot = stockage();
    const avec = avecExif(await photoDeTest());
    expect((await sharp(avec).metadata()).exif).toBeDefined();

    const enregistree = await depot.enregistrer(avec, "image/jpeg");
    const relue = await depot.lire(enregistree.chemin);

    expect(relue).not.toBeNull();
    expect((await sharp(relue as Buffer).metadata()).exif).toBeUndefined();
  });

  test("refuse un fichier qui n'est pas une image, quel que soit le type annoncé", async () => {
    const depot = stockage();
    const faux = Buffer.from("<html><script>alert(1)</script></html>");

    await expect(depot.enregistrer(faux, "image/jpeg")).rejects.toBeInstanceOf(ErreurMetier);
    try {
      await depot.enregistrer(faux, "image/png");
      throw new Error("aurait dû refuser");
    } catch (erreur) {
      expect((erreur as ErreurMetier).code).toBe("PHOTO_INVALIDE");
    }
  });

  test("refuse un corps vide et un dépassement de taille", async () => {
    const depot = stockage();

    await expect(depot.enregistrer(Buffer.alloc(0), null)).rejects.toBeInstanceOf(ErreurMetier);

    const trop = Buffer.alloc(TAILLE_MAX_OCTETS + 1, 1);
    try {
      await depot.enregistrer(trop, "image/jpeg");
      throw new Error("aurait dû refuser");
    } catch (erreur) {
      expect((erreur as ErreurMetier).code).toBe("CONTRAT_INVALIDE");
    }
  });

  test("refuse une image aux dimensions déraisonnables", async () => {
    const depot = stockage();
    const immense = await sharp({
      create: { width: COTES_MAX + 1, height: 8, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .png()
      .toBuffer();

    await expect(depot.enregistrer(immense, "image/png")).rejects.toBeInstanceOf(ErreurMetier);
  });

  test("ne lit pas en dehors de son dossier, même avec un chemin relatif piégé", async () => {
    const depot = stockage();

    expect(await depot.lire("../../etc/passwd")).toBeNull();
    expect(await depot.lire("2026/11/inexistant.webp")).toBeNull();
  });
});