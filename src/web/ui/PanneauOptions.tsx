import { useState, type ReactNode } from "react";
import { Check, Search } from "lucide-react";
import { Icone } from "./Icone.tsx";
import { filtrerParTexte } from "./liste.ts";
import { CLASSES } from "./jetons.ts";

/**
 * Panneau d'options d'une liste déroulante — recherche et navigation clavier.
 *
 * La recherche n'apparaît qu'au-delà du seuil d'options : trois catégories se lisent d'un coup
 * d'œil, vingt quartiers non. Le filtrage réutilise `filtrerParTexte` : accents et casse ignorés,
 * comme partout ailleurs dans l'application.
 */
export interface OptionSelect {
  readonly valeur: string;
  readonly libelle: string;
}

export interface ProprietesPanneauOptions {
  readonly idPanneau: string;
  readonly options: readonly OptionSelect[];
  readonly valeur: string;
  readonly seuilRecherche: number;
  readonly onChoisir: (valeur: string) => void;
}

export function PanneauOptions(proprietes: ProprietesPanneauOptions): ReactNode {
  const [recherche, setRecherche] = useState("");
  const [actif, setActif] = useState(0);
  const avecRecherche = proprietes.options.length >= proprietes.seuilRecherche;

  const filtrees = filtrerParTexte(proprietes.options, recherche, (option) => [option.libelle]);
  const position = Math.min(actif, Math.max(0, filtrees.length - 1));

  const deplacer = (pas: number): void => {
    if (filtrees.length === 0) return;
    setActif((precedent) => (precedent + pas + filtrees.length) % filtrees.length);
  };

  return (
    <div className="ui-select-panneau" id={proprietes.idPanneau}>
      {avecRecherche ? (
        <div className="ui-select-recherche">
          <Icone icone={Search} taille={16} />
          <input
            type="search"
            className="ui-focusable"
            autoFocus
            aria-label="Chercher dans la liste"
            placeholder="Chercher…"
            value={recherche}
            onChange={(evenement) => {
              setRecherche(evenement.currentTarget.value);
              setActif(0);
            }}
            onKeyDown={(evenement) => {
              if (evenement.key === "ArrowDown") {
                evenement.preventDefault();
                deplacer(1);
              } else if (evenement.key === "ArrowUp") {
                evenement.preventDefault();
                deplacer(-1);
              } else if (evenement.key === "Enter") {
                evenement.preventDefault();
                const choix = filtrees[position];
                if (choix) proprietes.onChoisir(choix.valeur);
              }
            }}
          />
        </div>
      ) : null}

      <ul
        role="listbox"
        aria-label="Options disponibles"
        className="ui-select-options"
        aria-activedescendant={filtrees[position] ? `${proprietes.idPanneau}-${filtrees[position].valeur}` : undefined}
      >
        {filtrees.length === 0 ? (
          <li className="ui-select-vide">Aucun résultat pour « {recherche} »</li>
        ) : (
          filtrees.map((option, index) => {
            const selectionnee = option.valeur === proprietes.valeur;
            return (
              <li
                key={option.valeur}
                id={`${proprietes.idPanneau}-${option.valeur}`}
                role="option"
                aria-selected={selectionnee ? "true" : "false"}
                data-actif={index === position ? "true" : undefined}
                className={[CLASSES.focusable, "ui-select-option"].join(" ")}
                onMouseEnter={() => setActif(index)}
                onClick={() => proprietes.onChoisir(option.valeur)}
              >
                <span>{option.libelle}</span>
                {selectionnee ? <Icone icone={Check} taille={16} /> : null}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
