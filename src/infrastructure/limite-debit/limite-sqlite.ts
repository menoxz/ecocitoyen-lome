import type { LimiteDebit } from "@ports/limite-debit.port.ts";
import type { Base } from "../sqlite/base.ts";

/**
 * Compteurs de débit persistés (RG23, RG24).
 *
 * Persistés volontairement : un attaquant qui obtient un redémarrage ne doit pas récupérer
 * cinq tentatives de connexion gratuites, et un citoyen ne doit pas contourner son quota
 * horaire en attendant un redéploiement.
 */
export function creerLimiteDebitSqlite(base: Base): LimiteDebit {
  const incrementer = base.prepare(`
    INSERT INTO limite_debit (cle, fenetre_debut, compteur) VALUES (?, ?, 1)
    ON CONFLICT (cle, fenetre_debut) DO UPDATE SET compteur = compteur + 1
    RETURNING compteur`);

  return {
    incrementer(cle, fenetreDebut) {
      const ligne = incrementer.get(cle, fenetreDebut) as { compteur: number };
      return ligne.compteur;
    },

    lire(cle, fenetreDebut) {
      const ligne = base
        .prepare("SELECT compteur FROM limite_debit WHERE cle = ? AND fenetre_debut = ?")
        .get(cle, fenetreDebut) as { compteur: number } | undefined;
      return ligne ? ligne.compteur : 0;
    },

    reinitialiser(cle, fenetreDebut) {
      base.prepare("DELETE FROM limite_debit WHERE cle = ? AND fenetre_debut = ?").run(cle, fenetreDebut);
    },
  };
}