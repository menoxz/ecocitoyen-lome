import { ErreurMetier } from '@domaine/erreurs.ts';
import type { Priorite } from './signalement.type.ts';

/**
 * Barème de priorité (§5.3).
 *
 * RG01 : le score ne dépend pas de l’IA. Aucun seuil n’est écrit en dur dans une constante
 * globale : les rayons, la fenêtre et la saison arrivent en paramètre (table `parametre`).
 */
export interface ParametresPriorite {
  readonly rayonSiteSensibleM: number;
  readonly rayonCorroborationM: number;
  readonly corroborationMin: number;
  readonly delaiSansDecisionHeures: number;
  readonly saisonPluies: boolean;
}

export interface EntreePriorite {
  /** Priorité de base de la catégorie, de 1 à 4 (§4.3). */
  readonly prioriteBaseCategorie: number;
  readonly distanceSiteSensibleM: number | null;
  readonly signalementsProches: number;
  readonly confirmations: number;
  readonly categorieCaniveau: boolean;
  readonly heuresSansDecision: number;
}

export interface ResultatPriorite {
  readonly score: number;
  readonly niveau: Priorite;
  readonly motifs: readonly string[];
}

export const PARAMETRES_PRIORITE_DEFAUT: ParametresPriorite = {
  rayonSiteSensibleM: 100,
  rayonCorroborationM: 100,
  corroborationMin: 3,
  delaiSansDecisionHeures: 72,
  saisonPluies: false,
};

export function niveauDepuisScore(score: number): Priorite {
  if (score >= 5) return 'URGENTE';
  if (score === 4) return 'HAUTE';
  if (score === 3) return 'NORMALE';
  return 'BASSE';
}

export function calculerPriorite(
  entree: EntreePriorite,
  parametres: ParametresPriorite = PARAMETRES_PRIORITE_DEFAUT,
): ResultatPriorite {
  if (!Number.isFinite(entree.prioriteBaseCategorie)) {
    throw new ErreurMetier('CONTRAT_INVALIDE', { champ: 'priorite_base_categorie' });
  }

  const base = Math.min(4, Math.max(1, Math.trunc(entree.prioriteBaseCategorie)));
  let score = base;
  const motifs: string[] = [`priorité de base catégorie +${base}`];

  if (entree.distanceSiteSensibleM !== null && entree.distanceSiteSensibleM <= parametres.rayonSiteSensibleM) {
    score += 1;
    motifs.push('site sensible à moins de ' + parametres.rayonSiteSensibleM + ' m : +1');
  }

  const corroboration = entree.signalementsProches + entree.confirmations;
  if (corroboration >= parametres.corroborationMin) {
    score += 1;
    motifs.push('corroboration (' + corroboration + ') : +1');
  }

  if (entree.categorieCaniveau && parametres.saisonPluies) {
    score += 1;
    motifs.push('caniveau bouché en saison des pluies : +1');
  }

  if (entree.heuresSansDecision > parametres.delaiSansDecisionHeures) {
    score += 1;
    motifs.push('sans décision depuis plus de ' + parametres.delaiSansDecisionHeures + ' h : +1');
  }

  return { score, niveau: niveauDepuisScore(score), motifs };
}

/**
 * RG02 : seul un superviseur ou un administrateur modifie la priorité, et abaisser une priorité
 * « Urgente » exige un commentaire. Le contrôle de rôle est fait par la matrice de droits ;
 * ici on ne juge que la cohérence de la décision.
 */
export function verifierChangementPriorite(
  ancienne: Priorite,
  nouvelle: Priorite,
  commentaire: string | null,
): void {
  const ordre: readonly Priorite[] = ['BASSE', 'NORMALE', 'HAUTE', 'URGENTE'];
  const baisse = ordre.indexOf(nouvelle) < ordre.indexOf(ancienne);

  if (baisse && ancienne === 'URGENTE') {
    const motif = (commentaire ?? '').trim();
    if (motif.length < 5) {
      throw new ErreurMetier('PRIORITE_ABAISSEE_SANS_MOTIF', { de: ancienne, vers: nouvelle });
    }
  }
}