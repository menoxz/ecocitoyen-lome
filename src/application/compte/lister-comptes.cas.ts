import { ErreurMetier } from "@domaine/erreurs.ts";
import { aLeDroit } from "@domaine/compte/droits.regle.ts";
import type { Compte } from "@domaine/compte/compte.type.ts";
import type { Acteur, Dependances } from "../dependances.type.ts";

/**
 * Liste des comptes pour l'administration.
 *
 * Le droit est celui de la modification (`modifierCompte`, réservé à l'administrateur) : il n'existe
 * pas d'action « voir les comptes » distincte dans la matrice, et en inventer une élargirait la
 * matrice sans décision. Lire la liste des comptes est le préalable de leur gestion.
 */
export function listerComptes(acteur: Acteur, deps: Dependances): readonly Compte[] {
  if (!aLeDroit(acteur.role, "modifierCompte")) {
    throw new ErreurMetier("DROIT_REFUSE", { action: "modifierCompte" });
  }
  return deps.comptes.lister();
}
