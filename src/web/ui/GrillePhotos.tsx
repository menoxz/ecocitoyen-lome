import { useRef, useState, type ReactNode } from "react";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { Icone } from "./Icone.tsx";
import { CLASSES, ESPACEMENT, TAILLE_TEXTE } from "./jetons.ts";

/**
 * Grille de dépôt de photos — l'image parle avant le texte.
 *
 * Ouverture du sélecteur : l'`<input type="file">` natif **couvre toute la case** et le contenu
 * visuel est rendu transparent au clic (`pointer-events: none`). C'est le seul montage qui ne
 * dépend d'aucun script : le navigateur ouvre son sélecteur comme pour n'importe quel champ fichier.
 *
 * Les tentatives précédentes échouaient parce que le clic atteignait le texte de la case, pas le
 * contrôle : `label` implicite, puis `ref.click()` sur un input réduit à 1 px, puis `showPicker()`
 * depuis un bouton dont le contenu captait le clic. Ici le hit-test ne peut pas se tromper.
 *
 * Le glisser-déposer reste actif sur toute la grille. Un aperçu qui ne charge pas laisse voir le
 * nom du fichier au lieu d'un carré vide.
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
  const compteur = useRef(0);
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
        compteur.current += 1;
        const idChamp = `photo-emplacement-${compteur.current}-${index}`;

        return (
          <div
            key={`site-${index}`}
            className="ui-photo-case ui-photo-case--vide"
            data-site={`photo-${index + 1}`}
            data-desactive={libre ? undefined : "true"}
          >
            <input
              id={idChamp}
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
            <span className="ui-photo-visuel" aria-hidden="true">
              <span className="ui-photo-case-icone">
                <Icone icone={premier ? ImagePlus : Upload} taille={24} />
              </span>
              <span className="ui-photo-case-titre">{premier ? "Ajouter une photo" : `Photo ${index + 1}`}</span>
              <span className="ui-photo-case-aide">{premier ? "Cliquez ou déposez ici" : "Emplacement libre"}</span>
            </span>
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
