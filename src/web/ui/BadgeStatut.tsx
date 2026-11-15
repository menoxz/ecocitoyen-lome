import type { ReactNode } from "react";
import { CLASSES, STATUTS, type CleStatut } from "./jetons.ts";

/**
 * Badge de statut — états couverts : repos, et surtout « statut inconnu ».
 *
 * Le libellé est toujours écrit : la couleur seule ne porte jamais l'information (daltonisme).
 * Un statut hors vocabulaire affiche son code brut plutôt que de mentir sur une couleur.
 *
 * La teinte n'est plus posée ici : elle est portée par `ui.css` via `data-statut`, ce qui permet
 * au badge de basculer en mode sombre avec le reste de la page.
 */
export interface ProprietesBadgeStatut {
  readonly statut: CleStatut | string;
  readonly compact?: boolean;
}

export function BadgeStatut(proprietes: ProprietesBadgeStatut): ReactNode {
  const teinte = (STATUTS as Record<string, { readonly libelle: string }>)[proprietes.statut];
  const libelle = teinte ? teinte.libelle : String(proprietes.statut);

  return (
    <span className={CLASSES.badge} data-statut={proprietes.statut}>
      <span aria-hidden="true">●</span>
      <span>{libelle}</span>
    </span>
  );
}
