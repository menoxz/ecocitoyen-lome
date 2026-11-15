import type { ReactNode } from "react";
import { CLASSES, STATUTS, type CleStatut } from "./jetons.ts";

/**
 * Badge de statut — états couverts : repos, désactivé (aucun), et surtout « statut inconnu ».
 *
 * Le libellé est toujours écrit : la couleur seule ne porte jamais l''information (daltonisme).
 * Un statut hors vocabulaire affiche son code brut plutôt que de mentir sur une couleur.
 */
export interface ProprietesBadgeStatut {
  readonly statut: CleStatut | string;
  readonly compact?: boolean;
}

export function BadgeStatut(proprietes: ProprietesBadgeStatut): ReactNode {
  const teinte = (STATUTS as Record<string, { texte: string; fond: string; bordure: string; libelle: string }>)[
    proprietes.statut
  ];
  const libelle = teinte ? teinte.libelle : String(proprietes.statut);
  const texte = teinte ? teinte.texte : "#374151";
  const fond = teinte ? teinte.fond : "#f3f4f6";
  const bordure = teinte ? teinte.bordure : "#d1d5db";

  return (
    <span
      className={CLASSES.badge}
      style={{ color: texte, backgroundColor: fond, borderColor: bordure }}
      data-statut={proprietes.statut}
    >
      <span aria-hidden="true">●</span>
      <span>{libelle}</span>
    </span>
  );
}