import type { ReactNode } from "react";
import { CLASSES, ESPACEMENT, RAYON, TAILLE_TEXTE, STATUTS, type CleStatut } from "./jetons.ts";

/**
 * Onglets de filtrage par statut — états couverts : repos, survol, focus clavier, actif,
 * sélectionné, compteur nul, aucun résultat.
 *
 * Sept onglets : les six statuts du domaine plus « Tous ». Le compteur vient du serveur, jamais
 * recalculé ici : un compteur recalculé côté client finit toujours par diverger de la liste.
 * Un onglet à zéro reste affiché mais désactivé — le masquer ferait croire que le statut n''existe pas.
 */
export interface Onglet {
  readonly cle: CleStatut | "TOUS";
  readonly libelle: string;
  readonly nombre: number;
}

/** Construit les sept onglets depuis des compteurs fournis par le serveur. */
export function ongletsDepuisCompteurs(compteurs: Partial<Record<CleStatut, number>>): readonly Onglet[] {
  const entrees = Object.entries(STATUTS) as [CleStatut, { libelle: string }][];
  const total = entrees.reduce((acc, [cle]) => acc + (compteurs[cle] ?? 0), 0);
  return [
    { cle: "TOUS", libelle: "Tous", nombre: total },
    ...entrees.map(([cle, definition]) => ({ cle, libelle: definition.libelle, nombre: compteurs[cle] ?? 0 })),
  ];
}

export interface ProprietesOngletsFiltres {
  readonly onglets: readonly Onglet[];
  readonly selection: CleStatut | "TOUS";
  readonly onSelectionner?: (cle: CleStatut | "TOUS") => void;
}

export function OngletsFiltres(proprietes: ProprietesOngletsFiltres): ReactNode {
  return (
    <div role="tablist" aria-label="Filtrer par statut" style={{ display: "flex", gap: ESPACEMENT.e1, overflowX: "auto" }}>
      {proprietes.onglets.map((onglet) => {
        const selectionne = onglet.cle === proprietes.selection;
        return (
          <button
            key={onglet.cle}
            type="button"
            role="tab"
            className={CLASSES.focusable}
            aria-selected={selectionne ? "true" : "false"}
            data-cle={onglet.cle}
            disabled={onglet.nombre === 0 && onglet.cle !== "TOUS"}
            onClick={() => proprietes.onSelectionner?.(onglet.cle)}
            style={{
              minHeight: 44,
              padding: `0 ${ESPACEMENT.e3}px`,
              border: `1px solid ${selectionne ? "var(--ui-primaire)" : "var(--ui-bordure)"}`,
              borderRadius: RAYON.pilule,
              backgroundColor: selectionne ? "var(--ui-primaire)" : "var(--ui-surface)",
              color: selectionne ? "var(--ui-sur-primaire)" : "var(--ui-texte)",
              fontSize: TAILLE_TEXTE.sm,
              fontWeight: selectionne ? 700 : 500,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {onglet.libelle} ({onglet.nombre})
          </button>
        );
      })}
    </div>
  );
}