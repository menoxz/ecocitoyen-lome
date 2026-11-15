import type { EntreeHistorique } from "@ports/depot-signalements.port.ts";
import type { Acteur, Dependances } from "../dependances.type.ts";
import { consulter } from "./lister.cas.ts";

/**
 * Historique d'un dossier, gardé par le service.
 *
 * La lecture passe par `consulter` : un dossier non public n'est pas lisible par un tiers, et son
 * historique non plus. Sans ce détour, la route d'historique deviendrait une porte dérobée qui
 * révèle l'existence d'un brouillon refusé ailleurs.
 */
export function historique(idSignalement: string, acteur: Acteur, deps: Dependances): readonly EntreeHistorique[] {
  const dossier = consulter(idSignalement, acteur, deps);
  return deps.signalements.historiqueDe(dossier.idSignalement);
}
