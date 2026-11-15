import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Icone } from "./Icone.tsx";
import { PanneauOptions, type OptionSelect } from "./PanneauOptions.tsx";
import { CLASSES, TAILLE_TEXTE } from "./jetons.ts";

export type { OptionSelect };

/**
 * Liste déroulante thémée, avec recherche.
 *
 * Le `<select>` natif n'était pas habillable : le panneau d'options appartient au système, pas à
 * la page, et aucun thème ne l'atteint. Ici le panneau est rendu par l'application, donc il suit
 * `--ui-*` en clair comme en sombre.
 *
 * Au-delà de 7 options, une recherche apparaît : filtrer est plus rapide que faire défiler une
 * liste de quartiers. Elle reste masquée en dessous pour ne pas ajouter un champ inutile.
 *
 * Accessibilité : `role="combobox"` sur le déclencheur, `aria-expanded`, `aria-controls`,
 * `role="listbox"` sur le panneau, `aria-activedescendant` sur l'option survolée au clavier.
 * Échap ferme sans choisir ; Entrée choisit ; les flèches déplacent.
 */
export interface ProprietesChampSelect {
  readonly id: string;
  readonly libelle: string;
  readonly valeur: string;
  readonly options: readonly OptionSelect[];
  readonly onChange: (valeur: string) => void;
  readonly texteVide?: string;
  readonly aide?: string;
  readonly erreur?: string | null;
  readonly requis?: boolean;
  readonly desactive?: boolean;
  /** Nombre d'options au-delà duquel la recherche apparaît. */
  readonly seuilRecherche?: number;
}

export function ChampSelect(proprietes: ProprietesChampSelect): ReactNode {
  const [ouverte, setOuverte] = useState(false);
  const conteneur = useRef<HTMLDivElement | null>(null);
  const idBase = useId();
  const idPanneau = `${idBase}-panneau`;
  const idAide = `${proprietes.id}-aide`;
  const idErreur = `${proprietes.id}-erreur`;

  const enErreur = typeof proprietes.erreur === "string" && proprietes.erreur.length > 0;
  const sansOption = proprietes.options.length === 0;
  const inactif = proprietes.desactive === true || sansOption;
  const choix = proprietes.options.find((option) => option.valeur === proprietes.valeur) ?? null;
  const affiche = choix ? choix.libelle : sansOption ? "Aucune option disponible" : (proprietes.texteVide ?? "Sélectionner…");

  useEffect(() => {
    if (!ouverte) {
      return;
    }
    const surClic = (evenement: MouseEvent): void => {
      if (conteneur.current && !conteneur.current.contains(evenement.target as Node)) {
        setOuverte(false);
      }
    };
    const surTouche = (evenement: KeyboardEvent): void => {
      if (evenement.key === "Escape") {
        setOuverte(false);
      }
    };
    document.addEventListener("mousedown", surClic);
    document.addEventListener("keydown", surTouche);
    return () => {
      document.removeEventListener("mousedown", surClic);
      document.removeEventListener("keydown", surTouche);
    };
  }, [ouverte]);

  return (
    <div ref={conteneur} className="ui-champ-select">
      <label htmlFor={proprietes.id} style={{ fontSize: TAILLE_TEXTE.sm, fontWeight: 600, color: "var(--ui-texte)" }}>
        {proprietes.libelle}
        {proprietes.requis ? <span aria-hidden="true"> *</span> : null}
      </label>

      <button
        id={proprietes.id}
        type="button"
        role="combobox"
        className={[CLASSES.focusable, "ui-select"].join(" ")}
        aria-expanded={ouverte ? "true" : "false"}
        aria-controls={idPanneau}
        aria-haspopup="listbox"
        aria-required={proprietes.requis === true ? "true" : undefined}
        aria-invalid={enErreur ? "true" : undefined}
        aria-describedby={enErreur ? idErreur : proprietes.aide ? idAide : undefined}
        disabled={inactif}
        data-etat={choix ? "choisi" : "vide"}
        onClick={() => setOuverte((precedent) => !precedent)}
        onKeyDown={(evenement) => {
          if (evenement.key === "ArrowDown" || evenement.key === "Enter" || evenement.key === " ") {
            evenement.preventDefault();
            setOuverte(true);
          }
        }}
      >
        <span className="ui-select-libelle">{affiche}</span>
        <span className="ui-select-chevron" aria-hidden="true">
          <Icone icone={ChevronDown} taille={18} />
        </span>
      </button>

      {ouverte ? (
        <PanneauOptions
          idPanneau={idPanneau}
          options={proprietes.options}
          valeur={proprietes.valeur}
          seuilRecherche={proprietes.seuilRecherche ?? 7}
          onChoisir={(valeur) => {
            proprietes.onChange(valeur);
            setOuverte(false);
          }}
        />
      ) : null}

      {enErreur ? (
        <p id={idErreur} role="alert" style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-erreur)" }}>
          {proprietes.erreur}
        </p>
      ) : proprietes.aide ? (
        <p id={idAide} style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-texte-attenue)" }}>
          {proprietes.aide}
        </p>
      ) : null}
    </div>
  );
}
