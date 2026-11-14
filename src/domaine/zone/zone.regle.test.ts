import { describe, expect, test } from 'bun:test';
import { estDansLaZone, pointDansPolygone, type Anneau, type ZonePilote } from './zone.regle.ts';

const CARRE: Anneau = [
  [1.2, 6.12],
  [1.24, 6.12],
  [1.24, 6.14],
  [1.2, 6.14],
];

const ZONE: ZonePilote = {
  nom: 'Lomé',
  emprise: { latitudeMin: 6.08, latitudeMax: 6.25, longitudeMin: 1.12, longitudeMax: 1.35 },
  polygone: CARRE,
};

const ZONE_SANS_CONTOUR: ZonePilote = { ...ZONE, polygone: null };

describe('appartenance à la zone pilote (CR11)', () => {
  test('reconnaît un point intérieur au polygone', () => {
    expect(pointDansPolygone({ latitude: 6.13, longitude: 1.22 }, CARRE)).toBe(true);
  });

  test('rejette un point extérieur au polygone', () => {
    expect(pointDansPolygone({ latitude: 6.2, longitude: 1.22 }, CARRE)).toBe(false);
    expect(pointDansPolygone({ latitude: 6.13, longitude: 1.3 }, CARRE)).toBe(false);
  });

  test('le polygone fait foi même quand le point est dans l’emprise', () => {
    const point = { latitude: 6.2, longitude: 1.22 };

    expect(estDansLaZone(point, ZONE)).toBe(false);
    expect(estDansLaZone(point, ZONE_SANS_CONTOUR)).toBe(true);
  });

  test('le repli rectangulaire refuse la mer et les pays voisins', () => {
    expect(estDansLaZone({ latitude: 5.9, longitude: 1.22 }, ZONE_SANS_CONTOUR)).toBe(false);
    expect(estDansLaZone({ latitude: 6.13, longitude: 1.5 }, ZONE_SANS_CONTOUR)).toBe(false);
    expect(estDansLaZone({ latitude: 6.13, longitude: 1.22 }, ZONE_SANS_CONTOUR)).toBe(true);
  });
});