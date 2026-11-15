import type { ReactNode } from "react";

/**
 * Routeur minimal par fragment d'URL (`#/signaler`).
 *
 * Pas de dépendance : le cahier des charges demande six vues, pas un framework de routage.
 * Un routeur maison de trente lignes est plus facile à lire qu'une configuration, et il évite
 * un paquet supplémentaire dans le bundle initial (ENF02).
 *
 * `resoudre` est pur et testable : la correspondance route → vue se vérifie sans navigateur.
 */
export const ROUTES = ["accueil", "signaler"] as const;
export type Route = (typeof ROUTES)[number];

export function resoudre(fragment: string): Route {
  const propre = fragment.replace(/^#\/?/, "").split("?")[0].toLowerCase();
  if (propre === "signaler") {
    return "signaler";
  }
  return "accueil";
}

export function lien(route: Route): string {
  return route === "accueil" ? "#/" : `#/${route}`;
}

/** Lit le fragment courant, avec repli sur l''accueil quand l''environnement n''en fournit pas. */
export function fragmentCourant(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return window.location.hash;
}

export interface ProprietesRouteur {
  readonly fragment: string;
  readonly rendu: Readonly<Record<Route, ReactNode>>;
}

export function Routeur(proprietes: ProprietesRouteur): ReactNode {
  return proprietes.rendu[resoudre(proprietes.fragment)] ?? null;
}