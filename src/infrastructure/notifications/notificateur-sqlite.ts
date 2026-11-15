import type { EntreeNotification, NotificationItem, Notificateur, TypeNotification } from "@ports/notificateur.port.ts";
import type { Base } from "../sqlite/base.ts";

/**
 * Notificateur SQLite.
 *
 * `marquerLu` filtre sur le destinataire : un utilisateur ne peut pas marquer comme lue la
 * notification d''un autre, même en connaissant son identifiant.
 */
interface LigneNotification {
  id_notification: string;
  id_utilisateur: string;
  id_signalement: string | null;
  titre: string;
  message: string;
  type: TypeNotification;
  canal: string;
  lu: number;
  date_creation: string;
}

function versItem(ligne: LigneNotification): NotificationItem {
  return {
    idNotification: ligne.id_notification,
    idUtilisateur: ligne.id_utilisateur,
    idSignalement: ligne.id_signalement,
    titre: ligne.titre,
    message: ligne.message,
    type: ligne.type,
    canal: ligne.canal,
    lu: ligne.lu === 1,
    dateCreation: ligne.date_creation,
  };
}

export function creerNotificateurSqlite(base: Base): Notificateur {
  const inserer = base.prepare(`
    INSERT INTO notification (id_notification, id_utilisateur, id_signalement, titre, message, type, canal, lu, date_creation)
    VALUES (@id_notification, @id_utilisateur, @id_signalement, @titre, @message, @type, 'APPLICATION', 0, @date_creation)`);

  const parametres = (entree: EntreeNotification) => ({
    id_notification: entree.idNotification,
    id_utilisateur: entree.idUtilisateur,
    id_signalement: entree.idSignalement,
    titre: entree.titre,
    message: entree.message,
    type: entree.type,
    date_creation: entree.dateCreation,
  });

  return {
    notifier(entree) {
      inserer.run(parametres(entree));
    },

    notifierPlusieurs(idUtilisateurs, modele, fabriquerId) {
      const travail = base.transaction(() => {
        for (const idUtilisateur of idUtilisateurs) {
          inserer.run(parametres({ ...modele, idNotification: fabriquerId(), idUtilisateur }));
        }
      });
      travail();
      return idUtilisateurs.length;
    },

    listerPour(idUtilisateur, limite = 50) {
      const plafond = limite > 0 ? Math.min(limite, 200) : 50;
      const lignes = base
        .prepare(
          `SELECT id_notification, id_utilisateur, id_signalement, titre, message, type, canal, lu, date_creation
           FROM notification WHERE id_utilisateur = ? ORDER BY date_creation DESC LIMIT ?`,
        )
        .all(idUtilisateur, plafond) as LigneNotification[];
      return lignes.map(versItem);
    },

    marquerLu(idNotification, idUtilisateur) {
      const resultat = base
        .prepare("UPDATE notification SET lu = 1, date_lecture = ? WHERE id_notification = ? AND id_utilisateur = ?")
        .run(new Date().toISOString(), idNotification, idUtilisateur);
      return resultat.changes > 0;
    },

    marquerToutLu(idUtilisateur) {
      return base
        .prepare("UPDATE notification SET lu = 1, date_lecture = ? WHERE id_utilisateur = ? AND lu = 0")
        .run(new Date().toISOString(), idUtilisateur).changes;
    },
  };
}