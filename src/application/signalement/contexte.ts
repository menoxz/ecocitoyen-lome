import type { Acteur } from "../dependances.type.ts";
import type { ContexteActeur, Signalement } from "@domaine/signalement/signalement.type.ts";

/**
 * Traduit un acteur authentifié et un dossier en contexte de décision du domaine.
 *
 * Point unique de cette traduction : si la définition de « agent de l''équipe affectée » change,
 * elle change ici et pas dans cinq cas d''usage.
 *
 * `estDeLEquipeAffectee` est fourni par l''appelant qui, seul, connaît l''intervention active.
 * Le défaut est `false` : ne pas savoir n''autorise rien.
 */
export function contexteDe(
  acteur: Acteur,
  dossier: Signalement | null,
  options: {
    readonly estDeLEquipeAffectee?: boolean;
    readonly maintenantIso?: string;
  } = {},
): ContexteActeur {
  return {
    role: acteur.role,
    idUtilisateur: acteur.idUtilisateur,
    estAuteur: dossier !== null && dossier.idAuteur === acteur.idUtilisateur,
    estAgentDeLEquipeAffectee: options.estDeLEquipeAffectee === true,
    joursDepuisResolution: options.maintenantIso
      ? joursEntre(dossier?.dateResolution ?? null, options.maintenantIso)
      : null,
  };
}

/** Nombre de jours entre deux instants ISO, ou null si l'un des deux est inexploitable. */
export function joursEntre(depuisIso: string | null, maintenantIso: string): number | null {
  if (!depuisIso) {
    return null;
  }
  const ecart = Date.parse(maintenantIso) - Date.parse(depuisIso);
  if (!Number.isFinite(ecart)) {
    return null;
  }
  return ecart / 86_400_000;
}