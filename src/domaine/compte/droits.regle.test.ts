import { describe, expect, test } from 'bun:test';
import { ACTIONS, MATRICE_DROITS, aLeDroit, niveauHierarchique, rolesAutorises } from './droits.regle.ts';
import { ROLES, type Role } from './role.type.ts';

describe('matrice des droits (§3.3)', () => {
  test('déclare chaque action avec au moins un rôle autorisé', () => {
    for (const action of ACTIONS) {
      expect(rolesAutorises(action).length).toBeGreaterThan(0);
    }
    expect(new Set(ACTIONS).size).toBe(ACTIONS.length);
  });

  test('n’autorise aucun rôle inventé', () => {
    for (const action of ACTIONS) {
      for (const role of MATRICE_DROITS[action]) {
        expect(ROLES).toContain(role);
      }
    }
  });

  test('compte les droits par profil, conformément à la matrice', () => {
    const compte = (role: Role): number => ACTIONS.filter((action) => aLeDroit(role, action)).length;

    expect(compte('VISITEUR')).toBe(2);
    expect(compte('CITOYEN')).toBe(8);
    expect(compte('AGENT')).toBe(9);
    expect(compte('SUPERVISEUR')).toBe(21);
    expect(compte('ADMIN')).toBe(26);
  });

  test('le visiteur consulte le public et rien d’autre', () => {
    expect(aLeDroit('VISITEUR', 'voirCarteEtSignalementsPublics')).toBe(true);
    expect(aLeDroit('VISITEUR', 'voirStatistiquesPubliques')).toBe(true);
    expect(aLeDroit('VISITEUR', 'creerSignalement')).toBe(false);
    expect(aLeDroit('VISITEUR', 'confirmerSignalement')).toBe(false);
    expect(aLeDroit('VISITEUR', 'voirSesSignalements')).toBe(false);
  });

  test('le citoyen signale, confirme, conteste et gère son compte', () => {
    expect(aLeDroit('CITOYEN', 'creerSignalement')).toBe(true);
    expect(aLeDroit('CITOYEN', 'confirmerSignalement')).toBe(true);
    expect(aLeDroit('CITOYEN', 'rouvrirSignalement')).toBe(true);
    expect(aLeDroit('CITOYEN', 'anonymiserCompte')).toBe(true);
    expect(aLeDroit('CITOYEN', 'validerSignalement')).toBe(false);
    expect(aLeDroit('CITOYEN', 'exporterSignalements')).toBe(false);
    expect(aLeDroit('CITOYEN', 'voirIdentiteAuteur')).toBe(false);
  });

  test('l’agent exécute et clôture, sans décider du tri ni exporter', () => {
    expect(aLeDroit('AGENT', 'demarrerIntervention')).toBe(true);
    expect(aLeDroit('AGENT', 'cloturerIntervention')).toBe(true);
    expect(aLeDroit('AGENT', 'voirTousSignalements')).toBe(true);
    expect(aLeDroit('AGENT', 'validerSignalement')).toBe(false);
    expect(aLeDroit('AGENT', 'rejeterSignalement')).toBe(false);
    expect(aLeDroit('AGENT', 'masquerPhoto')).toBe(false);
    expect(aLeDroit('AGENT', 'exporterSignalements')).toBe(false);
  });

  test('le superviseur décide, affecte, masque et exporte', () => {
    expect(aLeDroit('SUPERVISEUR', 'validerSignalement')).toBe(true);
    expect(aLeDroit('SUPERVISEUR', 'rejeterSignalement')).toBe(true);
    expect(aLeDroit('SUPERVISEUR', 'affecterEquipe')).toBe(true);
    expect(aLeDroit('SUPERVISEUR', 'masquerPhoto')).toBe(true);
    expect(aLeDroit('SUPERVISEUR', 'exporterSignalements')).toBe(true);
    expect(aLeDroit('SUPERVISEUR', 'voirIdentiteAuteur')).toBe(true);
    expect(aLeDroit('SUPERVISEUR', 'creerCompteInterne')).toBe(false);
    expect(aLeDroit('SUPERVISEUR', 'consulterJournalAudit')).toBe(false);
    expect(aLeDroit('SUPERVISEUR', 'modifierReferentiel')).toBe(false);
  });

  test('l’administrateur gère comptes, référentiels, paramètres et audit', () => {
    expect(aLeDroit('ADMIN', 'creerCompteInterne')).toBe(true);
    expect(aLeDroit('ADMIN', 'modifierCompte')).toBe(true);
    expect(aLeDroit('ADMIN', 'consulterJournalAudit')).toBe(true);
    expect(aLeDroit('ADMIN', 'modifierReferentiel')).toBe(true);
    expect(aLeDroit('ADMIN', 'modifierParametres')).toBe(true);
    expect(aLeDroit('ADMIN', 'validerSignalement')).toBe(true);
    expect(aLeDroit('ADMIN', 'anonymiserCompte')).toBe(false);
  });

  test('ordonne les profils selon RB01', () => {
    expect(niveauHierarchique('VISITEUR')).toBeLessThan(niveauHierarchique('CITOYEN'));
    expect(niveauHierarchique('CITOYEN')).toBeLessThan(niveauHierarchique('AGENT'));
    expect(niveauHierarchique('AGENT')).toBeLessThan(niveauHierarchique('SUPERVISEUR'));
    expect(niveauHierarchique('SUPERVISEUR')).toBeLessThan(niveauHierarchique('ADMIN'));
  });
});