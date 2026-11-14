import type { Role } from "./role.type.ts";

/**
 * Compte utilisateur.
 *
 * L'empreinte du mot de passe ne sort jamais du dépôt qui la stocke : elle est portée par
 * un type séparé (EmpreinteMotDePasse) et absente de cette projection.
 */
export interface Compte {
  readonly idUtilisateur: string;
  readonly nom: string;
  readonly prenom: string;
  readonly email: string;
  readonly telephone: string | null;
  readonly role: Role;
  readonly idEquipe: string | null;
  readonly actif: boolean;
  readonly motDePasseTemporaire: boolean;
  readonly dateConsentement: string;
  readonly dateCreation: string;
}

export interface CompteAvecEmpreinte extends Compte {
  readonly empreinteMotDePasse: string;
}