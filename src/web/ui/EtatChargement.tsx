import type { ReactNode } from "react";

/**
 * État de chargement — squelette de la taille du contenu final.
 *
 * Un indicateur plein écran fait sauter la mise en page ; un squelette de la bonne hauteur la
 * garde stable. `aria-busy` annonce l'attente au lecteur d'écran.
 *
 * Le squelette est une surface du thème qui respire (`ui-squelette`), pas un bloc gris figé : il
 * suit le mode sombre et s'immobilise si l'utilisateur refuse les animations.
 */
export interface ProprietesEtatChargement {
  /** Nombre de lignes du squelette ; 3 par défaut (taille d'une liste de dossiers). */
  readonly lignes?: number;
  readonly libelle?: string;
}

export function EtatChargement(proprietes: ProprietesEtatChargement): ReactNode {
  const lignes = proprietes.lignes && proprietes.lignes > 0 ? Math.min(proprietes.lignes, 10) : 3;

  return (
    <div role="status" aria-busy="true" aria-live="polite" className="ui-etat-chargement">
      <span className={proprietes.libelle ? "ui-sr-only" : undefined}>
        {proprietes.libelle ?? "Chargement"}
      </span>
      {Array.from({ length: lignes }, (_, index) => (
        <span key={`squelette-${index}`} aria-hidden="true" className="ui-squelette" />
      ))}
    </div>
  );
}
