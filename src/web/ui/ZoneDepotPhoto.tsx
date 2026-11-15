import type { ReactNode } from "react";
import { Bouton } from "./Bouton.tsx";
import { GrillePhotos, type PhotoGrille } from "./GrillePhotos.tsx";
import { ESPACEMENT, TAILLE_TEXTE } from "./jetons.ts";

/**
 * Dépôt de photos — états couverts : vide (grille d'emplacements), avec photos, erreur de fichier,
 * désactivé, chargement, mode dégradé (sans photo), maximum atteint.
 *
 * La zone ne décrit plus l'absence de photo par une phrase : elle dessine trois emplacements. Le
 * texte reste, mais il explique ce qui est attendu, il ne remplace pas la cible.
 *
 * Trois photos au plus, 5 Mo par photo, JPEG/PNG/WebP : les limites sont annoncées avant le choix
 * du fichier. Le message d'erreur affiché est celui du serveur (`PHOTO_INVALIDE`, motif compris) —
 * le client ne réécrit pas la raison.
 */
export interface PhotoChoisie extends PhotoGrille {
  /** Octets réels du fichier. Absents en rendu de démonstration, présents après un vrai choix. */
  readonly octets?: Blob;
  readonly typeMime?: string;
}

export interface ProprietesZoneDepotPhoto {
  readonly photos: readonly PhotoChoisie[];
  readonly maximum?: number;
  readonly erreur?: string | null;
  readonly desactive?: boolean;
  readonly enChargement?: boolean;
  readonly sansPhoto?: boolean;
  readonly onFichiers?: (fichiers: readonly File[]) => void;
  readonly onRetirer?: (id: string) => void;
  readonly onDeclarerSansPhoto?: () => void;
}

export const PHOTOS_MAX = 3;
export const TAILLE_MAX_MO = 5;

export function ZoneDepotPhoto(proprietes: ProprietesZoneDepotPhoto): ReactNode {
  const maximum = proprietes.maximum ?? PHOTOS_MAX;
  const inactif = proprietes.desactive === true || proprietes.enChargement === true;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <p style={{ margin: 0, fontSize: TAILLE_TEXTE.md, fontWeight: 700, color: "var(--ui-texte)" }}>
          Photos du problème ({proprietes.photos.length}/{maximum})
        </p>
        <p style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-texte-attenue)" }}>
          JPEG, PNG ou WebP · {TAILLE_MAX_MO} Mo maximum par photo · la première photo sert à la vérification.
        </p>
      </div>

      <GrillePhotos
        photos={proprietes.photos}
        maximum={maximum}
        desactive={inactif}
        erreur={proprietes.erreur}
        onFichiers={(fichiers) => proprietes.onFichiers?.(fichiers)}
        onRetirer={(id) => proprietes.onRetirer?.(id)}
      />

      {proprietes.sansPhoto === true ? (
        <p style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-alerte)" }}>
          Déclaré sans photo (mode dégradé) : le signalement sera soumis à vérification humaine.
        </p>
      ) : null}

      {proprietes.photos.length >= maximum ? (
        <p style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-texte-attenue)" }}>
          Maximum de {maximum} photos atteint : retirez une photo pour en ajouter une autre.
        </p>
      ) : null}

      {proprietes.photos.length === 0 && proprietes.onDeclarerSansPhoto && proprietes.sansPhoto !== true ? (
        <div>
          <Bouton variante="texte" desactive={inactif} onClick={proprietes.onDeclarerSansPhoto}>
            Je ne peux pas photographier
          </Bouton>
        </div>
      ) : null}
    </div>
  );
}
