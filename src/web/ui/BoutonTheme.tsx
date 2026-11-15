import { useEffect, useState, type ReactNode } from "react";
import {
  ATTRIBUT_THEME,
  CLE_THEME,
  attributTheme,
  choixDepuis,
  libelleTheme,
  type ChoixTheme,
} from "./theme-sombre.ts";

/**
 * Sélecteur de thème de l'en-tête : automatique, clair ou sombre.
 *
 * Trois boutons plutôt qu'une bascule à deux états : « automatique » est un choix à part entière,
 * et le retirer forcerait un thème à un visiteur qui suit son système. Le choix est mémorisé
 * localement ; en navigation privée, l'écriture peut échouer et le choix vaut alors pour la page.
 */
const CHOIX: readonly ChoixTheme[] = ["auto", "clair", "sombre"];

function lireChoixMemorise(): string | null {
  try {
    return window.localStorage.getItem(CLE_THEME);
  } catch {
    return null;
  }
}

function memoriser(choix: ChoixTheme): void {
  try {
    window.localStorage.setItem(CLE_THEME, choix);
  } catch {
    // Stockage refusé : le thème reste appliqué pour la page en cours.
  }
}

function appliquer(choix: ChoixTheme): void {
  const valeur = attributTheme(choix);
  const racine = document.documentElement;
  if (valeur === null) {
    racine.removeAttribute(ATTRIBUT_THEME);
    return;
  }
  racine.setAttribute(ATTRIBUT_THEME, valeur);
}

export function BoutonTheme(): ReactNode {
  const [choix, setChoix] = useState<ChoixTheme>("auto");

  useEffect(() => {
    setChoix(choixDepuis(lireChoixMemorise()));
  }, []);

  useEffect(() => {
    appliquer(choix);
    memoriser(choix);
  }, [choix]);

  return (
    <div className="ui-theme" role="group" aria-label="Thème d'affichage">
      {CHOIX.map((valeur) => (
        <button
          key={valeur}
          type="button"
          aria-pressed={choix === valeur}
          onClick={() => setChoix(valeur)}
        >
          {libelleTheme(valeur)}
        </button>
      ))}
    </div>
  );
}
