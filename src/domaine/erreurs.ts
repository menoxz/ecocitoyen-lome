/**
 * Vocabulaire des refus métier.
 *
 * Le domaine nomme le refus ; il ne décide ni du statut HTTP (rôle de src/interface),
 * ni du texte montré à l’utilisateur (rôle de src/web/i18n).
 */
export const CODES_ERREUR = [
  'CONTRAT_INVALIDE',
  'NON_AUTHENTIFIE',
  'DROIT_REFUSE',
  'COMPTE_INACTIF',
  'COMPTE_VERROUILLE',
  'DEBIT_DEPASSE',
  'RESSOURCE_INTROUVABLE',
  'TRANSITION_INTERDITE',
  'STATUT_INCOMPATIBLE',
  'HORS_ZONE',
  'DESCRIPTION_INVALIDE',
  'PHOTO_MANQUANTE',
  'PHOTO_INVALIDE',
  'MOTIF_REQUIS',
  'COMMENTAIRE_REQUIS',
  'DOUBLON_CONFIRMATION',
  'CONFIRMATION_PROPRE',
  'INTERVENTION_ACTIVE_EXISTANTE',
  'INTERVENTION_AUCUNE',
  'DELAI_CONTESTATION_DEPASSE',
  'PRIORITE_ABAISSEE_SANS_MOTIF',
  'DERNIER_ADMINISTRATEUR',
  'IDENTIFIANTS_INVALIDES',
  'MOT_DE_PASSE_FAIBLE',
  'ERREUR_INTERNE',
] as const;

export type CodeErreur = (typeof CODES_ERREUR)[number];

/** Contexte joint au refus : uniquement des valeurs sérialisables, jamais d’objet métier. */
export type DetailsErreur = Readonly<Record<string, string | number | boolean | null>>;

const MESSAGES: Readonly<Record<CodeErreur, string>> = {
  CONTRAT_INVALIDE: "La demande ne respecte pas le contrat attendu.",
  NON_AUTHENTIFIE: "Une session valide est requise.",
  DROIT_REFUSE: "Votre rôle ne permet pas cette action.",
  COMPTE_INACTIF: "Ce compte est désactivé.",
  COMPTE_VERROUILLE: "Trop d’échecs de connexion : compte temporairement bloqué.",
  DEBIT_DEPASSE: "Limite d’envois atteinte pour cette période.",
  RESSOURCE_INTROUVABLE: "La ressource demandée n’existe pas.",
  TRANSITION_INTERDITE: "Cette transition de statut n’est pas autorisée.",
  STATUT_INCOMPATIBLE: "Le statut actuel du signalement ne permet pas cette action.",
  HORS_ZONE: "La position est hors de la zone couverte (Grand Lomé).",
  DESCRIPTION_INVALIDE: "La description doit comporter entre 10 et 500 caractères.",
  PHOTO_MANQUANTE: "Une photographie est obligatoire pour cette action.",
  PHOTO_INVALIDE: "Le fichier fourni n’est pas une image acceptée (JPEG, PNG, WebP ; 5 Mo maximum).",
  MOTIF_REQUIS: "Un motif est obligatoire.",
  COMMENTAIRE_REQUIS: "Un commentaire justificatif est obligatoire.",
  DOUBLON_CONFIRMATION: "Vous avez déjà confirmé ce signalement.",
  CONFIRMATION_PROPRE: "Vous ne pouvez pas confirmer votre propre signalement.",
  INTERVENTION_ACTIVE_EXISTANTE: "Une intervention est déjà active sur ce signalement.",
  INTERVENTION_AUCUNE: "Aucune intervention active à traiter.",
  DELAI_CONTESTATION_DEPASSE: "Le délai de contestation de 7 jours est dépassé.",
  PRIORITE_ABAISSEE_SANS_MOTIF: "Abaisser une priorité exige un commentaire justificatif.",
  DERNIER_ADMINISTRATEUR: "Le dernier administrateur actif ne peut pas être retiré ni désactivé.",
  IDENTIFIANTS_INVALIDES: "Identifiant ou mot de passe incorrect.",
  MOT_DE_PASSE_FAIBLE: "Le mot de passe ne respecte pas la politique de sécurité.",
  ERREUR_INTERNE: "Une erreur interne est survenue.",
};

export function messageParCode(code: CodeErreur): string {
  return MESSAGES[code];
}

/**
 * Refus porteur de sens métier.
 *
 * Leveur unique : une règle du domaine, un cas d’usage. Jamais une couche d’infrastructure
 * (elle traduit ses pannes en `null` ou en erreur typée de son port).
 */
export class ErreurMetier extends Error {
  readonly code: CodeErreur;
  readonly details: DetailsErreur;

  constructor(code: CodeErreur, details: DetailsErreur = {}) {
    super(messageParCode(code));
    this.name = 'ErreurMetier';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }

  est(code: CodeErreur): boolean {
    return this.code === code;
  }
}