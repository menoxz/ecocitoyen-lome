import { enfilerClassificationsManquantes, traiterClassifications } from "@application/signalement/classer.cas.ts";
import type { Dependances } from "@application/dependances.type.ts";

/**
 * Planificateur de la classification IA.
 *
 * La classification était enfilée dans la file de travaux mais personne ne la vidait : la route
 * `/ia/tick` attendait « le planificateur, en phase P7 ». Résultat observable : tous les dossiers
 * restaient en `modeIa = AUCUN` et l'indicateur `qualite_ia` affichait « aucun dossier classé par
 * l'IA ». Ce module est ce chaînon manquant.
 *
 * Trois garanties :
 *   - un seul cycle à la fois (un cycle lent ne se superpose pas au suivant) ;
 *   - une panne du modèle ne tue pas le serveur : l'erreur est avalée, la tâche repart plus tard ;
 *   - le minuteur ne retient pas le processus (`unref`), donc l'arrêt reste immédiat.
 */
export const INTERVALLE_PLANIFICATEUR_MS = 15_000;

export interface Planificateur {
  /** Arrête la boucle ; un cycle en cours se termine de lui-même. */
  arreter(): void;
  /** Exécute un cycle immédiatement — utilisé au démarrage et par les tests. */
  cycle(): Promise<number>;
}

export function demarrerPlanificateur(
  deps: Dependances,
  intervalleMs: number = INTERVALLE_PLANIFICATEUR_MS,
): Planificateur {
  let enCours = false;
  let vivant = true;

  const cycle = async (): Promise<number> => {
    if (enCours || !vivant) {
      return 0;
    }
    enCours = true;
    try {
      const bilan = await traiterClassifications(deps, 10);
      return bilan.traitees;
    } catch {
      // CR13 : une classification qui échoue ne doit jamais faire tomber le service.
      return 0;
    } finally {
      enCours = false;
    }
  };

  // Reprise : les dossiers créés avant ce branchement n'ont jamais été enfilés.
  enfilerClassificationsManquantes(deps);

  const minuteur = setInterval(() => {
    void cycle();
  }, intervalleMs);
  if (typeof minuteur === "object" && minuteur !== null && "unref" in minuteur) {
    (minuteur as { unref: () => void }).unref();
  }

  return {
    cycle,
    arreter(): void {
      vivant = false;
      clearInterval(minuteur);
    },
  };
}
