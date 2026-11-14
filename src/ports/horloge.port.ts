/**
 * Horloge injectable.
 *
 * Sans elle, une règle de délai (7 jours de contestation, 15 minutes de verrouillage, SLA)
 * n''est pas testable sans attendre réellement. Le domaine et l''application ne lisent jamais
 * l''heure système directement : ils demandent à l''horloge de la leur fournir.
 */
export interface Horloge {
  /** Instant courant au format ISO 8601 UTC. */
  maintenant(): string;
  /** Décale un instant de N minutes, en avant ou en arrière. */
  decalerMinutes(iso: string, minutes: number): string;
  /** Début de la fenêtre de N minutes contenant l''instant fourni. */
  debutFenetre(iso: string, minutes: number): string;
}

/** Horloge figée pour les tests : avance seulement quand on le demande. */
export interface HorlogeReglable extends Horloge {
  avancerHeures(heures: number): void;
  fixer(iso: string): void;
}