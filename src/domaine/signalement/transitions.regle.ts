import { ErreurMetier, type CodeErreur } from '@domaine/erreurs.ts';
import type { Role } from '@domaine/compte/role.type.ts';
import type { ContexteActeur, MotifRejet, Priorite, Statut } from './signalement.type.ts';

/**
 * Machine à états du signalement (§5.1).
 *
 * Toute transition absente de cette table est refusée : la table est la seule autorité,
 * et une paire (de, vers) non listée ne peut pas être franchie par un chemin détourné.
 * Un seul couple (de, vers) peut porter deux codes (NOUVEAU→REJETE = T2, VALIDE→REJETE = T4),
 * le code est donc résolu après correspondance.
 */
export type CodeTransition = 'T0' | 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'T8' | 'T9';

export interface DonneesTransition {
  readonly idCategorie?: string;
  readonly niveauPriorite?: Priorite;
  readonly motifRejet?: MotifRejet;
  readonly commentaire?: string;
  readonly idEquipe?: string;
  readonly aPhotoResolution?: boolean;
}

interface DefinitionTransition {
  readonly code: CodeTransition;
  readonly de: Statut | null;
  readonly vers: Statut;
  readonly roles: readonly Role[];
  readonly resume: string;
}

/** Une transition par ligne, dans l’ordre du cahier des charges. */
export const TRANSITIONS: readonly DefinitionTransition[] = [
  { code: 'T0', de: null, vers: 'NOUVEAU', roles: ['CITOYEN', 'AGENT', 'SUPERVISEUR', 'ADMIN'], resume: 'création' },
  { code: 'T1', de: 'NOUVEAU', vers: 'VALIDE', roles: ['SUPERVISEUR', 'ADMIN'], resume: 'validation' },
  { code: 'T2', de: 'NOUVEAU', vers: 'REJETE', roles: ['SUPERVISEUR', 'ADMIN'], resume: 'rejet au tri' },
  { code: 'T3', de: 'VALIDE', vers: 'EN_COURS', roles: ['SUPERVISEUR', 'ADMIN'], resume: 'affectation' },
  { code: 'T4', de: 'VALIDE', vers: 'REJETE', roles: ['SUPERVISEUR', 'ADMIN'], resume: 'rejet après validation' },
  { code: 'T5', de: 'EN_COURS', vers: 'RESOLU', roles: ['AGENT', 'SUPERVISEUR', 'ADMIN'], resume: 'résolution' },
  { code: 'T6', de: 'EN_COURS', vers: 'VALIDE', roles: ['SUPERVISEUR', 'ADMIN'], resume: 'annulation d’intervention' },
  { code: 'T7', de: 'RESOLU', vers: 'ROUVERT', roles: ['CITOYEN', 'SUPERVISEUR', 'ADMIN'], resume: 'contestation' },
  { code: 'T8', de: 'ROUVERT', vers: 'EN_COURS', roles: ['SUPERVISEUR', 'ADMIN'], resume: 'réaffectation' },
  { code: 'T9', de: 'REJETE', vers: 'NOUVEAU', roles: ['SUPERVISEUR', 'ADMIN'], resume: 'révision du rejet' },
];

const DELAI_CONTESTATION_JOURS = 7;
const LONGUEUR_COMMENTAIRE_MIN = 5;

function exiger(condition: boolean, code: CodeErreur, details: Record<string, string | number> = {}): void {
  if (!condition) {
    throw new ErreurMetier(code, details);
  }
}

function commentaireValide(commentaire: string | undefined): boolean {
  return typeof commentaire === 'string' && commentaire.trim().length >= LONGUEUR_COMMENTAIRE_MIN;
}

/** Conditions de données propres à chaque transition, après le contrôle de statut et de rôle. */
function verifierDonnees(code: CodeTransition, donnees: DonneesTransition): void {
  switch (code) {
    case 'T1':
      exiger(!!donnees.idCategorie, 'CONTRAT_INVALIDE', { champ: 'id_categorie' });
      exiger(!!donnees.niveauPriorite, 'CONTRAT_INVALIDE', { champ: 'niveau_priorite' });
      return;
    case 'T2':
    case 'T4':
      exiger(!!donnees.motifRejet, 'MOTIF_REQUIS');
      return;
    case 'T3':
    case 'T8':
      exiger(!!donnees.idEquipe, 'CONTRAT_INVALIDE', { champ: 'id_equipe' });
      return;
    case 'T5':
      exiger(donnees.aPhotoResolution === true, 'PHOTO_MANQUANTE');
      exiger(commentaireValide(donnees.commentaire), 'COMMENTAIRE_REQUIS');
      return;
    case 'T6':
      exiger(!!donnees.commentaire && donnees.commentaire.trim().length > 0, 'MOTIF_REQUIS');
      return;
    case 'T7':
      exiger(commentaireValide(donnees.commentaire), 'COMMENTAIRE_REQUIS');
      return;
    case 'T9':
      exiger(commentaireValide(donnees.commentaire), 'COMMENTAIRE_REQUIS');
      return;
    default:
      return;
  }
}

/** Un agent ne clôture que l’intervention de son équipe ; un citoyen ne conteste que dans les 7 jours. */
function verifierPerimetre(code: CodeTransition, contexte: ContexteActeur): void {
  if (code === 'T5' && contexte.role === 'AGENT') {
    exiger(contexte.estAgentDeLEquipeAffectee, 'DROIT_REFUSE', { raison: 'equipe_differente' });
  }
  if (code === 'T7' && contexte.role === 'CITOYEN') {
    exiger(contexte.estAuteur, 'DROIT_REFUSE', { raison: 'non_auteur' });
    const jours = contexte.joursDepuisResolution;
    exiger(jours !== null && jours <= DELAI_CONTESTATION_JOURS, 'DELAI_CONTESTATION_DEPASSE', {
      jours: jours ?? -1,
    });
  }
}

/**
 * Vérifie une transition et retourne son code.
 * Refus par défaut : une paire absente de la table ne produit jamais de résultat.
 */
export function verifierTransition(
  de: Statut | null,
  vers: Statut,
  contexte: ContexteActeur,
  donnees: DonneesTransition = {},
): CodeTransition {
  const definition = TRANSITIONS.find((t) => t.de === de && t.vers === vers);

  if (!definition) {
    throw new ErreurMetier('TRANSITION_INTERDITE', { de: de ?? 'INITIAL', vers });
  }
  if (!definition.roles.includes(contexte.role)) {
    throw new ErreurMetier('DROIT_REFUSE', { transition: definition.code, role: contexte.role });
  }

  verifierPerimetre(definition.code, contexte);
  verifierDonnees(definition.code, donnees);

  return definition.code;
}

/** Transitions proposables à un acteur depuis un statut : alimente l’interface, ne la remplace pas. */
export function transitionsDisponibles(de: Statut | null, contexte: ContexteActeur): readonly CodeTransition[] {
  return TRANSITIONS.filter((t) => t.de === de && t.roles.includes(contexte.role))
    .filter((t) => {
      try {
        verifierPerimetre(t.code, contexte);
        return true;
      } catch {
        return false;
      }
    })
    .map((t) => t.code);
}