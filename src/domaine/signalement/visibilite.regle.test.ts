import { describe, expect, test } from 'bun:test';
import { dossierVisible, dossierVisibleParAgent, peutVoirIdentiteAuteur } from './visibilite.regle.ts';

describe('visibilité des dossiers (§5.1)', () => {
  test('les quatre statuts publics sont visibles par tous', () => {
    for (const statut of ['VALIDE', 'EN_COURS', 'RESOLU', 'ROUVERT'] as const) {
      expect(dossierVisible(statut, { role: 'VISITEUR', estAuteur: false })).toBe(true);
      expect(dossierVisible(statut, { role: 'CITOYEN', estAuteur: false })).toBe(true);
    }
  });

  test('Nouveau et Rejeté sont cachés au public et aux autres citoyens', () => {
    for (const statut of ['NOUVEAU', 'REJETE'] as const) {
      expect(dossierVisible(statut, { role: 'VISITEUR', estAuteur: false })).toBe(false);
      expect(dossierVisible(statut, { role: 'CITOYEN', estAuteur: false })).toBe(false);
      expect(dossierVisible(statut, { role: 'AGENT', estAuteur: false })).toBe(false);
    }
  });

  test('l auteur voit toujours son dossier', () => {
    for (const statut of ['NOUVEAU', 'REJETE', 'VALIDE'] as const) {
      expect(dossierVisible(statut, { role: 'CITOYEN', estAuteur: true })).toBe(true);
    }
  });

  test('superviseur et administrateur voient tout', () => {
    for (const statut of ['NOUVEAU', 'REJETE'] as const) {
      expect(dossierVisible(statut, { role: 'SUPERVISEUR', estAuteur: false })).toBe(true);
      expect(dossierVisible(statut, { role: 'ADMIN', estAuteur: false })).toBe(true);
    }
  });

  test('un agent voit en plus les dossiers de son équipe', () => {
    expect(dossierVisibleParAgent('NOUVEAU', true, false)).toBe(true);
    expect(dossierVisibleParAgent('NOUVEAU', false, false)).toBe(false);
    expect(dossierVisibleParAgent('VALIDE', false, false)).toBe(true);
  });

  test('seuls superviseur et administrateur voient l identité de l auteur (RG28)', () => {
    expect(peutVoirIdentiteAuteur('VISITEUR')).toBe(false);
    expect(peutVoirIdentiteAuteur('CITOYEN')).toBe(false);
    expect(peutVoirIdentiteAuteur('AGENT')).toBe(false);
    expect(peutVoirIdentiteAuteur('SUPERVISEUR')).toBe(true);
    expect(peutVoirIdentiteAuteur('ADMIN')).toBe(true);
  });
});