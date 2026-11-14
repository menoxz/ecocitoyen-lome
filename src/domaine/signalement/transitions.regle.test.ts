import { describe, expect, test } from 'bun:test';
import { ErreurMetier } from '@domaine/erreurs.ts';
import type { ContexteActeur } from './signalement.type.ts';
import { TRANSITIONS, transitionsDisponibles, verifierTransition } from './transitions.regle.ts';

const acteur = (surcharge: Partial<ContexteActeur> = {}): ContexteActeur => ({
  role: 'SUPERVISEUR',
  idUtilisateur: 'u-sup',
  estAuteur: false,
  estAgentDeLEquipeAffectee: false,
  joursDepuisResolution: null,
  ...surcharge,
});

/** Code d’erreur retourné, ou ''AUCUNE' si la transition passe. */
function issue(appel: () => unknown): string {
  try {
    appel();
    return 'AUCUNE';
  } catch (erreur) {
    return erreur instanceof ErreurMetier ? erreur.code : 'ERREUR_INATTENDUE';
  }
}

describe('table des transitions', () => {
  test('décrit exactement les dix transitions du cahier des charges', () => {
    expect(TRANSITIONS.map((t) => t.code)).toEqual(['T0', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9']);
    expect(TRANSITIONS.filter((t) => t.de === null).length).toBe(1);
  });

  test('refuse une paire absente de la table (CR10)', () => {
    expect(issue(() => verifierTransition('NOUVEAU', 'RESOLU', acteur()))).toBe('TRANSITION_INTERDITE');
    expect(issue(() => verifierTransition('RESOLU', 'NOUVEAU', acteur()))).toBe('TRANSITION_INTERDITE');
    expect(issue(() => verifierTransition('REJETE', 'VALIDE', acteur()))).toBe('TRANSITION_INTERDITE');
  });
});

describe('T0 création', () => {
  test('autorise un citoyen connecté', () => {
    expect(verifierTransition(null, 'NOUVEAU', acteur({ role: 'CITOYEN' }))).toBe('T0');
  });

  test('refuse un visiteur', () => {
    expect(issue(() => verifierTransition(null, 'NOUVEAU', acteur({ role: 'VISITEUR' })))).toBe('DROIT_REFUSE');
  });
});

describe('T1 validation', () => {
  const donnees = { idCategorie: 'cat-1', niveauPriorite: 'HAUTE' as const };

  test('autorise un superviseur avec catégorie et priorité', () => {
    expect(verifierTransition('NOUVEAU', 'VALIDE', acteur(), donnees)).toBe('T1');
  });

  test('refuse un agent même avec des données complètes', () => {
    expect(issue(() => verifierTransition('NOUVEAU', 'VALIDE', acteur({ role: 'AGENT' }), donnees))).toBe('DROIT_REFUSE');
  });

  test('refuse une validation sans priorité fixée', () => {
    expect(issue(() => verifierTransition('NOUVEAU', 'VALIDE', acteur(), { idCategorie: 'cat-1' }))).toBe(
      'CONTRAT_INVALIDE',
    );
  });
});

describe('T2 rejet au tri', () => {
  test('autorise un superviseur avec motif', () => {
    expect(verifierTransition('NOUVEAU', 'REJETE', acteur(), { motifRejet: 'Doublon' })).toBe('T2');
  });

  test('refuse un rejet sans motif (CR5)', () => {
    expect(issue(() => verifierTransition('NOUVEAU', 'REJETE', acteur()))).toBe('MOTIF_REQUIS');
  });
});

describe('T3 affectation', () => {
  test('autorise un superviseur avec équipe', () => {
    expect(verifierTransition('VALIDE', 'EN_COURS', acteur(), { idEquipe: 'eq-1' })).toBe('T3');
  });

  test('refuse une affectation sans équipe', () => {
    expect(issue(() => verifierTransition('VALIDE', 'EN_COURS', acteur()))).toBe('CONTRAT_INVALIDE');
  });
});

describe('T4 rejet après validation', () => {
  test('autorise un administrateur avec motif', () => {
    expect(verifierTransition('VALIDE', 'REJETE', acteur({ role: 'ADMIN' }), { motifRejet: 'Hors zone' })).toBe('T4');
  });

  test('refuse un citoyen', () => {
    expect(issue(() => verifierTransition('VALIDE', 'REJETE', acteur({ role: 'CITOYEN' }), { motifRejet: 'Autre' }))).toBe(
      'DROIT_REFUSE',
    );
  });
});

describe('T5 résolution', () => {
  const donnees = { aPhotoResolution: true, commentaire: 'Site nettoyé et bacs relevés' };

  test('autorise un agent de l’équipe affectée avec photo', () => {
    expect(
      verifierTransition(
        'EN_COURS',
        'RESOLU',
        acteur({ role: 'AGENT', estAgentDeLEquipeAffectee: true }),
        donnees,
      ),
    ).toBe('T5');
  });

  test('refuse un agent d’une autre équipe (CR7)', () => {
    expect(
      issue(() =>
        verifierTransition('EN_COURS', 'RESOLU', acteur({ role: 'AGENT', estAgentDeLEquipeAffectee: false }), donnees),
      ),
    ).toBe('DROIT_REFUSE');
  });

  test('refuse une clôture sans photo de résolution (CR8)', () => {
    expect(
      issue(() =>
        verifierTransition(
          'EN_COURS',
          'RESOLU',
          acteur({ role: 'AGENT', estAgentDeLEquipeAffectee: true }),
          { commentaire: 'Nettoyage effectué' },
        ),
      ),
    ).toBe('PHOTO_MANQUANTE');
  });
});

describe('T6 annulation d’intervention', () => {
  test('autorise un superviseur avec motif', () => {
    expect(verifierTransition('EN_COURS', 'VALIDE', acteur(), { commentaire: 'Équipe indisponible' })).toBe('T6');
  });

  test('refuse une annulation sans motif', () => {
    expect(issue(() => verifierTransition('EN_COURS', 'VALIDE', acteur()))).toBe('MOTIF_REQUIS');
  });
});

describe('T7 contestation', () => {
  test('autorise le citoyen auteur dans les sept jours', () => {
    expect(
      verifierTransition(
        'RESOLU',
        'ROUVERT',
        acteur({ role: 'CITOYEN', estAuteur: true, joursDepuisResolution: 6 }),
        { commentaire: 'Déchets toujours présents sur place' },
      ),
    ).toBe('T7');
  });

  test('refuse un citoyen non auteur', () => {
    expect(
      issue(() =>
        verifierTransition(
          'RESOLU',
          'ROUVERT',
          acteur({ role: 'CITOYEN', estAuteur: false, joursDepuisResolution: 2 }),
          { commentaire: 'Je ne suis pas concerné mais je conteste' },
        ),
      ),
    ).toBe('DROIT_REFUSE');
  });

  test('refuse après le délai de sept jours', () => {
    expect(
      issue(() =>
        verifierTransition(
          'RESOLU',
          'ROUVERT',
          acteur({ role: 'CITOYEN', estAuteur: true, joursDepuisResolution: 8 }),
          { commentaire: 'Contestation tardive du nettoyage' },
        ),
      ),
    ).toBe('DELAI_CONTESTATION_DEPASSE');
  });
});

describe('T8 réaffectation', () => {
  test('autorise un superviseur avec équipe', () => {
    expect(verifierTransition('ROUVERT', 'EN_COURS', acteur(), { idEquipe: 'eq-2' })).toBe('T8');
  });

  test('refuse un agent', () => {
    expect(issue(() => verifierTransition('ROUVERT', 'EN_COURS', acteur({ role: 'AGENT' }), { idEquipe: 'eq-2' }))).toBe(
      'DROIT_REFUSE',
    );
  });
});

describe('T9 révision du rejet', () => {
  test('autorise un superviseur avec commentaire', () => {
    expect(verifierTransition('REJETE', 'NOUVEAU', acteur(), { commentaire: 'Rejet erroné, dossier rouvert' })).toBe('T9');
  });

  test('refuse un commentaire trop court', () => {
    expect(issue(() => verifierTransition('REJETE', 'NOUVEAU', acteur(), { commentaire: 'ok' }))).toBe(
      'COMMENTAIRE_REQUIS',
    );
  });
});

describe('transitions disponibles', () => {
  test('liste les actions de tri d’un superviseur sur un dossier validé', () => {
    expect(transitionsDisponibles('VALIDE', acteur())).toEqual(['T3', 'T4']);
  });

  test('ne propose rien à un agent hors de son équipe, et T5 dans son équipe', () => {
    expect(transitionsDisponibles('EN_COURS', acteur({ role: 'AGENT' }))).toEqual([]);
    expect(
      transitionsDisponibles('EN_COURS', acteur({ role: 'AGENT', estAgentDeLEquipeAffectee: true })),
    ).toEqual(['T5']);
  });

  test('ne propose rien à un visiteur', () => {
    expect(transitionsDisponibles('NOUVEAU', acteur({ role: 'VISITEUR' }))).toEqual([]);
  });
});