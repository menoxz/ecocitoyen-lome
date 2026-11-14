import type {
  DepotSignalements,
  EntreeHistorique,
  FiltresSignalements,
  InterventionLue,
  MediaLu,
} from "@ports/depot-signalements.port.ts";
import type { Signalement, Statut } from "@domaine/signalement/signalement.type.ts";
import { STATUTS } from "@domaine/signalement/signalement.type.ts";
import type { Base } from "./base.ts";

/**
 * Dépôt SQLite des signalements.
 *
 * Deux choix structurent ce fichier :
 * - `nb_confirmations` n''est pas une colonne : il se dérive de la table `confirmation`.
 *   Un compteur stocké finit toujours par mentir après une suppression ou un rejeu.
 * - les écritures d''agrégat se font en une transaction, sinon un dossier peut exister sans
 *   sa première ligne d''historique et l''indicateur de délai de tri devient incalculable.
 */
interface LigneSignalement {
  id_signalement: string;
  id_utilisateur: string;
  id_categorie: string;
  id_categorie_ia: string | null;
  id_quartier: string;
  latitude: number;
  longitude: number;
  description: string;
  statut: Statut;
  niveau_priorite: Signalement["niveauPriorite"];
  score_priorite: number;
  motif_rejet: Signalement["motifRejet"];
  sans_photo: number;
  score_ia: number | null;
  mode_ia: Signalement["modeIa"];
  ia_desaccord: number;
  date_signalement: string;
  date_validation: string | null;
  date_affectation: string | null;
  date_resolution: string | null;
  date_mise_a_jour: string;
  nb_confirmations: number;
}

function versSignalement(ligne: LigneSignalement): Signalement {
  return {
    idSignalement: ligne.id_signalement,
    idAuteur: ligne.id_utilisateur,
    idCategorie: ligne.id_categorie,
    idQuartier: ligne.id_quartier,
    latitude: ligne.latitude,
    longitude: ligne.longitude,
    description: ligne.description,
    statut: ligne.statut,
    niveauPriorite: ligne.niveau_priorite,
    scorePriorite: ligne.score_priorite,
    sansPhoto: ligne.sans_photo === 1,
    nbConfirmations: ligne.nb_confirmations,
    idCategorieIa: ligne.id_categorie_ia,
    scoreIa: ligne.score_ia,
    modeIa: ligne.mode_ia,
    iaDesaccord: ligne.ia_desaccord === 1,
    motifRejet: ligne.motif_rejet,
    dateSignalement: ligne.date_signalement,
    dateValidation: ligne.date_validation,
    dateAffectation: ligne.date_affectation,
    dateResolution: ligne.date_resolution,
    dateMiseAJour: ligne.date_mise_a_jour,
  };
}

const SELECT_SIGNALEMENT = `
  SELECT s.*, (SELECT COUNT(*) FROM confirmation c WHERE c.id_signalement = s.id_signalement) AS nb_confirmations
  FROM signalement s`;

export function creerDepotSignalements(base: Base): DepotSignalements {
  const inserer = base.prepare(`
    INSERT INTO signalement (
      id_signalement, id_utilisateur, id_categorie, id_categorie_ia, id_quartier,
      latitude, longitude, description, statut, niveau_priorite, score_priorite,
      motif_rejet, sans_photo, score_ia, mode_ia, ia_desaccord,
      date_signalement, date_validation, date_affectation, date_resolution, date_mise_a_jour
    ) VALUES (
      @id_signalement, @id_utilisateur, @id_categorie, @id_categorie_ia, @id_quartier,
      @latitude, @longitude, @description, @statut, @niveau_priorite, @score_priorite,
      @motif_rejet, @sans_photo, @score_ia, @mode_ia, @ia_desaccord,
      @date_signalement, @date_validation, @date_affectation, @date_resolution, @date_mise_a_jour
    )`);

  const mettreAJour = base.prepare(`
    UPDATE signalement SET
      id_categorie = @id_categorie, id_categorie_ia = @id_categorie_ia,
      statut = @statut, niveau_priorite = @niveau_priorite, score_priorite = @score_priorite,
      motif_rejet = @motif_rejet, score_ia = @score_ia, mode_ia = @mode_ia, ia_desaccord = @ia_desaccord,
      date_validation = @date_validation, date_affectation = @date_affectation,
      date_resolution = @date_resolution, date_mise_a_jour = @date_mise_a_jour
    WHERE id_signalement = @id_signalement`);

  const parametresInsertion = (s: Signalement) => ({
    id_signalement: s.idSignalement,
    id_utilisateur: s.idAuteur,
    id_categorie: s.idCategorie,
    id_categorie_ia: s.idCategorieIa,
    id_quartier: s.idQuartier,
    latitude: s.latitude,
    longitude: s.longitude,
    description: s.description,
    statut: s.statut,
    niveau_priorite: s.niveauPriorite,
    score_priorite: s.scorePriorite,
    motif_rejet: s.motifRejet,
    sans_photo: s.sansPhoto ? 1 : 0,
    score_ia: s.scoreIa,
    mode_ia: s.modeIa,
    ia_desaccord: s.iaDesaccord ? 1 : 0,
    date_signalement: s.dateSignalement,
    date_validation: s.dateValidation,
    date_affectation: s.dateAffectation,
    date_resolution: s.dateResolution,
    date_mise_a_jour: s.dateMiseAJour,
  });

  const insererHistorique = base.prepare(`
    INSERT INTO historique_statut (
      id_historique, id_signalement, ancien_statut, nouveau_statut, id_auteur, date_changement, commentaire
    ) VALUES (
      @id_historique, @id_signalement, @ancien_statut, @nouveau_statut, @id_auteur, @date_changement, @commentaire
    )`);

  const insererMedia = base.prepare(`
    INSERT INTO media (
      id_media, id_signalement, id_intervention, type, chemin, mime, taille_octets, masque, date_ajout
    ) VALUES (
      @id_media, @id_signalement, @id_intervention, @type, @chemin, @mime, @taille_octets, @masque, @date_ajout
    )`);

  const insererIntervention = base.prepare(`
    INSERT INTO intervention (
      id_intervention, id_signalement, id_equipe, id_agent, id_affecte_par,
      statut_intervention, date_affectation, date_debut, date_fin, commentaire
    ) VALUES (
      @id_intervention, @id_signalement, @id_equipe, @id_agent, @id_affecte_par,
      @statut_intervention, @date_affectation, @date_debut, @date_fin, @commentaire
    )`);

  const majInterventionSql = base.prepare(`
    UPDATE intervention SET
      id_agent = @id_agent, statut_intervention = @statut_intervention,
      date_debut = @date_debut, date_fin = @date_fin, commentaire = @commentaire
    WHERE id_intervention = @id_intervention`);

  const parametresIntervention = (i: InterventionLue) => ({
    id_intervention: i.idIntervention,
    id_signalement: i.idSignalement,
    id_equipe: i.idEquipe,
    id_agent: i.idAgent,
    id_affecte_par: i.idAffectePar,
    statut_intervention: i.statutIntervention,
    date_affectation: i.dateAffectation,
    date_debut: i.dateDebut,
    date_fin: i.dateFin,
    commentaire: i.commentaire,
  });

  const parametresHistorique = (h: EntreeHistorique) => ({
    id_historique: h.idHistorique,
    id_signalement: h.idSignalement,
    ancien_statut: h.ancienStatut,
    nouveau_statut: h.nouveauStatut,
    id_auteur: h.idAuteur,
    date_changement: h.dateChangement,
    commentaire: h.commentaire,
  });

  const creerEnTransaction = base.transaction((signalement: Signalement, historique: EntreeHistorique) => {
    inserer.run(parametresInsertion(signalement));
    insererHistorique.run(parametresHistorique(historique));
  });

  return {
    parId(idSignalement) {
      const ligne = base.prepare(`${SELECT_SIGNALEMENT} WHERE s.id_signalement = ?`).get(idSignalement) as
        | LigneSignalement
        | undefined;
      return ligne ? versSignalement(ligne) : null;
    },

    creer(signalement, historiqueInitial) {
      creerEnTransaction(signalement, historiqueInitial);
    },

    enregistrer(signalement) {
      mettreAJour.run(parametresInsertion(signalement));
    },

    lister(filtres = {}) {
      const conditions: string[] = [];
      const valeurs: (string | number)[] = [];
      const plafond = filtres.limite && filtres.limite > 0 ? Math.min(filtres.limite, 500) : 200;

      if (filtres.statut) {
        conditions.push("s.statut = ?");
        valeurs.push(filtres.statut);
      }
      if (filtres.idQuartier) {
        conditions.push("s.id_quartier = ?");
        valeurs.push(filtres.idQuartier);
      }
      if (filtres.idCategorie) {
        conditions.push("s.id_categorie = ?");
        valeurs.push(filtres.idCategorie);
      }
      if (filtres.idAuteur) {
        conditions.push("s.id_utilisateur = ?");
        valeurs.push(filtres.idAuteur);
      }

      const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
      const sql = `${SELECT_SIGNALEMENT}${where} ORDER BY s.date_mise_a_jour DESC LIMIT ?`;
      const lignes = base.prepare(sql).all(...valeurs, plafond) as LigneSignalement[];
      return lignes.map(versSignalement);
    },

    historiqueDe(idSignalement) {
      const lignes = base
        .prepare(
          `SELECT id_historique, id_signalement, ancien_statut, nouveau_statut, id_auteur, date_changement, commentaire
           FROM historique_statut WHERE id_signalement = ? ORDER BY date_changement ASC`,
        )
        .all(idSignalement) as {
        id_historique: string;
        id_signalement: string;
        ancien_statut: Statut | null;
        nouveau_statut: Statut;
        id_auteur: string;
        date_changement: string;
        commentaire: string | null;
      }[];
      return lignes.map((ligne) => ({
        idHistorique: ligne.id_historique,
        idSignalement: ligne.id_signalement,
        ancienStatut: ligne.ancien_statut,
        nouveauStatut: ligne.nouveau_statut,
        idAuteur: ligne.id_auteur,
        dateChangement: ligne.date_changement,
        commentaire: ligne.commentaire,
      }));
    },

    mediasDe(idSignalement) {
      const lignes = base
        .prepare(
          `SELECT id_media, id_signalement, id_intervention, type, chemin, mime, taille_octets, masque, date_ajout
           FROM media WHERE id_signalement = ? ORDER BY date_ajout ASC`,
        )
        .all(idSignalement) as {
        id_media: string;
        id_signalement: string;
        id_intervention: string | null;
        type: MediaLu["type"];
        chemin: string;
        mime: string;
        taille_octets: number;
        masque: number;
        date_ajout: string;
      }[];
      return lignes.map((ligne) => ({
        idMedia: ligne.id_media,
        idSignalement: ligne.id_signalement,
        idIntervention: ligne.id_intervention,
        type: ligne.type,
        chemin: ligne.chemin,
        mime: ligne.mime,
        tailleOctets: ligne.taille_octets,
        masque: ligne.masque === 1,
        dateAjout: ligne.date_ajout,
      }));
    },

    interventionsDe(idSignalement) {
      const lignes = base
        .prepare(
          `SELECT id_intervention, id_signalement, id_equipe, id_agent, id_affecte_par,
                  statut_intervention, date_affectation, date_debut, date_fin, commentaire
           FROM intervention WHERE id_signalement = ? ORDER BY date_affectation ASC`,
        )
        .all(idSignalement) as {
        id_intervention: string;
        id_signalement: string;
        id_equipe: string;
        id_agent: string | null;
        id_affecte_par: string;
        statut_intervention: InterventionLue["statutIntervention"];
        date_affectation: string;
        date_debut: string | null;
        date_fin: string | null;
        commentaire: string | null;
      }[];
      return lignes.map((ligne) => ({
        idIntervention: ligne.id_intervention,
        idSignalement: ligne.id_signalement,
        idEquipe: ligne.id_equipe,
        idAgent: ligne.id_agent,
        idAffectePar: ligne.id_affecte_par,
        statutIntervention: ligne.statut_intervention,
        dateAffectation: ligne.date_affectation,
        dateDebut: ligne.date_debut,
        dateFin: ligne.date_fin,
        commentaire: ligne.commentaire,
      }));
    },

    ajouterConfirmation(idSignalement, idUtilisateur, dateConfirmation) {
      const resultat = base
        .prepare(
          "INSERT OR IGNORE INTO confirmation (id_signalement, id_utilisateur, date_confirmation) VALUES (?, ?, ?)",
        )
        .run(idSignalement, idUtilisateur, dateConfirmation);
      return resultat.changes === 1;
    },

    nombreConfirmations(idSignalement) {
      const ligne = base
        .prepare("SELECT COUNT(*) AS c FROM confirmation WHERE id_signalement = ?")
        .get(idSignalement) as { c: number };
      return ligne.c;
    },

    ajouterHistorique(entree) {
      insererHistorique.run(parametresHistorique(entree));
    },

    ajouterMedia(media) {
      insererMedia.run({
        id_media: media.idMedia,
        id_signalement: media.idSignalement,
        id_intervention: media.idIntervention,
        type: media.type,
        chemin: media.chemin,
        mime: media.mime,
        taille_octets: media.tailleOctets,
        masque: media.masque ? 1 : 0,
        date_ajout: media.dateAjout,
      });
    },

    creerIntervention(intervention) {
      insererIntervention.run(parametresIntervention(intervention));
    },

    majIntervention(intervention) {
      majInterventionSql.run(parametresIntervention(intervention));
    },

    compterParStatut() {
      const compte = Object.fromEntries(STATUTS.map((statut) => [statut, 0])) as Record<Statut, number>;
      const lignes = base
        .prepare("SELECT statut, COUNT(*) AS c FROM signalement GROUP BY statut")
        .all() as { statut: Statut; c: number }[];
      for (const ligne of lignes) {
        compte[ligne.statut] = ligne.c;
      }
      return compte;
    },
  };
}