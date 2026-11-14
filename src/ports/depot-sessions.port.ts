export interface Session {
  readonly jetonHache: string;
  readonly idUtilisateur: string;
  readonly expireLe: string;
  readonly creeLe: string;
}

export interface DepotSessions {
  creer(session: Session): void;
  /** Retourne la session si elle existe et n''est pas expirée, sans la prolonger. */
  parJetonHache(jetonHache: string): Session | null;
  prolonger(jetonHache: string, nouvelExpireLe: string): void;
  supprimer(jetonHache: string): void;
  supprimerExpirees(maintenantIso: string): number;
  supprimerPourUtilisateur(idUtilisateur: string): number;
}