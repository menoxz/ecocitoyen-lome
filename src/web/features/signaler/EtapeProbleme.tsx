import type { ReactNode } from "react";
import { ChampSelect, type OptionSelect } from "../../ui/ChampSelect.tsx";
import { ChampZoneTexte } from "../../ui/ChampZoneTexte.tsx";
import { ESPACEMENT } from "../../ui/jetons.ts";
import type { Brouillon } from "./etapes.ts";

/**
 * Étape « Problème » — catégorie et description.
 *
 * Séparée de l'assistant : le formulaire se relit seul, et l'assistant reste sous 150 lignes.
 * L'aide de la catégorie rappelle qui détient l'information : le citoyen sur place.
 */
export interface ProprietesEtapeProbleme {
  readonly brouillon: Brouillon;
  readonly categories: readonly OptionSelect[];
  readonly onMaj: (partiel: Partial<Brouillon>) => void;
}

export function EtapeProbleme(proprietes: ProprietesEtapeProbleme): ReactNode {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
      <ChampSelect
        id="categorie"
        libelle="Catégorie"
        valeur={proprietes.brouillon.idCategorie}
        options={proprietes.categories}
        onChange={(valeur) => proprietes.onMaj({ idCategorie: valeur })}
        texteVide="Choisir une catégorie…"
        aide="Vous êtes le seul à voir le problème : c'est vous qui savez de quoi il s agit."
        requis
      />
      <ChampZoneTexte
        id="description"
        libelle="Description"
        valeur={proprietes.brouillon.description}
        onChange={(valeur) => proprietes.onMaj({ description: valeur })}
        aide="Décrivez ce que vous voyez : quantité, odeur, risque pour les enfants."
        requis
      />
    </div>
  );
}
