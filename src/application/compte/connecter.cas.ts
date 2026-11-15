import { ErreurMetier } from "@domaine/erreurs.ts";
import type { Compte } from "@domaine/compte/compte.type.ts";
import {
  ECHECS_AVANT_VERROUILLAGE,
  FENETRE_VERROUILLAGE_MINUTES,
  estVerrouille,
} from "@domaine/compte/mot-de-passe.regle.ts";
import type { Acteur, Dependances } from "../dependances.type.ts";
import { journaliser } from "./inscrire.cas.ts";

export interface CommandeConnexion {
  readonly identifiant: string;
  readonly motDePasse: string;
  readonly adresseIp: string | null;
}

export interface ConnexionReussie {
  readonly compte: Compte;
  readonly jeton: string;
  readonly expireLe: string;
}

const DUREE_SESSION_MINUTES = 30;

/**
 * Connexion : mot de passe vérifié, verrouillage après cinq échecs (RG24), session de 30 minutes
 * (ENF06). Un echec ne distingue jamais « compte inconnu » de « mot de passe faux » : la réponse
 * est identique, seule la journalisation interne les sépare.
 */
export async function connecter(commande: CommandeConnexion, deps: Dependances): Promise<ConnexionReussie> {
  const maintenant = deps.horloge.maintenant();
  const fenetre = deps.horloge.debutFenetre(maintenant, FENETRE_VERROUILLAGE_MINUTES);
  const cleEchecs = `connexion:${commande.identifiant.toLowerCase()}`;

  if (estVerrouille(deps.debit.lire(cleEchecs, fenetre))) {
    throw new ErreurMetier("COMPTE_VERROUILLE", { minutes: FENETRE_VERROUILLAGE_MINUTES });
  }

  const compte = deps.comptes.parIdentifiant(commande.identifiant);
  const empreinte = compte?.empreinteMotDePasse ?? "";
  const motDePasseValide = compte ? await deps.hachage.verifier(empreinte, commande.motDePasse) : false;

  if (!compte || !motDePasseValide) {
    const echecs = deps.debit.incrementer(cleEchecs, fenetre);
    throw new ErreurMetier(echecs >= ECHECS_AVANT_VERROUILLAGE ? "COMPTE_VERROUILLE" : "IDENTIFIANTS_INVALIDES", {
      restant: Math.max(0, ECHECS_AVANT_VERROUILLAGE - echecs),
    });
  }

  if (!compte.actif) {
    throw new ErreurMetier("COMPTE_INACTIF");
  }

  deps.debit.reinitialiser(cleEchecs, fenetre);

  const jeton = deps.jetons.generer();
  const expireLe = deps.horloge.decalerMinutes(maintenant, DUREE_SESSION_MINUTES);

  deps.sessions.creer({
    jetonHache: deps.jetons.calculer(jeton),
    idUtilisateur: compte.idUtilisateur,
    expireLe,
    creeLe: maintenant,
  });

  const acteur: Acteur = {
    idUtilisateur: compte.idUtilisateur,
    role: compte.role,
    idEquipe: compte.idEquipe,
    adresseIp: commande.adresseIp,
  };
  journaliser(deps, acteur, "compte.connexion", compte.idUtilisateur);

  const projection: Compte = {
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

  return { compte: projection, jeton, expireLe };
}
