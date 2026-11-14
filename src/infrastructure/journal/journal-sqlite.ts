import type { EntreeJournal, Journal } from "@ports/journal.port.ts";
import type { Base } from "../sqlite/base.ts";

/**
 * Journal append-only (RB08, ENF09).
 *
 * Aucune méthode de mise à jour ni de suppression : le seul moyen de faire disparaître une ligne
 * est de purger au-delà de la durée de conservation, par une tâche explicite.
 */
interface LigneJournal {
  id_journal: string;
  acteur: string;
  id_utilisateur: string | null;
  action: string;
  cible: string | null;
  avant: string | null;
  apres: string | null;
  adresse_ip: string | null;
  date_action: string;
}

export function creerJournalSqlite(base: Base): Journal {
  const inserer = base.prepare(`
    INSERT INTO journal_audit (id_journal, acteur, id_utilisateur, action, cible, avant, apres, adresse_ip, date_action)
    VALUES (@id_journal, @acteur, @id_utilisateur, @action, @cible, @avant, @apres, @adresse_ip, @date_action)`);

  const versEntree = (ligne: LigneJournal): EntreeJournal => ({
    idJournal: ligne.id_journal,
    acteur: ligne.acteur,
    idUtilisateur: ligne.id_utilisateur,
    action: ligne.action,
    cible: ligne.cible,
    avant: ligne.avant,
    apres: ligne.apres,
    adresseIp: ligne.adresse_ip,
    dateAction: ligne.date_action,
  });

  return {
    enregistrer(entree) {
      inserer.run({
        id_journal: entree.idJournal,
        acteur: entree.acteur,
        id_utilisateur: entree.idUtilisateur,
        action: entree.action,
        cible: entree.cible,
        avant: entree.avant,
        apres: entree.apres,
        adresse_ip: entree.adresseIp,
        date_action: entree.dateAction,
      });
    },

    lister(options = {}) {
      const plafond = options.limite && options.limite > 0 ? Math.min(options.limite, 500) : 100;
      const lignes = options.action
        ? (base
            .prepare("SELECT * FROM journal_audit WHERE action = ? ORDER BY date_action DESC LIMIT ?")
            .all(options.action, plafond) as LigneJournal[])
        : (base
            .prepare("SELECT * FROM journal_audit ORDER BY date_action DESC LIMIT ?")
            .all(plafond) as LigneJournal[]);
      return lignes.map(versEntree);
    },
  };
}