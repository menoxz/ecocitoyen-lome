import { useId, useRef, useState, type ReactNode } from "react";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { Icone } from "./Icone.tsx";
import { CLASSES, ESPACEMENT, TAILLE_TEXTE } from "./jetons.ts";

/**
 * Grille de dépôt de photos — l'image parle avant le texte.
 *
 * Trois emplacements fixes, dessinés même vides : le citoyen voit du premier coup d'œil combien de
 * photos sont attendues, sans lire une phrase. Chaque case vide est une cible : clic (sélecteur de
 * fichiers) ou dépôt direct (glisser-déposer). Une case pleine montre l'aperçu et un retrait nommé.
 *
 * Les limites (3 photos, 5 Mo, JPEG/PNG/WebP) sont portées par l'appelant : ce composant ne décide
 * de rien, il transmet les fichiers choisis et rend ce qu'on lui donne.
 */
export interface PhotoGrille {
  readonly id: string;
  readonly nom: string;
  readonly urlApercu?: string;
}

export interface ProprietesGrillePhotos {
  readonly photos: readonly PhotoGrille[];
  readonly maximum: number;
  readonly desactive?: boolean;
  readonly erreur?: string | null;
  readonly onFichiers: (fichiers: readonly File[]) => void;
  readonly onRetirer: (id: string) => void;
}

export function GrillePhotos(proprietes: ProprietesGrillePhotos): ReactNode {
  const [survol, setSurvol] = useState(false);
  const champ = useRef<HTMLInputElement | null>(null);
  const idBase = useId();
  const restantes = Math.max(0, proprietes.maximum - proprietes.photos.length);
  const libre = proprietes.desactive !== true && restantes > 0;

  const prendre = (liste: FileList | null): void => {
    if (!liste || liste.length === 0) {
      return;
    }
    proprietes.onFichiers(Array.from(liste).slice(0, restantes));
  };

  return (
    <div
      className="ui-grille-photos"
      data-survol={survol && libre ? "true" : undefined}
      onDragOver={(evenement) => {
        if (!libre) return;
        evenement.preventDefault();
        setSurvol(true);
      }}
      onDragLeave={() => setSurvol(false)}
      onDrop={(evenement) => {
        if (!libre) return;
        evenement.preventDefault();
        setSurvol(false);
        prendre(evenement.dataTransfer.files);
      }}
    >
      {Array.from({ length: proprietes.maximum }, (_, index) => {
        const photo = proprietes.photos[index];

        if (photo) {
          return (
            <figure key={photo.id} className="ui-photo-case ui-photo-case--pleine">
              {photo.urlApercu ? (
                <img
                  src={photo.urlApercu}
                  alt={`Photo ${index + 1} du problème`}
                  onError={() => {
                    // Un aperçu illisible (fichier abîmé, format non rendu) ne doit pas laisser
                    // un carré vide : on retombe sur le nom, et la photo reste retirable.
                    const cible = document.querySelector(`[data-apercu="${photo.id}"]`);
                    cible?.setAttribute("data-apercu-casse", "true");
                  }}
                  data-apercu={photo.id}
                />
              ) : null}
              <span className="ui-photo-case-vide-texte" data-apercu-repli={photo.id}>
                {photo.nom}
              </span>
              <button
                type="button"
                className="ui-photo-retirer ui-focusable"
                aria-label={`Retirer la photo ${photo.nom}`}
                onClick={() => proprietes.onRetirer(photo.id)}
              >
                <Icone icone={Trash2} taille={16} />
              </button>
              <figcaption className="ui-photo-legende">
                {index === 0 ? "Sert à la vérification" : `Photo ${index + 1}`}
              </figcaption>
            </figure>
          );
        }

        const premier = index === 0;
        return (
          <label
            key={`${idBase}-${index}`}
            className="ui-photo-case ui-photo-case--vide ui-focusable"
            data-site={`photo-${index + 1}`}
            aria-disabled={libre ? undefined : "true"}
          >
            <input
              ref={premier ? champ : undefined}
              type="file"
              className="ui-sr-only"
              accept="image/jpeg,image/png,image/webp"
              disabled={!libre}
              onChange={(evenement) => {
                prendre(evenement.currentTarget.files);
                evenement.currentTarget.value = "";
              }}
            />
            <span className="ui-photo-case-icone" aria-hidden="true">
              <Icone icone={premier ? ImagePlus : Upload} taille={24} />
            </span>
            <span className="ui-photo-case-titre">{premier ? "Ajouter une photo" : `Photo ${index + 1}`}</span>
            <span className="ui-photo-case-aide">{premier ? "Cliquez ou déposez ici" : "Emplacement libre"}</span>
          </label>
        );
      })}

      {survol && libre ? (
        <p className="ui-grille-photos-depot" role="status">
          Déposez la photo pour l ajouter
        </p>
      ) : null}

      {proprietes.erreur ? (
        <p role="alert" style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-erreur)", gridColumn: "1 / -1", padding: `0 ${ESPACEMENT.e1}px` }}>
          {proprietes.erreur}
        </p>
      ) : null}

      <p className={CLASSES.visuellementCache} aria-live="polite">
        {proprietes.photos.length} photo(s) sur {proprietes.maximum}.
      </p>
    </div>
  );
}
