import { useState, type ReactNode } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Icone } from "./Icone.tsx";
import { CLASSES, ESPACEMENT, TAILLE_TEXTE } from "./jetons.ts";

/**
 * Grille de dépôt de photos — l'image parle avant le texte.
 *
 * Le contrôle fichier est **natif et visible** dans chaque case vide : c'est le navigateur qui
 * ouvre son sélecteur, sans script intermédiaire. Le glisser-déposer reste actif sur la grille.
 *
 * Historique utile : quatre montages ont échoué (label implicite, `ref.click()`, input transparent
 * superposé, `showPicker()`) et un second bouton de diagnostic avait été ajouté pour isoler la
 * cause. Il s'est avéré que le défaut venait de l'onglet du navigateur, pas du composant : le
 * bouton de diagnostic a été retiré, l'input natif est resté.
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
            <span className="ui-photo-case-icone" aria-hidden="true">
              <Icone icone={ImagePlus} taille={22} />
            </span>
            <span className="ui-photo-case-titre">{premier ? "Ajouter une photo" : `Photo ${index + 1}`}</span>
            <input
              type="file"
              className="ui-photo-input ui-focusable"
              accept="image/jpeg,image/png,image/webp"
              multiple={restantes > 1}
              disabled={!libre}
              aria-label={`Choisir une photo, emplacement ${index + 1}`}
              onChange={(evenement) => {
                prendre(evenement.currentTarget.files);
                evenement.currentTarget.value = "";
              }}
            />
          </div>
        );
      })}

      {survol && libre ? (
        <p className="ui-grille-photos-depot" role="status">
          Déposez la photo pour l'ajouter
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
