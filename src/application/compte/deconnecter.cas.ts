import type { Dependances } from "../dependances.type.ts";

/**
 * Déconnexion : la session est supprimée en base, pas seulement oubliée côté navigateur.
 * Un jeton volé cesse donc d''être utilisable immédiatement.
 */
export function deconnecter(idUtilisateur: string, deps: Dependances): number {
  return deps.sessions.supprimerPourUtilisateur(idUtilisateur);
}