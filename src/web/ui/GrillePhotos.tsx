import { useState, type ReactNode } from "react";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { Icone } from "./Icone.tsx";
import { CLASSES, ESPACEMENT, TAILLE_TEXTE } from "./jetons.ts";

/**
 * Grille de dépôt de photos — l'image parle avant le texte.
 *
 * Trois emplacements fixes, dessinés même vides. Une case vide est **couverte** par son propre
 * `<input type="file">` rendu transparent : le clic de l'usager atteint directement le contrôle
 * natif, donc le navigateur ouvre son sélecteur. La version précédente appelait `input.click()`
 * depuis un input réduit à 1 px (`sr-only`) : rien ne s'ouvrait.
 *
 * Le glisser-déposer reste actif sur toute la grille, et le nombre de photos déjà prises décide de
 * ce qui reste acceptable. Les limites (3 photos, 5 Mo, JPEG/PNG/WebP) sont portées par l'appelant.
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
                  data-apercu={photo.id}
                  onError={() => {
                    const cible = document.querySelector(`[data-apercu="${photo.id}"]`);
                    cible?.setAttribute("data-apercu-casse", "true");
                  }}
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
          <div
            key={`site-${index}`}
            className="ui-photo-case ui-photo-case--vide"
            data-site={`photo-${index + 1}`}
            data-desactive={libre ? undefined : "true"}
          >
            <input
              type="file"
              className="ui-photo-input ui-focusable"
              accept="image/jpeg,image/png,image/webp"
              multiple={restantes > 1}
              disabled={!libre}
              aria-label={`Ajouter une photo, emplacement ${index + 1}`}
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
          </div>
        );
      })}

      {survol && libre ? (
        <p className="ui-grille-photos-depot" role="status">
          Déposez la photo pour l ajouter
        </p>
      ) : null}

      {proprietes.erreur ? (
        <p
          role="alert"
          style={{
            margin: 0,
            fontSize: TAILLE_TEXTE.sm,
            color: "var(--ui-erreur)",
            gridColumn: "1 / -1",
            padding: `0 ${ESPACEMENT.e1}px`,
          }}
        >
          {proprietes.erreur}
        </p>
      ) : null}

      <p className={CLASSES.visuellementCache} aria-live="polite">
        {proprietes.photos.length} photo(s) sur {proprietes.maximum}.
      </p>
    </div>
  );
}
