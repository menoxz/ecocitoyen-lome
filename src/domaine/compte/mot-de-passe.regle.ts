import { ErreurMetier } from '@domaine/erreurs.ts';

/**
 * Politique de mot de passe (ENF06).
 *
 * 8 caractères minimum, 200 maximum : la borne haute n''est pas cosmétique, un hachage Argon2
 * sur une chaîne de plusieurs mégaoctets est un déni de service gratuit.
 * Les mots de passe les plus courants sont refusés : une politique de longueur seule laisse
 * passer « 12345678 », qui est précisément ce qu''on écrit sous contrainte.
 */
export const LONGUEUR_MIN = 8;
export const LONGUEUR_MAX = 200;

const INTERDITS: readonly string[] = [
  '12345678',
  '123456789',
  'password',
  'password1',
  'motdepasse',
  'azertyuiop',
  'qwertyuiop',
  'ecocitoyen',
  'lome2026',
  'administrateur',
];

export function verifierPolitiqueMotDePasse(motDePasse: string): void {
  if (motDePasse.length < LONGUEUR_MIN) {
    throw new ErreurMetier('MOT_DE_PASSE_FAIBLE', { raison: 'trop_court', minimum: LONGUEUR_MIN });
  }
  if (motDePasse.length > LONGUEUR_MAX) {
    throw new ErreurMetier('MOT_DE_PASSE_FAIBLE', { raison: 'trop_long', maximum: LONGUEUR_MAX });
  }
  if (INTERDITS.includes(motDePasse.trim().toLowerCase())) {
    throw new ErreurMetier('MOT_DE_PASSE_FAIBLE', { raison: 'trop_courant' });
  }
}

/**
 * Un compte est verrouillé après 5 échecs dans une fenêtre de 15 minutes (RG24).
 * La fenêtre est calculée par l''appelant, qui seul connaît l''horloge.
 */
export const ECHECS_AVANT_VERROUILLAGE = 5;
export const FENETRE_VERROUILLAGE_MINUTES = 15;

export function estVerrouille(echecsDansLaFenetre: number): boolean {
  return echecsDansLaFenetre >= ECHECS_AVANT_VERROUILLAGE;
}