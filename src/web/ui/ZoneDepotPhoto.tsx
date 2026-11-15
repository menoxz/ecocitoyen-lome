import type { ReactNode } from "react";
import { Bouton } from "./Bouton.tsx";
import { COULEURS, ESPACEMENT, RAYON, TAILLE_TEXTE } from "./jetons.ts";

/**
 * Dépôt de photos — états couverts : vide (invite), avec photos, erreur de fichier, désactivé,
 * chargement, mode dégradé (sans photo), maximum atteint.
 *
 * Trois photos au plus, 5 Mo par photo, JPEG/PNG/WebP : les limites sont annoncées avant le
 * choix du fichier, pas découvertes après un refus. Le message d''erreur affiché est celui du
 * serveur (`PHOTO_INVALIDE`, motif compris) — le client ne réécrit pas la raison.
 */
export interface PhotoChoisie {
  readonly id: string;
  readonly nom: string;
  readonly urlApercu?: string;
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
  readonly onAjouter?: () => void;
  readonly onRetirer?: (id: string) => void;
  readonly onDeclarerSansPhoto?: () => void;
}

export const PHOTOS_MAX = 3;
export const TAILLE_MAX_MO = 5;

export function ZoneDepotPhoto(proprietes: ProprietesZoneDepotPhoto): ReactNode {
  const maximum = proprietes.maximum ?? PHOTOS_MAX;
  const complet = proprietes.photos.length >= maximum;
  const enErreur = typeof proprietes.erreur === "string" && proprietes.erreur.length > 0;
  const inactif = proprietes.desactive === true || proprietes.enChargement === true;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e2 }}>
      <p style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, fontWeight: 600, color: COULEURS.texte }}>
        Photos du problème ({proprietes.photos.length}/{maximum})
      </p>
      <p style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: COULEURS.texteAttenue }}>
        JPEG, PNG ou WebP · {TAILLE_MAX_MO} Mo maximum par photo · la première photo sert à la vérification.
      </p>

      {proprietes.photos.length === 0 && !proprietes.sansPhoto ? (
        <p style={{ margin: 0, fontSize: TAILLE_TEXTE.md, color: COULEURS.texte }}>
          Aucune photo pour le moment : commencez par en ajouter une.
        </p>
      ) : null}

      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexWrap: "wrap", gap: ESPACEMENT.e2 }}>
        {proprietes.photos.map((photo) => (
          <li
            key={photo.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: ESPACEMENT.e1,
              padding: ESPACEMENT.e1,
              border: `1px solid ${COULEURS.bordure}`,
              borderRadius: RAYON.sm,
            }}
          >
            <span style={{ fontSize: TAILLE_TEXTE.xs, color: COULEURS.texte }}>{photo.nom}</span>
            <Bouton
              variante="texte"
              taille="sm"
              libelleAccessible={`Retirer la photo ${photo.nom}`}
              desactive={inactif}
              onClick={() => proprietes.onRetirer?.(photo.id)}
            >
              Retirer
            </Bouton>
          </li>
        ))}
      </ul>

      {proprietes.sansPhoto === true ? (
        <p style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: COULEURS.alerte }}>
          Déclaré sans photo (mode dégradé) : le signalement sera soumis à vérification humaine.
        </p>
      ) : null}

      {enErreur ? (
        <p role="alert" style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: COULEURS.erreur }}>
          {proprietes.erreur}
        </p>
      ) : null}

      <div style={{ display: "flex", gap: ESPACEMENT.e2, flexWrap: "wrap" }}>
        <Bouton
          variante={proprietes.photos.length === 0 ? "primaire" : "secondaire"}
          desactive={inactif || complet}
          enChargement={proprietes.enChargement === true}
          onClick={proprietes.onAjouter}
        >
          {complet ? `Maximum de ${maximum} photos atteint` : "Ajouter une photo"}
        </Bouton>

        {proprietes.photos.length === 0 && proprietes.onDeclarerSansPhoto ? (
          <Bouton variante="texte" desactive={inactif} onClick={proprietes.onDeclarerSansPhoto}>
            Je ne peux pas photographier
          </Bouton>
        ) : null}
      </div>
    </div>
  );
}