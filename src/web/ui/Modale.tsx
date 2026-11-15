"use client";
import { useEffect, type ReactNode } from "react";
import { Bouton } from "./Bouton.tsx";
import { CLASSES } from "./jetons.ts";

/**
 * Fenêtre modale — états couverts : repos, fermeture par Échap, fermeture par action, contenu en
 * chargement, contenu en erreur (portés par les enfants), taille explicite.
 *
 * Trois zones, et une seule défile :
 *   - l'en-tête (titre + fermeture) reste en place ;
 *   - le corps défile quand le contenu dépasse la hauteur disponible ;
 *   - le pied, s'il y en a un, reste visible sous le corps.
 *
 * La largeur est bornée par une **taille nommée**, pas par la largeur de l'écran : une modale qui
 * s'étire sur 1920 px redevient une page, et un formulaire en une colonne y flotte au milieu du
 * vide. `pleineLargeur` reste accepté pour les rares contenus réellement larges (tableau).
 *
 * Accessibilité (DESIGN.md §3.1) : `role="dialog"`, `aria-modal`, titre relié, Échap ferme.
 */
export type TailleModale = "etroite" | "standard" | "large";

export interface ProprietesModale {
  readonly ouverte: boolean;
  readonly titre: string;
  readonly children: ReactNode;
  readonly libelleFermeture?: string;
  readonly onFermer?: () => void;
  /** Réservé aux contenus larges (tableau, aperçu) ; par défaut, la largeur est bornée. */
  readonly pleineLargeur?: boolean;
  readonly taille?: TailleModale;
  /** Actions du pied : elles restent visibles pendant que le corps défile. */
  readonly actions?: ReactNode;
}

export function Modale(proprietes: ProprietesModale): ReactNode {
  useEffect(() => {
    if (!proprietes.ouverte) {
      return;
    }
    const surTouche = (evenement: KeyboardEvent): void => {
      if (evenement.key === "Escape") {
        proprietes.onFermer?.();
      }
    };
    document.addEventListener("keydown", surTouche);
    return () => document.removeEventListener("keydown", surTouche);
  }, [proprietes.ouverte, proprietes.onFermer]);

  if (!proprietes.ouverte) {
    return null;
  }

  const taille = proprietes.pleineLargeur === true ? "pleine" : (proprietes.taille ?? "standard");

  return (
    <div className="ui-modale-voile">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ui-modale-titre"
        className={`ui-modale ui-modale--${taille}`}
      >
        <div className="ui-modale-entete">
          <h2 id="ui-modale-titre" className="ui-modale-titre">
            {proprietes.titre}
          </h2>
          <Bouton
            variante="texte"
            taille="sm"
            libelleAccessible={proprietes.libelleFermeture ?? "Fermer"}
            onClick={proprietes.onFermer}
          >
            Fermer
          </Bouton>
        </div>

        <div className={`ui-modale-corps ${CLASSES.focusable}`}>{proprietes.children}</div>

        {proprietes.actions ? <div className="ui-modale-pied">{proprietes.actions}</div> : null}
      </div>
    </div>
  );
}
