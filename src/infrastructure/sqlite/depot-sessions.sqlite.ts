import type { DepotSessions, Session } from "@ports/depot-sessions.port.ts";
import type { Base } from "./base.ts";

/** Sessions persistées : un redémarrage ne déconnecte pas les utilisateurs en pleine action. */
export function creerDepotSessions(base: Base): DepotSessions {
  const lire = (jetonHache: string): { jeton_hache: string; id_utilisateur: string; expire_le: string; cree_le: string } | undefined =>
    base
      .prepare("SELECT jeton_hache, id_utilisateur, expire_le, cree_le FROM session WHERE jeton_hache = ?")
      .get(jetonHache) as
      | { jeton_hache: string; id_utilisateur: string; expire_le: string; cree_le: string }
      | undefined;

  return {
    creer(session: Session) {
      base
        .prepare("INSERT INTO session (jeton_hache, id_utilisateur, expire_le, cree_le) VALUES (?, ?, ?, ?)")
        .run(session.jetonHache, session.idUtilisateur, session.expireLe, session.creeLe);
    },

    parJetonHache(jetonHache) {
      const ligne = lire(jetonHache);
      if (!ligne) return null;
      return {
        jetonHache: ligne.jeton_hache,
        idUtilisateur: ligne.id_utilisateur,
        expireLe: ligne.expire_le,
        creeLe: ligne.cree_le,
      };
    },

    prolonger(jetonHache, nouvelExpireLe) {
      base.prepare("UPDATE session SET expire_le = ? WHERE jeton_hache = ?").run(nouvelExpireLe, jetonHache);
    },

    supprimer(jetonHache) {
      base.prepare("DELETE FROM session WHERE jeton_hache = ?").run(jetonHache);
    },

    supprimerExpirees(maintenantIso) {
      return base.prepare("DELETE FROM session WHERE expire_le < ?").run(maintenantIso).changes;
    },

    supprimerPourUtilisateur(idUtilisateur) {
      return base.prepare("DELETE FROM session WHERE id_utilisateur = ?").run(idUtilisateur).changes;
    },
  };
}