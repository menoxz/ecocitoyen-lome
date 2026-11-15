import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Icone } from "./Icone.tsx";

/**
 * Puces d'état — niveau 3 de la hiérarchie de découverte : ce qui rend un objet unique.
 *
 * Trois porteurs d'information, jamais un seul : une icône (reconnaissance immédiate), une couleur
 * (balayage vertical) et une infobulle native `title` (ce que la puce veut dire). Le libellé reste
 * toujours écrit : la couleur seule ne porte jamais l'information — daltonisme, écran au soleil.
 *
 * Aucune teinte n'est posée ici : `data-ton` est habillé par `theme.css`, donc les puces suivent le
 * mode sombre avec le reste de la page.
 */
export type TonPuce = "neutre" | "statut" | "priorite" | "succes" | "alerte" | "erreur" | "info";

export interface PuceEtat {
  readonly icone: LucideIcon;
  readonly libelle: string;
  readonly ton?: TonPuce;
  /** Infobulle : ce que la puce signifie, pas une répétition de son libellé. */
  readonly aide?: string;
}

export interface ProprietesPucesEtat {
  readonly puces: readonly PuceEtat[];
  readonly etiquette: string;
}

export function PucesEtat(proprietes: ProprietesPucesEtat): ReactNode {
  return (
    <ul className="ui-puces" aria-label={proprietes.etiquette}>
      {proprietes.puces.map((puce) => (
        <li key={`${puce.libelle}-${puce.ton ?? "neutre"}`} className="ui-puce" data-ton={puce.ton ?? "neutre"} title={puce.aide}>
          <Icone icone={puce.icone} taille={15} />
          <span>{puce.libelle}</span>
        </li>
      ))}
    </ul>
  );
}
