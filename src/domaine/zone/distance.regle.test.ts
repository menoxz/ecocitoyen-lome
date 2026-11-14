import { describe, expect, test } from 'bun:test';
import { distanceMetres } from './distance.regle.ts';

describe('distance entre deux points', () => {
  test('vaut zéro pour un même point', () => {
    expect(distanceMetres({ latitude: 6.13, longitude: 1.22 }, { latitude: 6.13, longitude: 1.22 })).toBe(0);
  });

  test('mesure une trentaine de mètres pour 0,0003° de longitude à Lomé', () => {
    const distance = distanceMetres({ latitude: 6.13, longitude: 1.22 }, { latitude: 6.13, longitude: 1.2203 });

    expect(distance).toBeGreaterThan(30);
    expect(distance).toBeLessThan(40);
  });

  test('mesure environ 111 km pour un degré de latitude', () => {
    const distance = distanceMetres({ latitude: 6.13, longitude: 1.22 }, { latitude: 7.13, longitude: 1.22 });

    expect(distance).toBeGreaterThan(110_000);
    expect(distance).toBeLessThan(112_000);
  });

  test('est symétrique', () => {
    const a = { latitude: 6.13, longitude: 1.22 };
    const b = { latitude: 6.25, longitude: 1.35 };

    expect(distanceMetres(a, b)).toBeCloseTo(distanceMetres(b, a), 6);
  });
});