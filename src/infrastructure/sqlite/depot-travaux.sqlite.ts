import type { DepotTravaux, EtatTache, Tache } from "@ports/depot-travaux.port.ts";
import type { Base } from "./base.ts";

interface LigneTache {
  id_tache: string;
  type: string;
  cible: string;
  etat: EtatTache;
  tentatives: number;
  disponible_le: string;
  derniere_erreur: string | null;
}

function versTache(ligne: LigneTache): Tache {
  return {
    idTache: ligne.id_tache,
    type: ligne.type,
    cible: ligne.cible,
    etat: ligne.etat,
    tentatives: ligne.tentatives,
    disponibleLe: ligne.disponible_le,
    derniereErreur: ligne.derniere_erreur,
  };
}

/**
 * File SQLite.
 *
 * `prendre` réserve et marque en cours dans la même transaction : deux workers ne peuvent pas
 * traiter la même tâche, même si l''un des deux redémarre au mauvais moment.
 */
export function creerDepotTravaux(base: Base): DepotTravaux {
  const selection = base.prepare(
    `SELECT id_tache, type, cible, etat, tentatives, disponible_le, derniere_erreur
     FROM tache WHERE etat = 'EN_ATTENTE' AND disponible_le <= ? ORDER BY disponible_le ASC LIMIT ?`,
  );
  const reservation = base.prepare("UPDATE tache SET etat = 'EN_COURS', tentatives = tentatives + 1 WHERE id_tache = ?");

  const prendreEnTransaction = base.transaction((limite: number, maintenantIso: string): Tache[] => {
    const lignes = selection.all(maintenantIso, limite) as LigneTache[];
    for (const ligne of lignes) {
      reservation.run(ligne.id_tache);
    }
    return lignes.map((ligne) =>
      versTache({ ...ligne, etat: "EN_COURS", tentatives: ligne.tentatives + 1 }),
    );
  });

  return {
    enfiler(entree) {
      base
        .prepare("INSERT INTO tache (id_tache, type, cible, etat, tentatives, disponible_le) VALUES (?, ?, ?, 'EN_ATTENTE', 0, ?)")
        .run(entree.idTache, entree.type, entree.cible, entree.disponibleLe);
    },

    prendre(limite, maintenantIso) {
      const plafond = limite > 0 ? Math.min(limite, 50) : 5;
      return prendreEnTransaction(plafond, maintenantIso);
    },

    terminer(idTache) {
      base.prepare("UPDATE tache SET etat = 'TERMINEE', derniere_erreur = NULL WHERE id_tache = ?").run(idTache);
    },

    echouer(idTache, erreur, prochainEssaiIso) {
      base
        .prepare(
          `UPDATE tache SET etat = CASE WHEN tentatives >= 3 THEN 'ECHOUEE' ELSE 'EN_ATTENTE' END,
             derniere_erreur = ?, disponible_le = ? WHERE id_tache = ?`,
        )
        .run(erreur.slice(0, 300), prochainEssaiIso, idTache);
    },

    parId(idTache) {
      const ligne = base
        .prepare("SELECT id_tache, type, cible, etat, tentatives, disponible_le, derniere_erreur FROM tache WHERE id_tache = ?")
        .get(idTache) as LigneTache | undefined;
      return ligne ? versTache(ligne) : null;
    },

    compterEnAttente() {
      return (base.prepare("SELECT COUNT(*) AS c FROM tache WHERE etat = 'EN_ATTENTE'").get() as { c: number }).c;
    },
  };
}