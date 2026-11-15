export interface CategorieCandidate {
  readonly idCategorie: string;
  readonly nom: string;
}

export interface ResultatClassification {
  readonly idCategorie: string;
  readonly nomCategorie: string;
  readonly score: number;
  readonly justification: string;
  /** `MODELE` = résultat d''un modèle réel ; `SIMULATION` = valeur de démonstration, signalée. */
  readonly mode: "MODELE" | "SIMULATION";
  readonly modeleVersion: string;
  /** Présent uniquement en simulation : l''interface doit l''afficher (RG18). */
  readonly simulationNotice?: string;
}

/**
 * Classification d''image (EF35-EF37).
 *
 * Le port réduit le fournisseur à une fonction : changer de modèle, ou passer en simulation,
 * ne touche ni les cas d''usage ni la base. Une panne du fournisseur ne doit jamais faire échouer
 * la création d''un signalement (CR13).
 */
export interface ClassificateurIA {
  classifier(photo: Buffer, mime: string, candidates: readonly CategorieCandidate[]): Promise<ResultatClassification>;
}