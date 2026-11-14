import type { Statut } from "@domaine/signalement/signalement.type.ts";
import type { Signalement } from "@domaine/signalement/signalement.type.ts";
import { dossierVisible } from "@domaine/signalement/visibilite.regle.ts";
import { ErreurMetier } from "@domaine/erreurs.ts";
import type { Acteur, Dependances } from "../dependances.type.ts";
import { chargerDossier } from "./commun.ts";

export interface FiltresLecture {
  readonly statut?: Statut;
  readonly idQuartier?: string;
  readonly idCategorie?: string;
  readonly limite?: number;
}

/**
 * Lecture filtrée par rôle : le filtrage de visibilité est ici, pas dans le front (RB06).
 * Un dossier non public n'est renvoyé qu'à son auteur ou à un profil interne.
 */
export function lister(acteur: Acteur, filtres: FiltresLecture, deps: Dependances): readonly Signalement[] {
  const dossiers = deps.signalements.lister({
    statut: filtres.statut,
    idQuartier: filtres.idQuartier,
    idCategorie: filtres.idCategorie,
    limite: filtres.limite,
  });

  return dossiers.filter((dossier) =>
    dossierVisible(dossier.statut, {
      role: acteur.role,
      estAuteur: dossier.idAuteur === acteur.idUtilisateur,
    }),
  );
}

/** Détail d'un dossier, avec le même contrôle de visibilité que la liste. */
export function consulter(idSignalement: string, acteur: Acteur, deps: Dependances): Signalement {
  const dossier = chargerDossier(idSignalement, deps);
  verifierVisibilite(dossier, acteur);
  return dossier;
}

function verifierVisibilite(dossier: Signalement, acteur: Acteur): void {
  const visible = dossierVisible(dossier.statut, {
    role: acteur.role,
    estAuteur: dossier.idAuteur === acteur.idUtilisateur,
  });
  if (!visible) {
    // Même refus qu'un dossier inexistant : ne pas révéler l'existence d'un brouillon.
    throw new ErreurMetier("RESSOURCE_INTROUVABLE", { ressource: "signalement" });
  }
}