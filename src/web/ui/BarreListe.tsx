import type { ReactNode } from "react";
import { ArrowUpDown, Search, X } from "lucide-react";
import { Icone } from "./Icone.tsx";

/**
 * Barre de liste — niveau 2 de la hiérarchie de découverte.
 *
 * Trois gestes dans l'ordre de fréquence d'usage sur le terrain : chercher (le plus fréquent),
 * filtrer par facette, puis trier (le plus rare, donc à droite). Le compteur de résultats est
 * annoncé en `aria-live` : après une frappe, l'utilisateur sait immédiatement combien d'objets
 * restent, sans avoir à parcourir la liste.
 *
 * La barre ne filtre rien : elle remonte les intentions, la page applique `liste.ts`.
 */
export interface OptionTri {
  readonly valeur: string;
  readonly libelle: string;
}

export interface ProprietesBarreListe {
  readonly idRecherche: string;
  readonly libelleRecherche: string;
  readonly exempleRecherche: string;
  readonly recherche: string;
  readonly onRecherche: (valeur: string) => void;
  readonly tri?: {
    readonly options: readonly OptionTri[];
    readonly valeur: string;
    readonly onChange: (valeur: string) => void;
  };
  readonly filtres?: ReactNode;
  readonly resume: string;
}

export function BarreListe(proprietes: ProprietesBarreListe): ReactNode {
  return (
    <div className="ui-barre-liste">
      <div className="ui-barre-liste-rangee">
        <div className="ui-recherche">
          <label htmlFor={proprietes.idRecherche} className="ui-sr-only">
            {proprietes.libelleRecherche}
          </label>
          <Icone icone={Search} taille={18} />
          <input
            id={proprietes.idRecherche}
            className="ui-champ ui-focusable"
            type="search"
            value={proprietes.recherche}
            placeholder={proprietes.exempleRecherche}
            onChange={(evenement) => proprietes.onRecherche(evenement.currentTarget.value)}
          />
          {proprietes.recherche.length > 0 ? (
            <button
              type="button"
              className="ui-recherche-effacer ui-focusable"
              aria-label="Effacer la recherche"
              onClick={() => proprietes.onRecherche("")}
            >
              <Icone icone={X} taille={16} />
            </button>
          ) : null}
        </div>

        {proprietes.tri ? (
          <div className="ui-tri">
            <Icone icone={ArrowUpDown} taille={16} />
            <label htmlFor={`${proprietes.idRecherche}-tri`} className="ui-sr-only">
              Trier la liste
            </label>
            <select
              id={`${proprietes.idRecherche}-tri`}
              className="ui-champ ui-focusable"
              value={proprietes.tri.valeur}
              onChange={(evenement) => proprietes.tri?.onChange(evenement.currentTarget.value)}
            >
              {proprietes.tri.options.map((option) => (
                <option key={option.valeur} value={option.valeur}>
                  {option.libelle}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {proprietes.filtres ? <div className="ui-barre-filtres">{proprietes.filtres}</div> : null}

      <p className="ui-barre-resume" role="status" aria-live="polite">
        {proprietes.resume}
      </p>
    </div>
  );
}
