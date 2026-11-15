import type { ReactNode } from "react";
import { CLASSES, PRIORITES, type ClePriorite } from "./jetons.ts";

/**
 * Badge de priorité — états couverts : repos, avec score, sans score, priorité inconnue.
 *
 * Le score suggéré est affiché à côté du niveau : un superviseur doit voir sur quoi la
 * proposition repose, pas seulement sa conclusion.
 *
 * La teinte vient de `ui.css` via `data-priorite`, comme le badge de statut : plus aucune couleur
 * en dur, donc le badge suit le thème clair ou sombre sans code supplémentaire.
 */
export interface ProprietesBadgePriorite {
  readonly priorite: ClePriorite | string;
  readonly score?: number | null;
}

export function BadgePriorite(proprietes: ProprietesBadgePriorite): ReactNode {
  const teinte = (PRIORITES as Record<string, { readonly libelle: string }>)[proprietes.priorite];
  const libelle = teinte ? teinte.libelle : String(proprietes.priorite);
  const score = typeof proprietes.score === "number" && Number.isFinite(proprietes.score) ? proprietes.score : null;

  return (
    <span className={CLASSES.badge} data-priorite={proprietes.priorite}>
      <span>Priorité {libelle}</span>
      {score !== null ? <span aria-label={`score ${score}`}>{score}</span> : null}
    </span>
  );
}
