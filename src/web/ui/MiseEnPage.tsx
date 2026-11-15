import type { ReactNode } from "react";
import { BoutonTheme } from "./BoutonTheme.tsx";

/**
 * Ossature commune des écrans : en-tête de marque, contenu borné, pied discret.
 *
 * Avant elle, chaque écran était posé à même la page : titre collé au bord, aucune largeur de
 * lecture, aucun repère de navigation. Ce composant ne porte aucune règle métier — seulement la
 * forme. Les styles vivent dans `theme.css`, les couleurs dans `jetons.ts`.
 */
export interface ProprietesMiseEnPage {
  readonly children: ReactNode;
}

const LIENS_SERVICE = [
  { href: "#/signaler", libelle: "Signaler" },
  { href: "#/dossier", libelle: "Suivre" },
  { href: "#/indicateurs", libelle: "Indicateurs" },
] as const;

export function MiseEnPage(proprietes: ProprietesMiseEnPage): ReactNode {
  return (
    <div className="ui-page">
      <header className="ui-entete">
        <a href="#/" className="ui-marque">
          EcoCitoyen Lomé
        </a>
        <nav className="ui-nav" aria-label="Accès rapides">
          {LIENS_SERVICE.map((lien) => (
            <a key={lien.href} href={lien.href}>
              {lien.libelle}
            </a>
          ))}
          <BoutonTheme />
        </nav>
      </header>

      <main className="ui-contenu">{proprietes.children}</main>

      <footer className="ui-pied">Service municipal de propreté urbaine · Lomé, Togo</footer>
    </div>
  );
}
