import { describe, expect, test } from 'bun:test';
import { reponseErreurSchema, versReponseErreur } from './erreurs.ts';
import { CODES_ERREUR } from '@domaine/erreurs.ts';

describe('reponse erreur API', () => {
  test('accepte tous les codes du domaine et se sérialise sans perte', () => {
    for (const code of CODES_ERREUR) {
      const reponse = versReponseErreur(code, 'message de test');
      const analyse = reponseErreurSchema.safeParse(JSON.parse(JSON.stringify(reponse)));

      expect(analyse.success).toBe(true);
    }
  });

  test('refuse un code inventé hors du vocabulaire', () => {
    const analyse = reponseErreurSchema.safeParse({ code: 'PAS_UN_CODE', message: 'x' });

    expect(analyse.success).toBe(false);
  });

  test('refuse un message vide et omet les détails vides', () => {
    expect(reponseErreurSchema.safeParse({ code: 'HORS_ZONE', message: '' }).success).toBe(false);
    expect(versReponseErreur('HORS_ZONE', 'hors zone').details).toBeUndefined();
    expect(versReponseErreur('HORS_ZONE', 'hors zone', { lat: 6.9 }).details).toEqual({ lat: 6.9 });
  });
});