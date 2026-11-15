import type { ReactNode } from "react";
import { Bouton } from "./Bouton.tsx";
import { COULEURS, ESPACEMENT, TAILLE_TEXTE } from "./jetons.ts";

/**
 * État vide — l''état le plus souvent oublié, et le plus fréquent en démonstration.
 *
 * Règle (docs/design/PARCOURS.md §10) : une phrase qui explique pourquoi c''est vide, et une
 * action qui permet d''en sortir. Un écran vide sans action est un cul-de-sac.
 */
export interface ProprietesEtatVide {
  readonly titre: string;
  readonly explication: string;
  readonly libelleAction?: string;
  readonly onAction?: () => void;
}

export function EtatVide(proprietes: ProprietesEtatVide): ReactNode {
  return (
    <div
      role="status"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: ESPACEMENT.e3,
        padding: `${ESPACEMENT.e8}px ${ESPACEMENT.e4}px`,
        textAlign: "center",
        backgroundColor: COULEURS.surfaceAlt,
        borderRadius: 8,
      }}
    >
      <p style={{ margin: 0, fontSize: TAILLE_TEXTE.lg, fontWeight: 600, color: COULEURS.texte }}>{proprietes.titre}</p>
      <p style={{ margin: 0, fontSize: TAILLE_TEXTE.md, color: COULEURS.texteAttenue, maxWidth: 420 }}>
        {proprietes.explication}
      </p>
      {proprietes.libelleAction && proprietes.onAction ? (
        <Bouton variante="primaire" onClick={proprietes.onAction}>
          {proprietes.libelleAction}
        </Bouton>
      ) : null}
    </div>
  );
}