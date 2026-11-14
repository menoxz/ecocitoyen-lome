import { ErreurMetier } from "@domaine/erreurs.ts";
import type { Compte } from "@domaine/compte/compte.type.ts";
import { verifierPolitiqueMotDePasse } from "@domaine/compte/mot-de-passe.regle.ts";
import type { Acteur, Dependances } from "../dependances.type.ts";

export interface CommandeInscription {
  readonly nom: string;
  readonly prenom: string;
  readonly email: string;
  readonly telephone: string | null;
  readonly motDePasse: string;
  readonly consentement: boolean;
}

/**
 * Inscription publique : crée exclusivement un compte Citoyen (RB02).
 *
 * Aucun chemin ne permet de choisir un autre rôle ici : un compte interne se crée par un
 * administrateur, avec mot de passe temporaire (RB03).
 */
export async function inscrire(commande: CommandeInscription, deps: Dependances): Promise<Compte> {
  if (!commande.consentement) {
    throw new ErreurMetier("CONTRAT_INVALIDE", { champ: "consentement" });
  }
  if (!commande.email && !commande.telephone) {
    throw new ErreurMetier("CONTRAT_INVALIDE", { champ: "email_ou_telephone" });
  }
  verifierPolitiqueMotDePasse(commande.motDePasse);

  if (deps.comptes.parIdentifiant(commande.email || (commande.telephone as string))) {
    throw new ErreurMetier("CONTRAT_INVALIDE", { champ: "identifiant_deja_utilise" });
  }

  const maintenant = deps.horloge.maintenant();
  const empreinte = await deps.hachage.hacher(commande.motDePasse);

  const compte = {
    idUtilisateur: deps.identifiants.nouveau("usr"),
    nom: commande.nom.trim(),
    prenom: commande.prenom.trim(),
    email: commande.email.trim(),
    telephone: commande.telephone,
    role: "CITOYEN" as const,
    idEquipe: null,
    actif: true,
    motDePasseTemporaire: false,
    empreinteMotDePasse: empreinte,
    dateConsentement: maintenant,
    dateCreation: maintenant,
  };

  deps.comptes.creer(compte);

  deps.journal.enregistrer({
    idJournal: deps.identifiants.nouveau("jrn"),
    acteur: "inscription",
    idUtilisateur: compte.idUtilisateur,
    action: "compte.inscription",
    cible: compte.idUtilisateur,
    avant: null,
    apres: null,
    adresseIp: null,
    dateAction: maintenant,
  });

  return {
    idUtilisateur: compte.idUtilisateur,
    nom: compte.nom,
    prenom: compte.prenom,
    email: compte.email,
    telephone: compte.telephone,
    role: compte.role,
    idEquipe: compte.idEquipe,
    actif: compte.actif,
    motDePasseTemporaire: compte.motDePasseTemporaire,
    dateConsentement: compte.dateConsentement,
    dateCreation: compte.dateCreation,
  };
}

/** Journalisation d'une action sensible : même forme pour tous les cas d'usage. */
export function journaliser(
  deps: Dependances,
  acteur: Acteur,
  action: string,
  cible: string | null,
  avant: string | null = null,
  apres: string | null = null,
): void {
  deps.journal.enregistrer({
    idJournal: deps.identifiants.nouveau("jrn"),
    acteur: acteur.idUtilisateur,
    idUtilisateur: acteur.idUtilisateur,
    action,
    cible,
    avant,
    apres,
    adresseIp: acteur.adresseIp,
    dateAction: deps.horloge.maintenant(),
  });
}

export type { Acteur };