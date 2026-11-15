import type { ReactNode } from "react";
import { CLASSES } from "./jetons.ts";

/**
 * Facettes de filtrage — génériques, une par axe (priorité, rôle, statut…).
 *
 * Chaque facette porte son compteur, calculé sur les objets réellement reçus : une facette à zéro
 * reste visible mais désactivée, pour ne pas laisser croire que la valeur n'existe pas.
 */
export interface Facette {
  readonly cle: string;
  readonly libelle: string;
  readonly nombre: number;
}

export interface ProprietesFacettes {
  readonly facettes: readonly Facette[];
  readonly selection: string;
  readonly etiquette: string;
  readonly onSelectionner: (cle: string) => void;
}

export function Facettes(proprietes: ProprietesFacettes): ReactNode {
  return (
    <div role="group" aria-label={proprietes.etiquette} className="ui-facettes">
      {proprietes.facettes.map((facette) => {
        const selectionnee = facette.cle === proprietes.selection;
        return (
          <button
            key={facette.cle}
            type="button"
            className={[CLASSES.focusable, "ui-facette"].join(" ")}
            aria-pressed={selectionnee ? "true" : "false"}
            data-selectionnee={selectionnee ? "true" : "false"}
            disabled={facette.nombre === 0 && !selectionnee}
            onClick={() => proprietes.onSelectionner(facette.cle)}
          >
            {facette.libelle}
            <span className="ui-facette-nombre">{facette.nombre}</span>
          </button>
        );
      })}
    </div>
  );
}
