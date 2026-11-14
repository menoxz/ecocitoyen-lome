import { describe, expect, test } from 'bun:test';
import { CODES_ERREUR, ErreurMetier, messageParCode } from './erreurs.ts';

describe('ErreurMetier', () => {
  test('porte un code du vocabulaire et gèle ses détails', () => {
    const erreur = new ErreurMetier('TRANSITION_INTERDITE', { de: 'NOUVEAU', vers: 'RESOLU' });

    expect(erreur.code).toBe('TRANSITION_INTERDITE');
    expect(erreur.message).toBe(messageParCode('TRANSITION_INTERDITE'));
    expect(Object.isFrozen(erreur.details)).toBe(true);
    expect(erreur.est('TRANSITION_INTERDITE')).toBe(true);
    expect(erreur.est('HORS_ZONE')).toBe(false);
  });

  test('refuse un détail non sérialisable en le réécrivant', () => {
    const details = { raison: 'objet interdit' } as unknown as Record<string, string>;
    const erreur = new ErreurMetier('MOTIF_REQUIS', details);

    expect(erreur.details.raison).toBe('objet interdit');
    expect(Object.keys(erreur.details)).toEqual(['raison']);
  });

  test('chaque code possède un message lisible, unique et non vide', () => {
    const messages = CODES_ERREUR.map((code) => messageParCode(code));

    expect(messages.every((message) => message.trim().length > 10)).toBe(true);
    expect(new Set(messages).size).toBe(messages.length);
    expect(CODES_ERREUR.length).toBeGreaterThan(10);
  });
});