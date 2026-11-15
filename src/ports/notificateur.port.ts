export const TYPES_NOTIFICATION = ["INFO", "SUCCESS", "WARNING", "ALERT"] as const;
export type TypeNotification = (typeof TYPES_NOTIFICATION)[number];

export interface NotificationItem {
  readonly idNotification: string;
  readonly idUtilisateur: string;
  readonly idSignalement: string | null;
  readonly titre: string;
  readonly message: string;
  readonly type: TypeNotification;
  readonly canal: string;
  readonly lu: boolean;
  readonly dateCreation: string;
}

export interface EntreeNotification {
  readonly idNotification: string;
  readonly idUtilisateur: string;
  readonly idSignalement: string | null;
  readonly titre: string;
  readonly message: string;
  readonly type: TypeNotification;
  readonly dateCreation: string;
}

/**
 * Notification in-app (EF38-EF40, §4.6).
 *
 * L'interface est un port : e-mail et push arriveront demain comme secondes implémentations,
 * sans toucher aux cas d'usage. Au MVP, tout est écrit dans la même table.
 */
export interface Notificateur {
  notifier(entree: EntreeNotification): void;
  /** Notifie plusieurs destinataires d'un coup : agents d'une équipe, par exemple. */
  notifierPlusieurs(idUtilisateurs: readonly string[], modele: Omit<EntreeNotification, "idNotification" | "idUtilisateur">, fabriquerId: () => string): number;
  listerPour(idUtilisateur: string, limite?: number): readonly NotificationItem[];
  marquerLu(idNotification: string, idUtilisateur: string): boolean;
  marquerToutLu(idUtilisateur: string): number;
}