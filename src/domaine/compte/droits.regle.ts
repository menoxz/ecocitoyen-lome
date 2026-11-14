import type { Role } from './role.type.ts';

/**
 * Matrice des droits (§3.3).
 *
 * Une seule table décide qui peut quoi. Le middleware HTTP l’interroge, l’interface s’en sert
 * pour masquer un bouton — mais c’est toujours ici que la permission existe (RB06).
 * Les notes (a) « ses propres signalements », (b) « son équipe » et (c) « sous 7 jours »
 * sont des restrictions de périmètre : elles se vérifient dans la règle concernée, pas ici.
 */
export const ACTIONS = [
  'voirCarteEtSignalementsPublics',
  'voirSesSignalements',
  'voirTousSignalements',
  'voirIdentiteAuteur',
  'voirStatistiquesPubliques',
  'creerSignalement',
  'confirmerSignalement',
  'validerSignalement',
  'rejeterSignalement',
  'modifierPriorite',
  'affecterEquipe',
  'demarrerIntervention',
  'cloturerIntervention',
  'annulerIntervention',
  'rouvrirSignalement',
  'reviserSignalement',
  'fusionnerDoublon',
  'masquerPhoto',
  'exporterSignalements',
  'voirIndicateurs',
  'creerCompteInterne',
  'modifierCompte',
  'consulterJournalAudit',
  'modifierReferentiel',
  'modifierParametres',
  'modifierProfil',
  'anonymiserCompte',
] as const;

export type Action = (typeof ACTIONS)[number];

const TOUS: readonly Role[] = ['VISITEUR', 'CITOYEN', 'AGENT', 'SUPERVISEUR', 'ADMIN'];
const CONNECTES: readonly Role[] = ['CITOYEN', 'AGENT', 'SUPERVISEUR', 'ADMIN'];
const INTERNES: readonly Role[] = ['AGENT', 'SUPERVISEUR', 'ADMIN'];
const SUPERVISION: readonly Role[] = ['SUPERVISEUR', 'ADMIN'];
const ADMINISTRATION: readonly Role[] = ['ADMIN'];

export const MATRICE_DROITS: Readonly<Record<Action, readonly Role[]>> = {
  voirCarteEtSignalementsPublics: TOUS,
  voirSesSignalements: CONNECTES,
  voirTousSignalements: INTERNES,
  voirIdentiteAuteur: SUPERVISION,
  voirStatistiquesPubliques: TOUS,
  creerSignalement: CONNECTES,
  confirmerSignalement: CONNECTES,
  validerSignalement: SUPERVISION,
  rejeterSignalement: SUPERVISION,
  modifierPriorite: SUPERVISION,
  affecterEquipe: SUPERVISION,
  demarrerIntervention: INTERNES,
  cloturerIntervention: INTERNES,
  annulerIntervention: SUPERVISION,
  rouvrirSignalement: ['CITOYEN', 'SUPERVISEUR', 'ADMIN'],
  reviserSignalement: SUPERVISION,
  fusionnerDoublon: SUPERVISION,
  masquerPhoto: SUPERVISION,
  exporterSignalements: SUPERVISION,
  voirIndicateurs: SUPERVISION,
  creerCompteInterne: ADMINISTRATION,
  modifierCompte: ADMINISTRATION,
  consulterJournalAudit: ADMINISTRATION,
  modifierReferentiel: ADMINISTRATION,
  modifierParametres: ADMINISTRATION,
  modifierProfil: CONNECTES,
  anonymiserCompte: ['CITOYEN'],
};

export function rolesAutorises(action: Action): readonly Role[] {
  return MATRICE_DROITS[action];
}

export function aLeDroit(role: Role, action: Action): boolean {
  return MATRICE_DROITS[action].includes(role);
}

/**
 * RB01 : hiérarchie Citoyen < Agent < Superviseur < Administrateur.
 * Sert au raisonnement de secours, jamais au contrôle d’une action : un droit se lit dans la matrice.
 */
export function niveauHierarchique(role: Role): number {
  return TOUS.indexOf(role);
}