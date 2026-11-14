import { describe, expect, test } from 'bun:test';
import {
  couvertureGeographique,
  delaiMoyenTraitementHeures,
  delaiMoyenTriHeures,
  respectDelais,
  tauxAccordIa,
  tauxRejet,
  tauxResolution,
  type DossierIndicateur,
} from './formules.regle.ts';

/**
 * Jeu de référence dont chaque résultat est calculé à la main (§13, CR14).
 * Les dates sont en UTC, comme le stockage.
 */
const JOURS: readonly DossierIndicateur[] = [
  {
    statut: 'RESOLU',
    priorite: 'URGENTE',
    idQuartier: 'q1',
    dateSignalement: '2026-01-01T00:00:00.000Z',
    dateValidation: '2026-01-01T06:00:00.000Z',
    dateAffectation: '2026-01-01T12:00:00.000Z',
    dateResolution: '2026-01-02T00:00:00.000Z',
  },
  {
    statut: 'RESOLU',
    priorite: 'HAUTE',
    idQuartier: 'q1',
    dateSignalement: '2026-01-01T00:00:00.000Z',
    dateValidation: '2026-01-02T00:00:00.000Z',
    dateAffectation: '2026-01-03T00:00:00.000Z',
    dateResolution: '2026-01-04T00:00:00.000Z',
  },
  {
    statut: 'RESOLU',
    priorite: 'NORMALE',
    idQuartier: 'q2',
    dateSignalement: '2026-01-01T00:00:00.000Z',
    dateValidation: '2026-01-04T00:00:00.000Z',
    dateAffectation: '2026-01-05T00:00:00.000Z',
    dateResolution: '2026-01-20T00:00:00.000Z',
  },
  {
    statut: 'NOUVEAU',
    priorite: 'BASSE',
    idQuartier: 'q3',
    dateSignalement: '2026-01-01T00:00:00.000Z',
    dateValidation: null,
    dateAffectation: null,
    dateResolution: null,
  },
  {
    statut: 'REJETE',
    priorite: 'BASSE',
    idQuartier: 'q2',
    dateSignalement: '2026-01-01T00:00:00.000Z',
    dateValidation: null,
    dateAffectation: null,
    dateResolution: null,
  },
  {
    statut: 'VALIDE',
    priorite: 'BASSE',
    idQuartier: 'q1',
    dateSignalement: '2026-01-01T00:00:00.000Z',
    dateValidation: '2026-01-02T00:00:00.000Z',
    dateAffectation: null,
    dateResolution: null,
  },
];

describe('taux de résolution (§13)', () => {
  test('vaut Résolus ÷ (Validé + En cours + Résolu + Rouvert), les rejets étant hors dénominateur', () => {
    expect(tauxResolution(JOURS)).toBe(75);
  });

  test('vaut null quand aucun dossier n’est décidé, jamais une valeur de repli', () => {
    expect(tauxResolution([])).toBeNull();
    expect(tauxResolution([JOURS[3]])).toBeNull();
  });
});

describe('taux de rejet', () => {
  test('compte les rejets parmi les dossiers décidés', () => {
    expect(tauxRejet(JOURS)).toBe(20);
  });

  test('vaut null sans aucun dossier décidé', () => {
    expect(tauxRejet([JOURS[3]])).toBeNull();
  });
});

describe('délais moyens', () => {
  test('trie en 31,5 heures de moyenne sur les dossiers validés', () => {
    expect(delaiMoyenTriHeures(JOURS)).toBe(31.5);
  });

  test('traite en 150 heures de moyenne sur les dossiers résolus', () => {
    expect(delaiMoyenTraitementHeures(JOURS)).toBe(150);
  });

  test('vaut null sur un jeu sans dossier concerné', () => {
    expect(delaiMoyenTriHeures([])).toBeNull();
    expect(delaiMoyenTraitementHeures([JOURS[3]])).toBeNull();
  });
});

describe('respect des délais cibles', () => {
  test('mesure chaque jalon séparément (75 % / 100 % / 67 %)', () => {
    expect(respectDelais(JOURS)).toEqual({ tri: 75, affectation: 100, resolution: 67 });
  });

  test('tient compte de la priorité du dossier, pas d’un seuil unique', () => {
    const urgenceRespectee = respectDelais([JOURS[0]], {
      URGENTE: { tri: 12, affectation: 24, resolution: 72 },
      HAUTE: { tri: 48, affectation: 48, resolution: 168 },
      NORMALE: { tri: 48, affectation: 72, resolution: 336 },
      BASSE: { tri: 48, affectation: 120, resolution: 720 },
    });
    const urgenceDepassee = respectDelais([JOURS[0]], {
      URGENTE: { tri: 1, affectation: 1, resolution: 1 },
      HAUTE: { tri: 48, affectation: 48, resolution: 168 },
      NORMALE: { tri: 48, affectation: 72, resolution: 336 },
      BASSE: { tri: 48, affectation: 120, resolution: 720 },
    });

    expect(urgenceRespectee).toEqual({ tri: 100, affectation: 100, resolution: 100 });
    expect(urgenceDepassee).toEqual({ tri: 0, affectation: 0, resolution: 0 });
  });

  test('vaut null par jalon quand aucun dossier ne permet de le mesurer', () => {
    expect(respectDelais([])).toEqual({ tri: null, affectation: null, resolution: null });
    expect(respectDelais([JOURS[3]])).toEqual({ tri: null, affectation: null, resolution: null });
  });
});

describe('couverture géographique', () => {
  test('rapporte les quartiers atteints aux quartiers actifs', () => {
    expect(couvertureGeographique(JOURS.map((d) => d.idQuartier), ['q1', 'q2', 'q3'])).toBe(100);
    expect(couvertureGeographique(['q1'], ['q1', 'q2', 'q3'])).toBe(33);
  });

  test('vaut null sans quartier actif', () => {
    expect(couvertureGeographique(['q1'], [])).toBeNull();
  });
});

describe('qualité de l’IA', () => {
  test('compare la catégorie finale à la catégorie suggérée', () => {
    expect(
      tauxAccordIa([
        { categorieFinale: 'cat-1', categorieIa: 'cat-1' },
        { categorieFinale: 'cat-2', categorieIa: 'cat-1' },
        { categorieFinale: 'cat-3', categorieIa: null },
      ]),
    ).toBe(50);
  });

  test('vaut null quand aucun dossier n’a été évalué par l’IA', () => {
    expect(tauxAccordIa([{ categorieFinale: 'cat-1', categorieIa: null }])).toBeNull();
  });
});