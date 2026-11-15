import type { Signalement } from "@domaine/signalement/signalement.type.ts";
import type { EntreeHistorique } from "@ports/depot-signalements.port.ts";
import { peutVoirIdentiteAuteur } from "@domaine/signalement/visibilite.regle.ts";
import type { Role } from "@domaine/compte/role.type.ts";

/** Forme exposée d''un dossier. Un champ absent n''est jamais envoyé vide : il n''existe pas. */
export interface SignalementExpose {
  readonly id_signalement: string;
  readonly id_auteur?: string;
  readonly id_categorie: string;
  readonly categorie_nom?: string;
  readonly id_quartier: string;
  readonly quartier_nom?: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly description: string;
  readonly statut: string;
  readonly niveau_priorite: string;
  readonly score_priorite: number;
  readonly sans_photo: boolean;
  readonly nb_confirmations: number;
  readonly score_ia: number | null;
  readonly mode_ia: string;
  readonly motif_rejet: string | null;
  readonly date_signalement: string;
  readonly date_validation: string | null;
  readonly date_resolution: string | null;
  readonly date_mise_a_jour: string;
}

/**
 * Projection d''un dossier selon le rôle du lecteur (RG28).
 *
 * L''identité de l''auteur n''est pas « filtrée à l''affichage » : elle sort du serveur uniquement
 * pour un superviseur ou un administrateur.
 */
export function projeter(
  dossier: Signalement,
  role: Role,
  noms: { readonly categorie?: string; readonly quartier?: string } = {},
): SignalementExpose {
  const expose: SignalementExpose = {
    id_signalement: dossier.idSignalement,
    id_categorie: dossier.idCategorie,
    id_quartier: dossier.idQuartier,
    latitude: dossier.latitude,
    longitude: dossier.longitude,
    description: dossier.description,
    statut: dossier.statut,
    niveau_priorite: dossier.niveauPriorite,
    score_priorite: dossier.scorePriorite,
    sans_photo: dossier.sansPhoto,
    nb_confirmations: dossier.nbConfirmations,
    score_ia: dossier.scoreIa,
    mode_ia: dossier.modeIa,
    motif_rejet: dossier.motifRejet,
    date_signalement: dossier.dateSignalement,
    date_validation: dossier.dateValidation,
    date_resolution: dossier.dateResolution,
    date_mise_a_jour: dossier.dateMiseAJour,
  };

  const avecNoms = {
    ...expose,
    ...(noms.categorie ? { categorie_nom: noms.categorie } : {}),
    ...(noms.quartier ? { quartier_nom: noms.quartier } : {}),
    ...(peutVoirIdentiteAuteur(role) ? { id_auteur: dossier.idAuteur } : {}),
  };

  return avecNoms;
}

/** Forme exposée d'une étape d'historique : la décision et son motif, jamais qui l'a prise (RG28). */
export interface HistoriqueExpose {
  readonly ancien_statut: string | null;
  readonly nouveau_statut: string;
  readonly date_changement: string;
  readonly commentaire: string | null;
}

export function projeterHistorique(entrees: readonly EntreeHistorique[]): readonly HistoriqueExpose[] {
  return entrees.map((entree) => ({
    ancien_statut: entree.ancienStatut,
    nouveau_statut: entree.nouveauStatut,
    date_changement: entree.dateChangement,
    commentaire: entree.commentaire,
  }));
}