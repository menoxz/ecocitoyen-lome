import type { Role } from '@domaine/compte/role.type.ts';

/** Statuts du cycle de vie (§5.1). Aucun autre statut n’existe. */
export const STATUTS = ['NOUVEAU', 'VALIDE', 'EN_COURS', 'RESOLU', 'REJETE', 'ROUVERT'] as const;

export type Statut = (typeof STATUTS)[number];

/** Statuts visibles par le public et les visiteurs (§5.1, colonne « Visible publiquement »). */
export const STATUTS_PUBLICS: readonly Statut[] = ['VALIDE', 'EN_COURS', 'RESOLU', 'ROUVERT'];

/** Statuts considérés comme actifs pour la recherche de doublons (RG04). */
export const STATUTS_ACTIFS: readonly Statut[] = ['NOUVEAU', 'VALIDE', 'EN_COURS', 'ROUVERT'];

export const PRIORITES = ['BASSE', 'NORMALE', 'HAUTE', 'URGENTE'] as const;

export type Priorite = (typeof PRIORITES)[number];

export const MOTIFS_REJET = [
  'Doublon',
  'Hors zone',
  'Hors périmètre',
  'Informations insuffisantes',
  'Contenu inapproprié',
  'Signalement abusif',
  'Autre',
] as const;

export type MotifRejet = (typeof MOTIFS_REJET)[number];

export const MODES_IA = ['MODELE', 'SIMULATION', 'AUCUN'] as const;

export type ModeIa = (typeof MODES_IA)[number];

/** Champs d’identité et de localisation : le strict nécessaire (RG27). */
export interface Signalement {
  readonly idSignalement: string;
  readonly idAuteur: string;
  readonly idCategorie: string;
  readonly idQuartier: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly description: string;
  readonly statut: Statut;
  readonly niveauPriorite: Priorite;
  readonly scorePriorite: number;
  readonly sansPhoto: boolean;
  readonly nbConfirmations: number;
  readonly idCategorieIa: string | null;
  readonly scoreIa: number | null;
  readonly modeIa: ModeIa;
  readonly iaDesaccord: boolean;
  readonly motifRejet: MotifRejet | null;
  readonly dateSignalement: string;
  readonly dateValidation: string | null;
  readonly dateAffectation: string | null;
  readonly dateResolution: string | null;
  readonly dateMiseAJour: string;
}

/** Vue minimale nécessaire pour juger une action : jamais l’agrégat complet. */
export interface ContexteActeur {
  readonly role: Role;
  readonly idUtilisateur: string;
  readonly estAuteur: boolean;
  readonly estAgentDeLEquipeAffectee: boolean;
  readonly joursDepuisResolution: number | null;
}