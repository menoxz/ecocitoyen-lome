import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { Bouton } from "./Bouton.tsx";
import { Icone } from "./Icone.tsx";

/**
 * État vide — l'état le plus souvent oublié, et le plus fréquent en démonstration.
 *
 * Règle (docs/design/PARCOURS.md §10) : une phrase qui explique pourquoi c'est vide, et une
 * action qui permet d'en sortir. Un écran vide sans action est un cul-de-sac.
 *
 * Aucune couleur n'est posée ici : la surface, la bordure et le texte viennent de `.ui-etat` dans
 * `theme.css`. C'est ce qui permet à « aucun dossier signalé » de basculer en mode sombre avec le
 * reste de la page au lieu de rester un rectangle clair.
 */
export interface ProprietesEtatVide {
  readonly titre: string;
  readonly explication: string;
  readonly libelleAction?: string;
  readonly onAction?: () => void;
  /** Icône facultative ; une boîte vide par défaut. */
  readonly icone?: typeof Inbox;
}

export function EtatVide(proprietes: ProprietesEtatVide): ReactNode {
  return (
    <div role="status" className="ui-etat ui-etat--vide">
      <span className="ui-etat-icone">
        <Icone icone={proprietes.icone ?? Inbox} taille={28} />
      </span>
      <p className="ui-etat-titre">{proprietes.titre}</p>
      <p className="ui-etat-texte">{proprietes.explication}</p>
      {proprietes.libelleAction && proprietes.onAction ? (
        <Bouton variante="secondaire" onClick={proprietes.onAction}>
          {proprietes.libelleAction}
        </Bouton>
      ) : null}
    </div>
  );
}
