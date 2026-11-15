import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import sharp, { type Metadata } from "sharp";
import { ErreurMetier } from "@domaine/erreurs.ts";
import type { Identifiants } from "@ports/identifiants.port.ts";
import type { Horloge } from "@ports/horloge.port.ts";
import type { PhotoEnregistree, StockagePhotos } from "@ports/stockage-photos.port.ts";

/** 5 Mo maximum accepté (EF10). Le client compresse, le serveur vérifie. */
export const TAILLE_MAX_OCTETS = 5 * 1024 * 1024;
export const COTES_MAX = 4000;
const FORMATS_ACCEPTES = ["jpeg", "png", "webp"] as const;

/**
 * Stockage sur disque, avec validation serveur.
 *
 * Trois garanties non négociables, toutes mesurées par les tests :
 * - le type vient du contenu (sharp), jamais du nom de fichier ni du `Content-Type` annoncé ;
 * - le ré-encodage retire les métadonnées EXIF (position, appareil, date) — un client qui
 *   prétend l''avoir fait ne suffit pas ;
 * - le nom est aléatoire et le dossier vit hors de toute racine servie statiquement : un fichier
 *   déposé ne peut pas être exécuté.
 */
export function creerStockageDisque(
  dossierRacine: string,
  identifiants: Identifiants,
  horloge: Horloge,
): StockagePhotos {
  const absolu = (chemin: string): string => {
    const propre = normalize(chemin).replace(/^([.][.](\/|\\|$))+/, "");
    return join(dossierRacine, propre);
  };

  return {
    async enregistrer(octets, mimeAnnonce) {
      if (octets.length === 0) {
        throw new ErreurMetier("PHOTO_INVALIDE", { raison: "vide" });
      }
      if (octets.length > TAILLE_MAX_OCTETS) {
        throw new ErreurMetier("CONTRAT_INVALIDE", { champ: "photo", maximum: TAILLE_MAX_OCTETS });
      }

      let metadonnees: Metadata;
      try {
        metadonnees = await sharp(octets).metadata();
      } catch {
        // Ce n''est pas une image : le contenu fait foi, pas le type annoncé.
        throw new ErreurMetier("PHOTO_INVALIDE", { raison: "contenu_non_image", annonce: mimeAnnonce });
      }

      const format = metadonnees.format ?? "";
      if (!FORMATS_ACCEPTES.includes(format as (typeof FORMATS_ACCEPTES)[number])) {
        throw new ErreurMetier("PHOTO_INVALIDE", { raison: "format_refuse", format });
      }
      if ((metadonnees.width ?? 0) > COTES_MAX || (metadonnees.height ?? 0) > COTES_MAX) {
        throw new ErreurMetier("PHOTO_INVALIDE", { raison: "dimensions", maximum: COTES_MAX });
      }

      // Ré-encodage : supprime EXIF et normalise le format. `rotate()` applique l''orientation
      // avant de la jeter, sinon une photo de terrain se retrouve couchée.
      const convertie = await sharp(octets).rotate().webp({ quality: 82 }).toBuffer();
      const finale = await sharp(convertie).metadata();

      const maintenant = horloge.maintenant();
      const chemin = `${maintenant.slice(0, 4)}/${maintenant.slice(5, 7)}/${identifiants.nouveau("photo")}.webp`;
      const cible = absolu(chemin);
      await mkdir(dirname(cible), { recursive: true });
      await writeFile(cible, convertie);

      return {
        chemin,
        mime: "image/webp",
        tailleOctets: convertie.length,
        largeur: finale.width ?? 0,
        hauteur: finale.height ?? 0,
      };
    },

    async lire(chemin) {
      try {
        return await readFile(absolu(chemin));
      } catch {
        return null;
      }
    },

    async supprimer(chemin) {
      try {
        await unlink(absolu(chemin));
        return true;
      } catch {
        return false;
      }
    },
  };
}

/** Écrit une photo de test : évite de dépendre d''un fichier binaire versionné. */
export async function photoDeTest(largeur = 32, hauteur = 24): Promise<Buffer> {
  return sharp({ create: { width: largeur, height: hauteur, channels: 3, background: { r: 200, g: 60, b: 20 } } })
    .jpeg()
    .toBuffer();
}

/** Construit un JPEG porteur d''un segment EXIF, pour prouver que le serveur le retire. */
export function avecExif(jpeg: Buffer): Buffer {
  const tiff = Buffer.from([0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00]);
  const charge = Buffer.concat([Buffer.from("Exif\0\0", "binary"), tiff]);
  const longueur = Buffer.alloc(2);
  longueur.writeUInt16BE(charge.length + 2);
  return Buffer.concat([jpeg.subarray(0, 2), Buffer.from([0xff, 0xe1]), longueur, charge, jpeg.subarray(2)]);
}