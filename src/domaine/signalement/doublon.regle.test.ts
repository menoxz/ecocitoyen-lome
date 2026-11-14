import { describe, expect, test } from 'bun:test';
import { trouverDoublons, type CandidatDoublon, type CibleDoublon } from './doublon.regle.ts';

const MAINTENANT = '2026-11-14T00:00:00.000Z';
const CIBLE: CibleDoublon = { latitude: 6.13, longitude: 1.22, idCategorie: 'cat-1', maintenantIso: MAINTENANT };

function candidat(surcharge: Partial<CandidatDoublon> = {}): CandidatDoublon {
  return {
    idSignalement: 'sig-existant',
    idCategorie: 'cat-1',
    statut: 'VALIDE',
    dateSignalement: '2026-11-10T00:00:00.000Z',
    latitude: 6.13,
    longitude: 1.22,
    ...surcharge,
  };
}

describe('recherche de doublons (RG04)', () => {
  test('propose un signalement de même catégorie à moins de 30 m et de moins de 30 jours', () => {
    const doublons = trouverDoublons([candidat({ latitude: 6.1302 })], CIBLE);

    expect(doublons.length).toBe(1);
  });

  test('ignore un signalement situé au-delà du rayon, même de même catégorie', () => {
    expect(trouverDoublons([candidat({ latitude: 6.1305 })], CIBLE).length).toBe(0);
  });

  test('ignore un signalement plus ancien que la fenêtre, même à la bonne distance', () => {
    expect(trouverDoublons([candidat({ dateSignalement: '2026-10-01T00:00:00.000Z' })], CIBLE).length).toBe(0);
  });

  test('ignore une autre catégorie : un tas d’ordures n’est pas un caniveau bouché', () => {
    expect(trouverDoublons([candidat({ idCategorie: 'cat-2' })], CIBLE).length).toBe(0);
  });

  test('ignore les signalements clos', () => {
    expect(trouverDoublons([candidat({ statut: 'RESOLU' })], CIBLE).length).toBe(0);
    expect(trouverDoublons([candidat({ statut: 'REJETE' })], CIBLE).length).toBe(0);
    expect(trouverDoublons([candidat({ statut: 'EN_COURS' })], CIBLE).length).toBe(1);
  });

  test('respecte des paramètres élargis', () => {
    const doublons = trouverDoublons([candidat({ latitude: 6.1305 })], CIBLE, { rayonMetres: 100, fenetreJours: 30 });

    expect(doublons.length).toBe(1);
  });

  test('retourne une vue minimale, sans identité ni description', () => {
    const [doublon] = trouverDoublons([candidat()], CIBLE);

    expect(Object.keys(doublon).sort()).toEqual([
      'dateSignalement',
      'idCategorie',
      'idSignalement',
      'latitude',
      'longitude',
      'statut',
    ]);
  });
});