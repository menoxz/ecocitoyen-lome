export interface PhotoEnregistree {
  /** Chemin relatif au dossier de stockage : "2026/11/<uuid>.webp". Jamais une URL signée. */
  readonly chemin: string;
  /** Type réellement détecté, pas celui annoncé par le client. */
  readonly mime: string;
  readonly tailleOctets: number;
  readonly largeur: number;
  readonly hauteur: number;
}

/**
 * Stockage des photos (ENF08, Z-09).
 *
 * L''implémentation décide seule du nom et de l''emplacement : un nom fourni par un client est
 * un chemin d''attaque. Elle vérifie le type réel, retire les métadonnées et refuse tout ce qui
 * n''est pas une image acceptée.
 */
export interface StockagePhotos {
  /**
   * Enregistre une photo.
   * Lève `PHOTO_INVALIDE` si les octets ne forment pas une image acceptée, `CONTRAT_INVALIDE`
   * si la taille dépasse la limite.
   */
  enregistrer(octets: Buffer, mimeAnnonce: string | null): Promise<PhotoEnregistree>;
  /** Lit une photo déjà enregistrée, ou null si le chemin n''existe pas. */
  lire(chemin: string): Promise<Buffer | null>;
  /** Supprime une photo (usage : nettoyage d''un orphelin). */
  supprimer(chemin: string): Promise<boolean>;
}