import type { ReactNode } from "react";
import { CLASSES, CIBLE_TACTILE, TAILLE_TEXTE } from "./jetons.ts";

/**
 * Bouton — états couverts : repos, survol, focus clavier, actif, désactivé, chargement.
 *
 * Les couleurs et les états vivent dans `ui.css`, pas ici : une couleur posée en style inline
 * gagne sur la feuille et gèle le composant en thème clair. C'est ce qui empêchait le mode sombre
 * d'atteindre les boutons.
 *
 * Règles (docs/design/DESIGN.md §3.1) : une seule variante `primaire` par écran ; en chargement
 * le libellé est conservé et la largeur ne bouge pas ; désactivé reste dans le DOM pour que le
 * clavier puisse l'atteindre et lire pourquoi.
 */
export type VarianteBouton = "primaire" | "secondaire" | "texte" | "danger";
export type TailleBouton = "sm" | "md" | "lg";

export interface ProprietesBouton {
  readonly children: ReactNode;
  /** Verbe à l'infinitif : « Envoyer », « Valider », « Clôturer ». */
  readonly libelleAccessible?: string;
  readonly variante?: VarianteBouton;
  readonly taille?: TailleBouton;
  readonly type?: "button" | "submit";
  readonly desactive?: boolean;
  readonly enChargement?: boolean;
  readonly pleineLargeur?: boolean;
  readonly onClick?: () => void;
}

const HAUTEUR: Readonly<Record<TailleBouton, number>> = { sm: 36, md: CIBLE_TACTILE, lg: 52 };
const TAILLE_POLICE: Readonly<Record<TailleBouton, number>> = {
  sm: TAILLE_TEXTE.sm,
  md: TAILLE_TEXTE.md,
  lg: TAILLE_TEXTE.lg,
};

const CLASSE_DE_VARIANTE: Readonly<Record<VarianteBouton, string>> = {
  primaire: CLASSES.boutonPrimaire,
  secondaire: CLASSES.secondaire,
  danger: CLASSES.danger,
  texte: "ui-bouton--texte",
};

export function Bouton(proprietes: ProprietesBouton): ReactNode {
  const variante = proprietes.variante ?? "secondaire";
  const taille = proprietes.taille ?? "md";
  const inactif = proprietes.desactive === true || proprietes.enChargement === true;

  const classes = [
    CLASSES.bouton,
    CLASSES.focusable,
    CLASSE_DE_VARIANTE[variante],
    proprietes.pleineLargeur ? "ui-bouton--large" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={proprietes.type ?? "button"}
      className={classes}
      aria-label={proprietes.libelleAccessible}
      aria-busy={proprietes.enChargement === true ? "true" : undefined}
      aria-disabled={inactif ? "true" : undefined}
      disabled={inactif}
      onClick={inactif ? undefined : proprietes.onClick}
      style={{
        minHeight: HAUTEUR[taille],
        height: HAUTEUR[taille],
        width: proprietes.pleineLargeur ? "100%" : undefined,
        fontSize: TAILLE_POLICE[taille],
      }}
    >
      <span>{proprietes.children}</span>
      {proprietes.enChargement ? <span aria-hidden="true">…</span> : null}
    </button>
  );
}
