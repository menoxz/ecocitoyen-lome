import { ErreurMetier } from "@domaine/erreurs.ts";
import { aLeDroit } from "@domaine/compte/droits.regle.ts";
import { verifierModificationCompte, type ModificationCompte } from "@domaine/compte/administration.regle.ts";
import type { Compte } from "@domaine/compte/compte.type.ts";
import type { Acteur, Dependances } from "../dependances.type.ts";
import { journaliser } from "./inscrire.cas.ts";

export interface CommandeModificationCompte extends ModificationCompte {}

/**
 * Changement de rôle ou d'activation d'un compte.
 *
 * Le domaine garde le verrou du dernier administrateur ; ce cas d'usage constate le droit, charge
 * la cible, applique, journalise. Aucune empreinte n'est touchée : elle a sa propre méthode, et
 * changer un mot de passe n'est pas une opération d'administration de rôle.
 */
export function modifierCompte(
  idCible: string,
  commande: CommandeModificationCompte,
  acteur: Acteur,
  deps: Dependances,
): Compte {
  if (!aLeDroit(acteur.role, "modifierCompte")) {
    throw new ErreurMetier("DROIT_REFUSE", { action: "modifierCompte" });
  }

  const cible = deps.comptes.parId(idCible);
  if (!cible) {
    throw new ErreurMetier("RESSOURCE_INTROUVABLE", { ressource: "compte" });
  }

  verifierModificationCompte(cible, commande, deps.comptes.compterAdministrateursActifs());

  const maj: Compte = {
    ...cible,
    role: commande.role ?? cible.role,
    actif: commande.actif ?? cible.actif,
  };
  deps.comptes.enregistrer(maj);
  journaliser(
    deps,
    acteur,
    "compte.modification",
    idCible,
    `${cible.role}/${cible.actif ? "actif" : "inactif"}`,
    `${maj.role}/${maj.actif ? "actif" : "inactif"}`,
  );

  return maj;
}
