/**
 * Référentiels administrables (EF49-EF51).
 *
 * Une catégorie, un quartier ou une équipe se crée par une ligne de données, jamais par du code :
 * c''est la condition pour qu''une collectivité puisse faire évoluer son découpage sans livraison.
 */
export interface Commune {
  readonly idCommune: string;
  readonly nom: string;
  readonly latMin: number;
  readonly latMax: number;
  readonly lonMin: number;
  readonly lonMax: number;
  readonly actif: boolean;
}

export interface Quartier {
  readonly idQuartier: string;
  readonly idCommune: string;
  readonly nom: string;
  readonly centreLat: number;
  readonly centreLon: number;
  readonly actif: boolean;
}

export interface Categorie {
  readonly idCategorie: string;
  readonly nom: string;
  readonly description: string;
  /** Priorité de base, de 1 à 4 (§4.3). */
  readonly prioriteBase: number;
  readonly icone: string;
  readonly actif: boolean;
}

export interface Equipe {
  readonly idEquipe: string;
  readonly idCommune: string;
  readonly nom: string;
  readonly description: string;
  readonly zone: string;
  readonly actif: boolean;
}

/** Paramètre applicatif typé : délais cibles, rayons, seuils (EF51). */
export interface Parametre {
  readonly cle: string;
  readonly valeur: string;
}