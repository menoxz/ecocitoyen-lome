import type { ReactNode } from "react";
import { Bouton } from "./Bouton.tsx";
import { COULEURS, ESPACEMENT, TAILLE_TEXTE } from "./jetons.ts";

/**
 * État d''erreur — message du serveur en clair, jamais « une erreur est survenue ».
 *
 * `code` est le code stable du contrat (`TRANSITION_INTERDITE`, `HORS_ZONE`…) : il permet de
 * relier l''affichage au refus réel, et de constater en test que le bon refus est montré.
 */
export interface ProprietesEtatErreur {
  readonly message: string;
  readonly code?: string;
  readonly libelleReprise?: string;
  readonly onReprise?: () => void;
}

export function EtatErreur(proprietes: ProprietesEtatErreur): ReactNode {
  return (
    <div
      role="alert"
      data-code={proprietes.code}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: ESPACEMENT.e3,
        padding: ESPACEMENT.e4,
        border: `1px solid ${COULEURS.erreur}`,
        borderRadius: 8,
        backgroundColor: "#fef2f2",
      }}
    >
      <p style={{ margin: 0, fontSize: TAILLE_TEXTE.md, fontWeight: 600, color: COULEURS.erreur }}>
        {proprietes.message}
      </p>
      {proprietes.libelleReprise && proprietes.onReprise ? (
        <Bouton variante="secondaire" onClick={proprietes.onReprise}>
          {proprietes.libelleReprise}
        </Bouton>
      ) : null}
    </div>
  );
}