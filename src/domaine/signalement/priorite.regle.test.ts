import { describe, expect, test } from 'bun:test';
import { ErreurMetier } from '@domaine/erreurs.ts';
import {
  calculerPriorite,
  niveauDepuisScore,
  verifierChangementPriorite,
  type EntreePriorite,
} from './priorite.regle.ts';

const entree = (surcharge: Partial<EntreePriorite> = {}): EntreePriorite => ({
  prioriteBaseCategorie: 2,
  distanceSiteSensibleM: null,
  signalementsProches: 0,
  confirmations: 0,
  categorieCaniveau: false,
  heuresSansDecision: 1,
  ...surcharge,
});

describe('barème de priorité (§5.3)', () => {
  test('part de la priorité de base de la catégorie, sans bonus', () => {
    const resultat = calculerPriorite(entree({ prioriteBaseCategorie: 2 }));

    expect(resultat.score).toBe(2);
    expect(resultat.niveau).toBe('BASSE');
    expect(resultat.motifs.length).toBe(1);
  });

  test('ajoute un point pour un site sensible à moins de 100 m', () => {
    expect(calculerPriorite(entree({ prioriteBaseCategorie: 4, distanceSiteSensibleM: 99 })).score).toBe(5);
    expect(calculerPriorite(entree({ prioriteBaseCategorie: 4, distanceSiteSensibleM: 101 })).score).toBe(4);
  });

  test('ajoute un point dès trois corroborations, signalements ou confirmations confondus', () => {
    expect(calculerPriorite(entree({ signalementsProches: 2, confirmations: 1 })).score).toBe(3);
    expect(calculerPriorite(entree({ signalementsProches: 1, confirmations: 1 })).score).toBe(2);
  });

  test('ajoute un point pour un caniveau bouché, mais seulement en saison des pluies', () => {
    expect(calculerPriorite(entree({ categorieCaniveau: true })).score).toBe(2);
    const saison = calculerPriorite(entree({ categorieCaniveau: true }), {
      rayonSiteSensibleM: 100,
      rayonCorroborationM: 100,
      corroborationMin: 3,
      delaiSansDecisionHeures: 72,
      saisonPluies: true,
    });
    expect(saison.score).toBe(3);
  });

  test('ajoute un point au-delà de 72 h sans décision, pas à 72 h pile', () => {
    expect(calculerPriorite(entree({ heuresSansDecision: 73 })).score).toBe(3);
    expect(calculerPriorite(entree({ heuresSansDecision: 72 })).score).toBe(2);
  });

  test('borne la priorité de base entre 1 et 4', () => {
    expect(calculerPriorite(entree({ prioriteBaseCategorie: 9 })).score).toBe(4);
    expect(calculerPriorite(entree({ prioriteBaseCategorie: 0 })).score).toBe(1);
  });

  test('cumule les quatre bonus jusqu’à Urgente', () => {
    const resultat = calculerPriorite(
      entree({
        prioriteBaseCategorie: 3,
        distanceSiteSensibleM: 40,
        signalementsProches: 3,
        categorieCaniveau: true,
        heuresSansDecision: 80,
      }),
      {
        rayonSiteSensibleM: 100,
        rayonCorroborationM: 100,
        corroborationMin: 3,
        delaiSansDecisionHeures: 72,
        saisonPluies: true,
      },
    );

    expect(resultat.score).toBe(7);
    expect(resultat.niveau).toBe('URGENTE');
    expect(resultat.motifs.length).toBe(5);
  });

  test('traduit les seuils de score en niveaux', () => {
    expect(niveauDepuisScore(1)).toBe('BASSE');
    expect(niveauDepuisScore(2)).toBe('BASSE');
    expect(niveauDepuisScore(3)).toBe('NORMALE');
    expect(niveauDepuisScore(4)).toBe('HAUTE');
    expect(niveauDepuisScore(5)).toBe('URGENTE');
  });

  test('refuse une priorité de base non numérique', () => {
    expect(() => calculerPriorite(entree({ prioriteBaseCategorie: Number.NaN }))).toThrow(ErreurMetier);
  });
});

describe('changement de priorité (RG02)', () => {
  test('exige un commentaire pour abaisser une priorité urgente', () => {
    expect(() => verifierChangementPriorite('URGENTE', 'NORMALE', null)).toThrow(ErreurMetier);
    expect(() => verifierChangementPriorite('URGENTE', 'NORMALE', 'Faux positif vérifié sur place')).not.toThrow();
    expect(() => verifierChangementPriorite('URGENTE', 'HAUTE', 'Site déjà traité hier')).not.toThrow();
  });

  test('n’exige rien pour relever une priorité ni pour abaisser une priorité non urgente', () => {
    expect(() => verifierChangementPriorite('BASSE', 'URGENTE', null)).not.toThrow();
    expect(() => verifierChangementPriorite('HAUTE', 'NORMALE', null)).not.toThrow();
  });
});