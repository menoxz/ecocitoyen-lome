import type { ReactNode } from "react";
import { CLASSES, PRIORITES, type ClePriorite } from "./jetons.ts";

/**
 * Badge de priorité — états couverts : repos, avec score, sans score, priorité inconnue.
 *
 * Le score suggéré est affiché à côté du niveau : un superviseur doit voir sur quoi la
 * proposition repose, pas seulement sa conclusion.
 */
export interface ProprietesBadgePriorite {
  readonly priorite: ClePriorite | string;
  readonly score?: number | null;
}

export function BadgePriorite(proprietes: ProprietesBadgePriorite): ReactNode {
  const teinte = (PRIORITES as Record<string, { texte: string; fond: string; bordure: string; libelle: string }>)[
    proprietes.priorite
  ];
  const libelle = teinte ? teinte.libelle : String(proprietes.priorite);
  const texte = teinte ? teinte.texte : "#374151";
  const fond = teinte ? teinte.fond : "#f3f4f6";
  const bordure = teinte ? teinte.bordure : "#d1d5db";
  const score = typeof proprietes.score === "number" && Number.isFinite(proprietes.score) ? proprietes.score : null;

  return (
    <span className={CLASSES.badge} style={{ color: texte, backgroundColor: fond, borderColor: bordure }}>
      <span>Priorité {libelle}</span>
      {score !== null ? <span aria-label={`score ${score}`}>{score}</span> : null}
    </span>
  );
}