import type { Compte } from "@domaine/compte/compte.type.ts";

/** Forme exposée d''un compte : snake_case comme le reste du contrat, jamais l''empreinte. */
export interface CompteExpose {
  readonly id_utilisateur: string;
  readonly nom: string;
  readonly prenom: string;
  readonly email: string;
  readonly telephone: string | null;
  readonly role: string;
  readonly id_equipe: string | null;
  readonly actif: boolean;
  readonly mot_de_passe_temporaire: boolean;
  readonly date_consentement: string;
  readonly date_creation: string;
}

export function projeterCompte(compte: Compte): CompteExpose {
  return {
    id_utilisateur: compte.idUtilisateur,
    nom: compte.nom,
    prenom: compte.prenom,
    email: compte.email,
    telephone: compte.telephone,
    role: compte.role,
    id_equipe: compte.idEquipe,
    actif: compte.actif,
    mot_de_passe_temporaire: compte.motDePasseTemporaire,
    date_consentement: compte.dateConsentement,
    date_creation: compte.dateCreation,
  };
}