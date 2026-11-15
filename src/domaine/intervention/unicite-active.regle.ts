import { ErreurMetier } from '@domaine/erreurs.ts';

/**
 * Un signalement ne porte qu’une seule intervention active (§5.2, contrainte d’intégrité §9.2).
 * La règle est ici pour être testable ; la base la double par un index partiel unique.
 */
export const STATUTS_INTERVENTION = ['PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ANNULEE'] as const;

export type StatutIntervention = (typeof STATUTS_INTERVENTION)[number];

export interface Intervention {
  readonly idIntervention: string;
  readonly idSignalement: string;
  readonly idEquipe: string;
  readonly statut: StatutIntervention;
  readonly dateAffectation: string;
}

function estActive(intervention: Intervention): boolean {
  return intervention.statut === 'PLANIFIEE' || intervention.statut === 'EN_COURS';
}

export function verifierAffectationPossible(interventions: readonly Intervention[]): void {
  const active = interventions.find(estActive);
  if (active) {
    throw new ErreurMetier('INTERVENTION_ACTIVE_EXISTANTE', { intervention: active.idIntervention });
  }
}

export function interventionActive(interventions: readonly Intervention[]): Intervention | null {
  return interventions.find(estActive) ?? null;
}

/** Un agent ne clôture que l’intervention de son équipe (§3.3, note b). */
export function verifierClotureParAgent(intervention: Intervention | null, idEquipeAgent: string | null): void {
  if (!intervention) {
    throw new ErreurMetier('INTERVENTION_AUCUNE');
  }
  if (intervention.idEquipe !== idEquipeAgent) {
    throw new ErreurMetier('DROIT_REFUSE', { raison: 'equipe_differente' });
  }
}
/** Un agent ne démarre qu'une intervention de son équipe (§3.3, note b). */
export function verifierAppartenanceEquipe(intervention: Intervention | null, idEquipeAgent: string | null): void {
  if (!intervention) {
    throw new ErreurMetier("INTERVENTION_AUCUNE");
  }
  if (intervention.idEquipe !== idEquipeAgent) {
    throw new ErreurMetier("DROIT_REFUSE", { raison: "equipe_differente" });
  }
}