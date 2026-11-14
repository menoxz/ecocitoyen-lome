import type { Signalement, Statut } from '@domaine/signalement/signalement.type.ts';

/** Photo ou preuve, telle que conservée sur le disque (jamais en base). */
export interface MediaLu {
  readonly idMedia: string;
  readonly idSignalement: string;
  readonly idIntervention: string | null;
  readonly type: "SIGNALEMENT" | "RESOLUTION";
  readonly chemin: string;
  readonly mime: string;
  readonly tailleOctets: number;
  readonly masque: boolean;
  readonly dateAjout: string;
}

export interface EntreeHistorique {
  readonly idHistorique: string;
  readonly idSignalement: string;
  readonly ancienStatut: Statut | null;
  readonly nouveauStatut: Statut;
  readonly idAuteur: string;
  readonly dateChangement: string;
  readonly commentaire: string | null;
}

export interface InterventionLue {
  readonly idIntervention: string;
  readonly idSignalement: string;
  readonly idEquipe: string;
  readonly idAgent: string | null;
  readonly idAffectePar: string;
  readonly statutIntervention: "PLANIFIEE" | "EN_COURS" | "TERMINEE" | "ANNULEE";
  readonly dateAffectation: string;
  readonly dateDebut: string | null;
  readonly dateFin: string | null;
  readonly commentaire: string | null;
}

export interface FiltresSignalements {
  readonly statut?: Statut;
  readonly idQuartier?: string;
  readonly idCategorie?: string;
  readonly idAuteur?: string;
  readonly limite?: number;
}

/**
 * Accès à la persistance des signalements.
 *
 * Signatures synchrones : le moteur retenu est synchrone par conception, et un port synchrone
 * évite de propager une fausse asynchronie dans les cas d''usage. Le jour où le moteur change
 * (PostgreSQL), le port passera en asynchrone : une seule interface à adapter.
 */
export interface DepotSignalements {
  parId(idSignalement: string): Signalement | null;
  creer(signalement: Signalement, historiqueInitial: EntreeHistorique): void;
  enregistrer(signalement: Signalement): void;
  lister(filtres?: FiltresSignalements): readonly Signalement[];
  historiqueDe(idSignalement: string): readonly EntreeHistorique[];
  mediasDe(idSignalement: string): readonly MediaLu[];
  interventionsDe(idSignalement: string): readonly InterventionLue[];
  /**
   * Enregistre une confirmation « Moi aussi » (RG05).
   * Retourne false si elle existe déjà : l''unicité est portée par la clé primaire, pas par un test.
   */
  ajouterConfirmation(idSignalement: string, idUtilisateur: string, dateConfirmation: string): boolean;
  nombreConfirmations(idSignalement: string): number;
  ajouterHistorique(entree: EntreeHistorique): void;
  ajouterMedia(media: MediaLu): void;
  creerIntervention(intervention: InterventionLue): void;
  majIntervention(intervention: InterventionLue): void;
  compterParStatut(): Readonly<Record<Statut, number>>;
}