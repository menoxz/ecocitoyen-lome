/**
 * Jetons de style — source unique.
 *
 * Aucune couleur, taille ou durée n''est écrite dans un composant : tout vient d''ici.
 * Les ratios de contraste de chaque paire sont consignés dans `docs/design/DESIGN.md` et
 * revérifiés par `node scripts/verifier-contrastes.mjs`.
 *
 * Les clés métier sont déclarées ici en types littéraux, et non importées du domaine :
 * la couche `web` ne peut importer que `contrats` (voir `src/web/AGENTS.md`). L''égalité avec
 * le vocabulaire du domaine est garantie par un test transversal (`tests/design`).
 */
export type CleStatut = "NOUVEAU" | "VALIDE" | "EN_COURS" | "RESOLU" | "REJETE" | "ROUVERT";
export type ClePriorite = "BASSE" | "NORMALE" | "HAUTE" | "URGENTE";
export type CleModeIa = "MODELE" | "SIMULATION" | "AUCUN";

export interface Teinte {
  readonly texte: string;
  readonly fond: string;
  readonly bordure: string;
}

export const COULEURS = {
  surface: "#ffffff",
  surfaceAlt: "#f6f7f9",
  texte: "#111827",
  texteAttenue: "#4b5563",
  bordure: "#d1d5db",
  primaire: "#0f766e",
  primaireSurvol: "#115e59",
  succes: "#15803d",
  alerte: "#b45309",
  erreur: "#b91c1c",
  info: "#1d4ed8",
  focus: "#0f766e",
} as const;

/** Six statuts du domaine, avec libellé d''usager et teinte mesurée. */
export const STATUTS: Readonly<Record<CleStatut, Teinte & { readonly libelle: string }>> = {
  NOUVEAU: { texte: "#1d4ed8", fond: "#eff6ff", bordure: "#bfdbfe", libelle: "Nouveau" },
  VALIDE: { texte: "#6d28d9", fond: "#f5f3ff", bordure: "#ddd6fe", libelle: "Validé" },
  EN_COURS: { texte: "#b45309", fond: "#fffbeb", bordure: "#fde68a", libelle: "En cours" },
  RESOLU: { texte: "#15803d", fond: "#f0fdf4", bordure: "#bbf7d0", libelle: "Résolu" },
  REJETE: { texte: "#b91c1c", fond: "#fef2f2", bordure: "#fecaca", libelle: "Rejeté" },
  ROUVERT: { texte: "#c2410c", fond: "#fff7ed", bordure: "#fed7aa", libelle: "Rouvert" },
};

/** Quatre priorités, avec l''échéance de résolution affichable. */
export const PRIORITES: Readonly<Record<ClePriorite, Teinte & { readonly libelle: string }>> = {
  BASSE: { texte: "#374151", fond: "#f3f4f6", bordure: "#d1d5db", libelle: "Basse" },
  NORMALE: { texte: "#0369a1", fond: "#e0f2fe", bordure: "#bae6fd", libelle: "Normale" },
  HAUTE: { texte: "#92400e", fond: "#fef3c7", bordure: "#fde68a", libelle: "Haute" },
  URGENTE: { texte: "#991b1b", fond: "#fee2e2", bordure: "#fecaca", libelle: "Urgente" },
};

/** Mention obligatoire quand la classification vient du simulateur (RG18). */
export const MENTION_SIMULATION = "Classification simulée — démonstration";

export const ESPACEMENT = { e1: 4, e2: 8, e3: 12, e4: 16, e6: 24, e8: 32, e12: 48 } as const;

export const TAILLE_TEXTE = { xs: 12, sm: 14, md: 16, lg: 20, xl: 24, xxl: 32 } as const;

export const RAYON = { sm: 4, md: 8, pilule: 9999 } as const;

export const CIBLE_TACTILE = 44;

export const DUREE = { rapide: 120, normal: 200 } as const;

/**
 * Classes d''état portées par la feuille globale (`ui.css`) : survol et focus ne peuvent pas être
 * simulés en rendu serveur, mais leur présence est vérifiable et leur style vit au même endroit.
 */
export const CLASSES = {
  bouton: "ui-bouton",
  boutonPrimaire: "ui-bouton--primaire",
  secondaire: "ui-bouton--secondaire",
  danger: "ui-bouton--danger",
  focusable: "ui-focusable",
  champ: "ui-champ",
  champErreur: "ui-champ--erreur",
  badge: "ui-badge",
  carte: "ui-carte",
  visuellementCache: "ui-sr-only",
} as const;