import type { ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { Bouton } from "./Bouton.tsx";
import { Icone } from "./Icone.tsx";

/**
 * État d'erreur — message du serveur en clair, jamais « une erreur est survenue ».
 *
 * `code` est le code stable du contrat (`TRANSITION_INTERDITE`, `HORS_ZONE`…) : il permet de
 * relier l'affichage au refus réel, et de constater en test que le bon refus est montré.
 *
 * Les couleurs viennent de `.ui-etat--erreur` : le fond d'alerte est une variable, donc il existe
 * en clair et en sombre sans que ce composant ait à le savoir.
 */
export interface ProprietesEtatErreur {
  readonly message: string;
  readonly code?: string;
  readonly libelleReprise?: string;
  readonly onReprise?: () => void;
}

export function EtatErreur(proprietes: ProprietesEtatErreur): ReactNode {
  return (
    <div role="alert" data-code={proprietes.code} className="ui-etat ui-etat--erreur">
      <span className="ui-etat-icone">
        <Icone icone={TriangleAlert} taille={22} />
      </span>
      <p className="ui-etat-titre">{proprietes.message}</p>
      {proprietes.code ? <p className="ui-etat-code">{proprietes.code}</p> : null}
      {proprietes.libelleReprise && proprietes.onReprise ? (
        <Bouton variante="secondaire" onClick={proprietes.onReprise}>
          {proprietes.libelleReprise}
        </Bouton>
      ) : null}
    </div>
  );
}
