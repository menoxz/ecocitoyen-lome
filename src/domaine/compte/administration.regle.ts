import { ErreurMetier } from "@domaine/erreurs.ts";
import type { Role } from "./role.type.ts";

/**
 * Modification d'un compte (P7, matrice §3.3).
 *
 * Une seule chose est protégée par le domaine : retirer le dernier administrateur actif
 * laisserait le service sans personne pour gérer les comptes, les référentiels et les paramètres.
 * C'est un verrou, pas une préférence — d'où le refus explicite plutôt qu'un avertissement d'écran.
 *
 * Le refus vaut sur les deux axes : retirer le rôle ADMIN, ou désactiver le compte. Le reste
 * (droit de l'acteur, existence de la cible) relève du cas d'usage.
 */
export interface CompteAdministrable {
  readonly role: Role;
  readonly actif: boolean;
}

export interface ModificationCompte {
  readonly role?: Role;
  readonly actif?: boolean;
}

export function verifierModificationCompte(
  cible: CompteAdministrable,
  modification: ModificationCompte,
  administrateursActifs: number,
): void {
  const roleFinal = modification.role ?? cible.role;
  const actifFinal = modification.actif ?? cible.actif;

  const administrateurAvant = cible.role === "ADMIN" && cible.actif;
  const administrateurApres = roleFinal === "ADMIN" && actifFinal;

  if (administrateurAvant && !administrateurApres && administrateursActifs <= 1) {
    throw new ErreurMetier("DERNIER_ADMINISTRATEUR", { administrateursActifs });
  }
}
