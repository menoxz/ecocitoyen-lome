import { describe, expect, test } from 'bun:test';
import { ErreurMetier } from '@domaine/erreurs.ts';
import { verifierDescription } from './description.regle.ts';

describe('description du signalement (§4.2)', () => {
  test('accepte une description entre dix et cinq cents caractères', () => {
    expect(verifierDescription('Tas de déchets devant l école')).toContain('déchets');
    expect(verifierDescription('a'.repeat(10)).length).toBe(10);
    expect(verifierDescription('a'.repeat(500)).length).toBe(500);
  });

  test('refuse moins de dix caractères, espaces compris', () => {
    expect(() => verifierDescription('court')).toThrow(ErreurMetier);
    expect(() => verifierDescription('   court   ')).toThrow(ErreurMetier);
  });

  test('refuse plus de cinq cents caractères', () => {
    expect(() => verifierDescription('a'.repeat(501))).toThrow(ErreurMetier);
  });

  test('retourne la description nettoyée de ses espaces de bord', () => {
    expect(verifierDescription('  Un dépôt sauvage au carrefour  ')).toBe('Un dépôt sauvage au carrefour');
  });
});