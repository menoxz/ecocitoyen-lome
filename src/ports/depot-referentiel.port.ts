import type { Categorie, Commune, Equipe, Parametre, Quartier } from '@domaine/referentiel/referentiel.type.ts';

export interface DepotReferentiel {
  communes(): readonly Commune[];
  quartiers(): readonly Quartier[];
  categories(): readonly Categorie[];
  equipes(): readonly Equipe[];
  parametres(): readonly Parametre[];
  parametre(cle: string): string | null;
  ecrireParametre(cle: string, valeur: string): void;
  ajouterQuartier(quartier: Quartier): void;
  ajouterCategorie(categorie: Categorie): void;
  ajouterEquipe(equipe: Equipe): void;
  ajouterCommune(commune: Commune): void;
}