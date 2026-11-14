import type { Role } from '@domaine/compte/role.type.ts';
import { STATUTS_PUBLICS, type Statut } from './signalement.type.ts';

/**
 * Qui voit quel dossier (§5.1, colonne « Visible publiquement »).
 *
 * Nouveau et Rejeté ne sont pas publics : l''auteur et les profils internes les voient,
 * un visiteur non. Cette décision appartient au domaine ; le serveur l''applique en filtrant
 * la requête, l''interface ne fait qu''afficher le résultat.
 */
export interface Lecteur {
  readonly role: Role;
  readonly estAuteur: boolean;
}

export function dossierVisible(statut: Statut, lecteur: Lecteur): boolean {
  if (STATUTS_PUBLICS.includes(statut)) {
    return true;
  }
  if (lecteur.estAuteur) {
    return true;
  }
  return lecteur.role === 'SUPERVISEUR' || lecteur.role === 'ADMIN';
}

/** Un agent voit les dossiers de son équipe, même non publics (note b de la matrice). */
export function dossierVisibleParAgent(statut: Statut, estDeLEquipe: boolean, estAuteur: boolean): boolean {
  return dossierVisible(statut, { role: 'AGENT', estAuteur }) || estDeLEquipe;
}

export function peutVoirIdentiteAuteur(role: Role): boolean {
  return role === 'SUPERVISEUR' || role === 'ADMIN';
}