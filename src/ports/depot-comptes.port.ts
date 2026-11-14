import type { Compte, CompteAvecEmpreinte } from '@domaine/compte/compte.type.ts';

export interface DepotComptes {
  parId(idUtilisateur: string): Compte | null;
  parIdentifiant(identifiant: string): CompteAvecEmpreinte | null;
  compteAvecEmpreinte(idUtilisateur: string): CompteAvecEmpreinte | null;
  creer(compte: CompteAvecEmpreinte): void;
  /** Met à jour les champs modifiables (rôle, activation, équipe). L''empreinte a sa propre méthode. */
  enregistrer(compte: Compte): void;
  changerEmpreinte(idUtilisateur: string, empreinte: string, temporaire: boolean): void;
  lister(): readonly Compte[];
  compterAdministrateursActifs(): number;
}