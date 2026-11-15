import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Icone } from "./Icone.tsx";

/**
 * Tête de vue — niveau 1 de la hiérarchie de découverte, répété sur chaque page.
 *
 * Trois choses, toujours dans cet ordre : une icône qui dit de quoi la page parle, un titre qui le
 * nomme, puis le texte qui donne la donnée globale (combien, depuis quand, sur quoi). Les chiffres
 * clés sont des valeurs déjà servies par le serveur — rien n'est recalculé ici. Chaque chiffre
 * porte une infobulle qui explique d'où il vient.
 */
export interface ChiffreCle {
  readonly icone: LucideIcon;
  readonly valeur: string;
  readonly libelle: string;
  readonly aide?: string;
}

export interface ProprietesEnTeteVue {
  readonly icone: LucideIcon;
  readonly titre: string;
  readonly explication: string;
  readonly chiffres?: readonly ChiffreCle[];
  readonly actions?: ReactNode;
}

export function EnTeteVue(proprietes: ProprietesEnTeteVue): ReactNode {
  const chiffres = proprietes.chiffres ?? [];

  return (
    <header className="ui-tete">
      <div className="ui-tete-titre">
        <span className="ui-tete-icone" aria-hidden="true">
          <Icone icone={proprietes.icone} taille={26} />
        </span>
        <div>
          <h1>{proprietes.titre}</h1>
          <p className="ui-tete-explication">{proprietes.explication}</p>
        </div>
      </div>

      {chiffres.length > 0 ? (
        <ul className="ui-chiffres" aria-label="Données globales">
          {chiffres.map((chiffre) => (
            <li key={chiffre.libelle} className="ui-chiffre" title={chiffre.aide}>
              <span className="ui-chiffre-icone" aria-hidden="true">
                <Icone icone={chiffre.icone} taille={17} />
              </span>
              <strong>{chiffre.valeur}</strong>
              <span className="ui-chiffre-libelle">{chiffre.libelle}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {proprietes.actions ? <div className="ui-tete-actions">{proprietes.actions}</div> : null}
    </header>
  );
}
