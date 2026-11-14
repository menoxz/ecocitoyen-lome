import { describe, expect, test } from 'bun:test';
import { ErreurMetier } from '@domaine/erreurs.ts';
import {
  interventionActive,
  verifierAffectationPossible,
  verifierClotureParAgent,
  type Intervention,
} from './unicite-active.regle.ts';

function intervention(surcharge: Partial<Intervention> = {}): Intervention {
  return {
    idIntervention: 'int-1',
    idSignalement: 'sig-1',
    idEquipe: 'eq-1',
    statut: 'PLANIFIEE',
    dateAffectation: '2026-11-14T08:00:00.000Z',
    ...surcharge,
  };
}

describe('unicité de l’intervention active (§5.2, §9.2)', () => {
  test('autorise une affectation quand aucune intervention n’existe', () => {
    expect(() => verifierAffectationPossible([])).not.toThrow();
  });

  test('refuse une seconde intervention planifiée ou en cours', () => {
    expect(() => verifierAffectationPossible([intervention({ statut: 'PLANIFIEE' })])).toThrow(ErreurMetier);
    expect(() => verifierAffectationPossible([intervention({ statut: 'EN_COURS' })])).toThrow(ErreurMetier);
  });

  test('autorise une nouvelle affectation après clôture ou annulation', () => {
    expect(() => verifierAffectationPossible([intervention({ statut: 'TERMINEE' })])).not.toThrow();
    expect(() => verifierAffectationPossible([intervention({ statut: 'ANNULEE' })])).not.toThrow();
  });

  test('retourne l’intervention active, ou null', () => {
    expect(interventionActive([intervention({ statut: 'TERMINEE' })])).toBeNull();
    expect(interventionActive([intervention({ statut: 'EN_COURS' })])?.idIntervention).toBe('int-1');
  });
});

describe('clôture par un agent (§3.3 note b)', () => {
  test('refuse quand aucune intervention n’est active', () => {
    try {
      verifierClotureParAgent(null, 'eq-1');
      throw new Error('aurait dû refuser');
    } catch (erreur) {
      expect(erreur).toBeInstanceOf(ErreurMetier);
      expect((erreur as ErreurMetier).code).toBe('INTERVENTION_AUCUNE');
    }
  });

  test('refuse un agent d’une autre équipe (CR7)', () => {
    expect(() => verifierClotureParAgent(intervention(), 'eq-2')).toThrow(ErreurMetier);
  });

  test('autorise un agent de l’équipe affectée', () => {
    expect(() => verifierClotureParAgent(intervention(), 'eq-1')).not.toThrow();
  });
});