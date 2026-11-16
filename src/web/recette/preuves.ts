/**
 * Cartographie des critères de recette (CR1-CR14) vers le test qui les prouve réellement.
 *
 * L'écran de recette du prototype affichait quatorze statuts « PASSED » écrits à la main, avec
 * la mention « Vérifié : … ». Aucun de ces statuts n'était exécuté : c'est un mensonge d'affichage,
 * pas une recette. Ce fichier remplace la déclaration par une référence vérifiable.
 *
 * `preuves.test.ts` échoue si un fichier cité n'existe pas : on ne peut plus prétendre qu'un
 * critère est couvert sans qu'un test existe à l'endroit indiqué.
 */
export interface PreuveRecette {
  readonly code: string;
  readonly critere: string;
  /** Fichier de test qui porte le critère, relatif à la racine du dépôt. */
  readonly fichier: string;
  /** Libellé du test, tel qu'il apparaît dans le fichier. */
  readonly test: string;
  /** Ce que le test vérifie réellement, en une phrase. */
  readonly preuve: string;
}

export const PREUVES_RECETTE: readonly PreuveRecette[] = [
  {
    code: "CR1",
    critere: "Création de signalement par un citoyen",
    fichier: "tests/api/signalements.test.ts",
    test: "crée un dossier Nouveau pour un citoyen connecté (T0)",
    preuve: "statut NOUVEAU, identifiant attribué, priorité calculée",
  },
  {
    code: "CR2",
    critere: "Consultation publique par un visiteur",
    fichier: "tests/api/signalements.test.ts",
    test: "cache un dossier Nouveau à un autre citoyen (404, RG28)",
    preuve: "un statut non public'est refusé à un tiers et à un visiteur",
  },
  {
    code: "CR3",
    critere: "Contrôle RBAC : citoyen tentant de valider",
    fichier: "tests/api/signalements.test.ts",
    test: "refuse à un citoyen la validation d'un dossier (403)",
    preuve: "403 DROIT_REFUSE côté serveur",
  },
  {
    code: "CR4",
    critere: "Validation par un superviseur (T1)",
    fichier: "tests/api/signalements.test.ts",
    test: "valide un dossier en tant que superviseur et journalise l'action (T1, RB08)",
    preuve: "statut VALIDE, date_validation renseignée, ligne de journal d'audit",
  },
  {
    code: "CR5",
    critere: "Rejet sans motif",
    fichier: "tests/api/signalements.test.ts",
    test: "refuse un rejet sans motif (CR5)",
    preuve: "400 MOTIF_REQUIS avant toute écriture",
  },
  {
    code: "CR6",
    critere: "Affectation à une équipe (T3)",
    fichier: "tests/api/interventions.test.ts",
    test: "notifie les agents de l'équipe affectée",
    preuve: "intervention créée, agents notifiés, autres équipes non notifiées",
  },
  {
    code: "CR7",
    critere: "Accès cloisonné d'une autre équipe",
    fichier: "tests/api/interventions.test.ts",
    test: "refuse la clôture par un agent d'une autre équipe (CR7)",
    preuve: "403 DROIT_REFUSE sur l'intervention d'une autre équipe",
  },
  {
    code: "CR8",
    critere: "Clôture sans photo de résolution",
    fichier: "tests/api/interventions.test.ts",
    test: "refuse la clôture sans photo de résolution (CR8)",
    preuve: "400 PHOTO_MANQUANTE, aucun média créé",
  },
  {
    code: "CR9",
    critere: "Clôture avec photo de preuve (T5)",
    fichier: "tests/api/interventions.test.ts",
    test: "du signalement citoyen à la résolution avec preuve photo",
    preuve: "statut RESOLU, média RESOLUTION rattaché, historique complet, notifications",
  },
  {
    code: "CR10",
    critere: "Transition de statut interdite",
    fichier: "tests/api/signalements.test.ts",
    test: "refuse une transition non prévue : valider deux fois (CR10, 409)",
    preuve: "409 TRANSITION_INTERDITE",
  },
  {
    code: "CR11",
    critere: "Position hors du Grand Lomé",
    fichier: "tests/api/signalements.test.ts",
    test: "refuse une position hors de la zone pilote (CR11)",
    preuve: "400 HORS_ZONE avec la zone nommée",
  },
  {
    code: "CR12",
    critere: "Photo de format invalide ou trop lourde",
    fichier: "src/infrastructure/photos/stockage-disque.test.ts",
    test: "refuse un fichier qui n'est pas une image, quel que soit le type annoncé",
    preuve: "PHOTO_INVALIDE sur contenu non image, CONTRAT_INVALIDE au-delà de 5 Mo",
  },
  {
    code: "CR13",
    critere: "Service IA indisponible ou mode dégradé",
    fichier: "tests/api/photos-ia.test.ts",
    test: "accepte un signalement même sans photo classifiable (CR13)",
    preuve: "le dossier est accepté et la tâche close, aucune attente bloquante",
  },
  {
    code: "CR14",
    critere: "Calcul du taux de résolution",
    fichier: "tests/api/indicateurs.test.ts",
    test: "retrouve exactement les valeurs du calcul manuel",
    preuve: "75 % sur un jeu dont la valeur est calculée à la main, plus les autres indicateurs",
  },
];

export function preuveDe(code: string): PreuveRecette | null {
  return PREUVES_RECETTE.find((preuve) => preuve.code === code) ?? null;
}

/** Part des critères réellement adossés à un test, pour un bandeau qui ne ment pas. */
export function criteresProuves(fichiersExistants: ReadonlySet<string>): {
  readonly prouves: number;
  readonly total: number;
} {
  const prouves = PREUVES_RECETTE.filter((preuve) => fichiersExistants.has(preuve.fichier)).length;
  return { prouves, total: PREUVES_RECETTE.length };
}
