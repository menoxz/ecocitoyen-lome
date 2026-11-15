import { useRef, useState, type ReactNode } from "react";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { Icone } from "./Icone.tsx";
import { CLASSES, ESPACEMENT, TAILLE_TEXTE } from "./jetons.ts";

/**
 * Grille de dépôt de photos — l'image parle avant le texte.
 *
 * Ouverture du sélecteur : trois approches ont échoué avant celle-ci (label implicite, `ref.click()`
 * depuis un input réduit à 1 px, input transparent superposé). La case est maintenant un
 * `<button>` qui appelle `showPicker()` — l'API prévue pour ouvrir le sélecteur depuis une
 * activation utilisateur, y compris quand l'input est masqué — avec `click()` en repli pour les
 * navigateurs qui ne l'implémentent pas encore.
 *
 * Le glisser-déposer reste actif sur toute la grille. Un aperçu qui ne se charge pas laisse voir le
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
  const champ = useRef<HTMLInputElement | null>(null);
  const restantes = Math.max(0, proprietes.maximum - proprietes.photos.length);
  const libre = proprietes.desactive !== true && restantes > 0;

  const prendre = (liste: FileList | null): void => {
    if (!liste || liste.length === 0) {
      return;
    }
    proprietes.onFichiers(Array.from(liste).slice(0, restantes));
  };

  /** Ouvre le sélecteur natif depuis le clic de l'usager (activation utilisateur garantie). */
  const ouvrirSelecteur = (): void => {
    const input = champ.current;
    if (!input || !libre) {
      return;
    }
    try {
      input.showPicker();
    } catch {
      input.click();
    }
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
      <input
        ref={champ}
        type="file"
        className="ui-sr-only"
        accept="image/jpeg,image/png,image/webp"
        multiple={restantes > 1}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(evenement) => {
          prendre(evenement.currentTarget.files);
          evenement.currentTarget.value = "";
        }}
      />

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
          <button
            key={`site-${index}`}
            type="button"
            className={[CLASSES.focusable, "ui-photo-case ui-photo-case--vide"].join(" ")}
            data-site={`photo-${index + 1}`}
            disabled={!libre}
            onClick={ouvrirSelecteur}
          >
            <span className="ui-photo-case-icone" aria-hidden="true">
              <Icone icone={premier ? ImagePlus : Upload} taille={24} />
            </span>
            <span className="ui-photo-case-titre">{premier ? "Ajouter une photo" : `Photo ${index + 1}`}</span>
            <span className="ui-photo-case-aide">{premier ? "Cliquez ou déposez ici" : "Emplacement libre"}</span>
          </button>
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
