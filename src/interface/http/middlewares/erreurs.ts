import type { NextFunction, Request, Response } from "express";
import { ErreurMetier, messageParCode, type CodeErreur } from "@domaine/erreurs.ts";
import { versReponseErreur } from "@contrats/erreurs.ts";

/**
 * Un seul endroit décide du statut HTTP.
 *
 * Une route ne choisit jamais un code de statut pour un refus métier : elle laisse remonter
 * l''ErreurMetier, et cette table la traduit. C''est ce qui garantit qu''un même refus a le même
 * statut partout, et qu''un code ajouté au domaine casse la compilation ici s''il est oublié.
 */
export const STATUT_HTTP: Readonly<Record<CodeErreur, number>> = {
  CONTRAT_INVALIDE: 400,
  NON_AUTHENTIFIE: 401,
  DROIT_REFUSE: 403,
  COMPTE_INACTIF: 403,
  COMPTE_VERROUILLE: 423,
  DEBIT_DEPASSE: 429,
  RESSOURCE_INTROUVABLE: 404,
  TRANSITION_INTERDITE: 409,
  STATUT_INCOMPATIBLE: 409,
  HORS_ZONE: 400,
  DESCRIPTION_INVALIDE: 400,
  PHOTO_MANQUANTE: 400,
  PHOTO_INVALIDE: 400,
  MOTIF_REQUIS: 400,
  COMMENTAIRE_REQUIS: 400,
  DOUBLON_CONFIRMATION: 409,
  CONFIRMATION_PROPRE: 400,
  INTERVENTION_ACTIVE_EXISTANTE: 409,
  INTERVENTION_AUCUNE: 409,
  DELAI_CONTESTATION_DEPASSE: 400,
  PRIORITE_ABAISSEE_SANS_MOTIF: 400,
  DERNIER_ADMINISTRATEUR: 409,
  IDENTIFIANTS_INVALIDES: 401,
  MOT_DE_PASSE_FAIBLE: 400,
  ERREUR_INTERNE: 500,
};

export function traiterErreurs(erreur: unknown, _req: Request, res: Response, _suivant: NextFunction): void {
  if (erreur instanceof ErreurMetier) {
    res.status(STATUT_HTTP[erreur.code]).json(versReponseErreur(erreur.code, erreur.message, erreur.details));
    return;
  }

  const message = erreur instanceof Error ? erreur.message : "Erreur inconnue";
  res
    .status(500)
    .json(versReponseErreur("ERREUR_INTERNE", messageParCode("ERREUR_INTERNE"), { cause: message.slice(0, 120) }));
}

/** Enveloppe un handler asynchrone : une erreur remonte au middleware, jamais en rejet non géré. */
export function attraper(
  handler: (req: Request, res: Response, suivant: NextFunction) => Promise<void>,
): (req: Request, res: Response, suivant: NextFunction) => void {
  return (req, res, suivant) => {
    handler(req, res, suivant).catch(suivant);
  };
}