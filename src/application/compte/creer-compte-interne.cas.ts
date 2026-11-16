import { ErreurMetier } from "@domaine/erreurs.ts";
import { aLeDroit } from "@domaine/compte/droits.regle.ts";
import type { Compte } from "@domaine/compte/compte.type.ts";
import { ROLES_INTERNES, type Role } from "@domaine/compte/role.type.ts";
import { verifierPolitiqueMotDePasse } from "@domaine/compte/mot-de-passe.regle.ts";
import type { Acteur, Dependances } from "../dependances.type.ts";
import { journaliser } from "./inscrire.cas.ts";

/**
 * Création d'un compte interne par un administrateur (RB03, droit `creerCompteInterne`).
 *
 * L'inscription publique ne crée que des Citoyens : c'est ici, et nulle part ailleurs, qu'un agent
 * ou un superviseur apparaît. Le mot de passe est tiré au sort et rendu **une seule fois**, en
 * clair, pour que l'administrateur le remette à la personne. Il est marqué temporaire : l'agent
 * devra le changer, ce que `changerMotDePasse` constate et lève.
 */
export interface CommandeCompteInterne {
  readonly nom: string;
  readonly prenom: string;
  readonly email: string;
  readonly role: Role;
  readonly idEquipe: string | null;
}

export interface CompteInterneCree {
  readonly compte: Compte;
  /** En clair, une seule fois : jamais journalisé, jamais relu depuis la base. */
  readonly motDePasseTemporaire: string;
}

/**
 * Mot de passe temporaire lisible et suffisant.
 *
 * Le tirage vient de `deps.identifiants` — le domaine interdit `Math.random`, et une constante
 * serait pire encore. Le préfixe donne une chaîne prononçable au téléphone ; les dix caractères
 * tirés gardent l'entropie nécessaire pour un secret qui doit être changé à la première connexion.
 */
function tirerMotDePasseTemporaire(deps: Dependances): string {
  const brut = deps.identifiants.nouveau("tmp").replace(/[^a-zA-Z0-9]/g, "");
  return `Lome-${brut.slice(0, 10)}`;
}

export async function creerCompteInterne(
  commande: CommandeCompteInterne,
  acteur: Acteur,
  deps: Dependances,
): Promise<CompteInterneCree> {
  if (!aLeDroit(acteur.role, "creerCompteInterne")) {
    throw new ErreurMetier("DROIT_REFUSE", { action: "creerCompteInterne" });
  }

  const email = commande.email.trim().toLowerCase();
  const nom = commande.nom.trim();
  const prenom = commande.prenom.trim();
  if (email === "" || nom === "" || prenom === "") {
    throw new ErreurMetier("CONTRAT_INVALIDE", { champ: "identite" });
  }
  if (!ROLES_INTERNES.includes(commande.role)) {
    throw new ErreurMetier("CONTRAT_INVALIDE", { champ: "role" });
  }
  if (deps.comptes.parIdentifiant(email)) {
    throw new ErreurMetier("CONTRAT_INVALIDE", { champ: "identifiant_deja_utilise" });
  }

  // Une équipe inconnue est refusée plutôt que silencieusement ignorée : un agent sans périmètre
  // ne voit aucun dossier, et l'administrateur croirait l'affectation faite.
  let idEquipe: string | null = null;
  if (commande.idEquipe !== null && commande.idEquipe !== "") {
    const existe = deps.referentiel.equipes().some((equipe) => equipe.idEquipe === commande.idEquipe);
    if (!existe) {
      throw new ErreurMetier("CONTRAT_INVALIDE", { champ: "id_equipe" });
    }
    idEquipe = commande.idEquipe;
  }

  const temporaire = tirerMotDePasseTemporaire(deps);
  verifierPolitiqueMotDePasse(temporaire);
  const maintenant = deps.horloge.maintenant();
  const empreinte = await deps.hachage.hacher(temporaire);

  const compte: Compte & { readonly empreinteMotDePasse: string } = {
    idUtilisateur: deps.identifiants.nouveau("usr"),
    nom,
    prenom,
    email,
    telephone: null,
    role: commande.role,
    idEquipe,
    actif: true,
    motDePasseTemporaire: true,
    empreinteMotDePasse: empreinte,
    dateConsentement: maintenant,
    dateCreation: maintenant,
  };

  deps.comptes.creer(compte);
  journaliser(
    deps,
    acteur,
    "compte.creation.interne",
    compte.idUtilisateur,
    null,
    `${compte.role}/${idEquipe ?? "sans-equipe"}`,
  );

  return {
    compte: {
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
    },
    motDePasseTemporaire: temporaire,
  };
}
