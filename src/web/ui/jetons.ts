/**
 * Jetons de style — source unique.
 *
 * Direction visuelle : « terrain tropical ». Un service utilisé dehors, à Lomé, sur un téléphone
 * tenu à une main, en plein soleil et sur un réseau lent. Trois conséquences assumées :
 *   - palette chaude (vert forêt et terre) plutôt que le gris froid des logiciels de bureau ;
 *   - contrôles larges (48 px minimum) pour un pouce, pas pour un curseur ;
 *   - contraste élevé, parce qu'un écran se lit mal en extérieur.
 *
 * Aucune couleur, taille ou durée n'est écrite dans un composant : tout vient d'ici, et les
 * variables correspondantes vivent dans `theme.css`. Les ratios sont consignés dans
 * `docs/design/DESIGN.md` et revérifiés par `node scripts/verifier-contrastes.mjs`.
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
  /** Papier chaud, pas gris : le fond d'un formulaire de terrain. */
  surface: "#fffdf8",
  surfaceAlt: "#efe7d8",
  texte: "#1a1712",
  texteAttenue: "#57503f",
  bordure: "#ddd2bd",
  /** Vert forêt : l'action principale, celui qu'on vise au pouce. */
  primaire: "#14532d",
  primaireSurvol: "#0d3d21",
  /** Terre cuite : l'accent, l'attention, la matière. */
  accent: "#9c4407",
  succes: "#166534",
  alerte: "#b45309",
  erreur: "#a51c1c",
  info: "#1e40af",
  focus: "#14532d",
} as const;

/** Six statuts du domaine, avec libellé d'usager et teinte mesurée. */
export const STATUTS: Readonly<Record<CleStatut, Teinte & { readonly libelle: string }>> = {
  NOUVEAU: { texte: "#1e3a8a", fond: "#eff6ff", bordure: "#bfdbfe", libelle: "Nouveau" },
  VALIDE: { texte: "#5b21b6", fond: "#f5f3ff", bordure: "#ddd6fe", libelle: "Validé" },
  EN_COURS: { texte: "#92400e", fond: "#fef3c7", bordure: "#fcd34d", libelle: "En cours" },
  RESOLU: { texte: "#14532d", fond: "#dcfce7", bordure: "#86efac", libelle: "Résolu" },
  REJETE: { texte: "#991b1b", fond: "#fee2e2", bordure: "#fca5a5", libelle: "Rejeté" },
  ROUVERT: { texte: "#9a3412", fond: "#ffedd5", bordure: "#fdba74", libelle: "Rouvert" },
};

/** Quatre priorités, avec l'échéance de résolution affichable. */
export const PRIORITES: Readonly<Record<ClePriorite, Teinte & { readonly libelle: string }>> = {
  BASSE: { texte: "#3f3a2f", fond: "#efe7d8", bordure: "#ddd2bd", libelle: "Basse" },
  NORMALE: { texte: "#0c4a6e", fond: "#e0f2fe", bordure: "#7dd3fc", libelle: "Normale" },
  HAUTE: { texte: "#92400e", fond: "#fef3c7", bordure: "#fcd34d", libelle: "Haute" },
  URGENTE: { texte: "#991b1b", fond: "#fee2e2", bordure: "#fca5a5", libelle: "Urgente" },
};

/** Mention obligatoire quand la classification vient du simulateur (RG18). */
export const MENTION_SIMULATION = "Classification simulée — démonstration";

export const ESPACEMENT = { e1: 4, e2: 8, e3: 12, e4: 16, e6: 24, e8: 32, e12: 48 } as const;

/**
 * Échelle typographique large et contrastée : trois sauts nets plutôt que six tailles voisines.
 * Sur un écran de terrain, un titre doit se lire d'un coup d'œil, à bout de bras.
 */
export const TAILLE_TEXTE = {
  xs: 13,
  sm: 15,
  md: 17,
  lg: 22,
  xl: 30,
  xxl: 38,
} as const;

/** Rayons courts : la carte reste la forme de base, mais l'arrondi ne mange plus d'espace utile. */
export const RAYON = { sm: 6, md: 10, pilule: 9999 } as const;

/** 48 px : un pouce, pas un curseur. Exigence du parcours de terrain. */
export const CIBLE_TACTILE = 48;

export const DUREE = { rapide: 120, normal: 200 } as const;

/**
 * Classes d'état portées par la feuille globale : survol et focus ne peuvent pas être simulés en
 * rendu serveur, mais leur présence est vérifiable et leur style vit au même endroit.
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
