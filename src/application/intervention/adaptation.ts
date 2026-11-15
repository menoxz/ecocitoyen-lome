import type { Intervention } from "@domaine/intervention/unicite-active.regle.ts";
import type { InterventionLue } from "@ports/depot-signalements.port.ts";

/**
 * Passage entre la forme persistée et la forme que le domaine sait juger.
 *
 * Le domaine ne connaît pas les identifiants d''agent, de commentaire ou d''annulation : il décide
 * d''une règle d''unicité et d''une appartenance d''équipe. La persistance en sait plus. Cette
 * adaptation est le seul endroit qui traduit l''un vers l''autre.
 */
export function versIntervention(lue: InterventionLue): Intervention {
  return {
    idIntervention: lue.idIntervention,
    idSignalement: lue.idSignalement,
    idEquipe: lue.idEquipe,
    statut: lue.statutIntervention,
    dateAffectation: lue.dateAffectation,
  };
}

/** Retrouve la ligne persistée correspondant à la décision du domaine. */
export function ligneDe(lignes: readonly InterventionLue[], intervention: Intervention | null): InterventionLue | null {
  if (!intervention) {
    return null;
  }
  return lignes.find((ligne) => ligne.idIntervention === intervention.idIntervention) ?? null;
}