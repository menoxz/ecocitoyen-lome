import { ErreurMetier } from "@domaine/erreurs.ts";
import { aLeDroit } from "@domaine/compte/droits.regle.ts";
import type { Compte } from "@domaine/compte/compte.type.ts";
import { verifierPolitiqueMotDePasse } from "@domaine/compte/mot-de-passe.regle.ts";
import type { Acteur, Dependances } from "../dependances.type.ts";
import { journaliser } from "./inscrire.cas.ts";

/**
 * Changement de son propre mot de passe.
 *
 * Deux vérifications, dans cet ordre : l'ancien mot de passe, puis la politique sur le nouveau.
 * Le compte d'un agent invité porte `motDePasseTemporaire` ; ce cas d'usage est le seul à le lever,
 * et seulement après preuve de l'ancien secret — sinon un tiers ayant volé le cookie changerait le
 * mot de passe sans le connaître.
 */
export interface CommandeChangementMotDePasse {
  readonly ancien: string;
  readonly nouveau: string;
}

export async function changerMotDePasse(
  commande: CommandeChangementMotDePasse,
  acteur: Acteur,
  deps: Dependances,
): Promise<Compte> {
  if (!aLeDroit(acteur.role, "modifierProfil")) {
    throw new ErreurMetier("DROIT_REFUSE", { action: "modifierProfil" });
  }

  const compte = deps.comptes.compteAvecEmpreinte(acteur.idUtilisateur);
  if (!compte) {
    throw new ErreurMetier("RESSOURCE_INTROUVABLE", { ressource: "compte" });
  }

  const ancienValide = await deps.hachage.verifier(compte.empreinteMotDePasse, commande.ancien);
  if (!ancienValide) {
    throw new ErreurMetier("IDENTIFIANTS_INVALIDES", { champ: "ancien_mot_de_passe" });
  }

  verifierPolitiqueMotDePasse(commande.nouveau);
  const empreinte = await deps.hachage.hacher(commande.nouveau);
  deps.comptes.changerEmpreinte(compte.idUtilisateur, empreinte, false);

  journaliser(deps, acteur, "compte.mot-de-passe.change", compte.idUtilisateur);

  return {
    idUtilisateur: compte.idUtilisateur,
    nom: compte.nom,
    prenom: compte.prenom,
    email: compte.email,
    telephone: compte.telephone,
    role: compte.role,
    idEquipe: compte.idEquipe,
    actif: compte.actif,
    motDePasseTemporaire: false,
    dateConsentement: compte.dateConsentement,
    dateCreation: compte.dateCreation,
  };
}
