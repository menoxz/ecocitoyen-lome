import type { ReactNode } from "react";
import { COULEURS, ESPACEMENT } from "./jetons.ts";

/**
 * État de chargement — squelette de la taille du contenu final.
 *
 * Un indicateur plein écran fait sauter la mise en page ; un squelette de la bonne hauteur la
 * garde stable. `aria-busy` annonce l''attente au lecteur d''écran.
 */
export interface ProprietesEtatChargement {
  /** Nombre de lignes du squelette ; 3 par défaut (taille d''une liste de dossiers). */
  readonly lignes?: number;
  readonly libelle?: string;
}

export function EtatChargement(proprietes: ProprietesEtatChargement): ReactNode {
  const lignes = proprietes.lignes && proprietes.lignes > 0 ? Math.min(proprietes.lignes, 10) : 3;

  return (
    <div role="status" aria-busy="true" aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e2 }}>
      <span className={proprietes.libelle ? "ui-sr-only" : undefined}>{proprietes.libelle ?? "Chargement"}</span>
      {Array.from({ length: lignes }, (_, index) => (
        <span
          key={`squelette-${index}`}
          aria-hidden="true"
          style={{
            display: "block",
            height: 64,
            borderRadius: 8,
            backgroundColor: COULEURS.surfaceAlt,
            border: `1px solid ${COULEURS.bordure}`,
          }}
        />
      ))}
    </div>
  );
}