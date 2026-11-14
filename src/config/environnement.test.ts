import { describe, expect, test } from 'bun:test';
import { ErreurConfiguration, chargerEnvironnement } from './environnement.ts';

describe('chargerEnvironnement', () => {
  test('applique les défauts sûrs quand la source est vide', () => {
    const env = chargerEnvironnement({});

    expect(env.nodeEnv).toBe('development');
    expect(env.port).toBe(3000);
    expect(env.modeDemo).toBe(false);
    expect(env.modeIa).toBe('SIMULATION');
    expect(Object.isFrozen(env)).toBe(true);
    expect(Object.isFrozen(env.avertissements)).toBe(true);
  });

  test('convertit PORT et active le mode démonstration explicitement', () => {
    const env = chargerEnvironnement({
      PORT: '8081',
      MODE_DEMO: 'true',
      GEMINI_API_KEY: 'cle-de-test-suffisamment-longue',
    });

    expect(env.port).toBe(8081);
    expect(env.modeDemo).toBe(true);
    expect(env.modeIa).toBe('MODELE');
  });

  test('nomme la variable fautive au lieu de retomber sur un défaut', () => {
    expect(() => chargerEnvironnement({ PORT: 'abc' })).toThrow(ErreurConfiguration);
    try {
      chargerEnvironnement({ PORT: '70000' });
      throw new Error('aurait dû échouer');
    } catch (erreur) {
      expect(erreur).toBeInstanceOf(ErreurConfiguration);
      expect((erreur as ErreurConfiguration).variables).toContain('PORT');
    }
  });

  test('refuse une clé IA vide au lieu de la traiter comme présente', () => {
    expect(() => chargerEnvironnement({ GEMINI_API_KEY: '' })).toThrow(ErreurConfiguration);
  });

  test('avertit quand le mode démonstration tourne en production', () => {
    const env = chargerEnvironnement({ NODE_ENV: 'production', MODE_DEMO: 'true' });

    expect(env.avertissements.length).toBeGreaterThan(0);
    expect(env.avertissements.join(' ')).toContain('MODE_DEMO');
  });
});