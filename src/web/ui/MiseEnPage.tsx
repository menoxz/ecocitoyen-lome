import type { ReactNode } from "react";
import { ChartColumn, FileSearch, Megaphone, Settings, ShieldCheck, Wrench } from "lucide-react";
import { BoutonTheme } from "./BoutonTheme.tsx";
import { Icone } from "./Icone.tsx";
import { Logo } from "./Logo.tsx";

/**
 * Ossature commune des écrans : en-tête de marque, contenu borné, pied de page complet.
 *
 * Avant elle, chaque écran était posé à même la page : titre collé au bord, aucune largeur de
 * lecture, aucun repère de navigation. Ce composant ne porte aucune règle métier — seulement la
 * forme. Les styles vivent dans `theme.css` ; les icônes, dans `Icone.tsx`.
 *
 * Disposition : en-tête maintenu en haut, contenu centré sur une largeur de lecture, pied de page
 * en trois colonnes qui rappelle l'identité, les parcours usager et les accès de service.
 */
export interface ProprietesMiseEnPage {
  readonly children: ReactNode;
  /** Contenu resserré : pages de décision (session, détail d'un dossier). */
  readonly etroite?: boolean;
}

const LIENS_SERVICE = [
  { href: "#/signaler", libelle: "Signaler", icone: Megaphone },
  { href: "#/dossier", libelle: "Suivre", icone: FileSearch },
  { href: "#/indicateurs", libelle: "Indicateurs", icone: ChartColumn },
] as const;

const PARCOURS = [
  { href: "#/signaler", libelle: "Signaler un problème" },
  { href: "#/dossier", libelle: "Suivre un dossier" },
  { href: "#/recette", libelle: "Recette vérifiable" },
] as const;

const ACCES_INTERNES = [
  { href: "#/interventions", libelle: "Espace agent", icone: Wrench },
  { href: "#/supervision", libelle: "Supervision", icone: ShieldCheck },
  { href: "#/administration", libelle: "Administration", icone: Settings },
] as const;

export function MiseEnPage(proprietes: ProprietesMiseEnPage): ReactNode {
  return (
    <div className={proprietes.etroite === true ? "ui-page ui-page--etroite" : "ui-page"}>
      <header className="ui-entete">
        <a href="#/" className="ui-marque">
          <Logo taille={34} />
          EcoCitoyen Lomé
        </a>
        <nav className="ui-nav" aria-label="Accès rapides">
          {LIENS_SERVICE.map((lien) => (
            <a key={lien.href} href={lien.href}>
              <Icone icone={lien.icone} taille={18} />
              {lien.libelle}
            </a>
          ))}
          <BoutonTheme />
        </nav>
      </header>

      <main className="ui-contenu">{proprietes.children}</main>

      <footer className="ui-pied">
        <div className="ui-pied-grille">
          <div>
            <span className="ui-pied-marque">
              <Logo taille={24} />
              EcoCitoyen Lomé
            </span>
            <p className="ui-pied-mission">
              Signalement et gestion des déchets urbains : le service municipal décide, l'historique
              garde la trace, le citoyen suit chaque étape.
            </p>
          </div>

          <div>
            <h2 className="ui-pied-titre">Parcours citoyen</h2>
            <ul className="ui-pied-liste">
              {PARCOURS.map((lien) => (
                <li key={lien.href}>
                  <a href={lien.href}>{lien.libelle}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="ui-pied-titre">Accès de service</h2>
            <ul className="ui-pied-liste">
              {ACCES_INTERNES.map((lien) => (
                <li key={lien.href}>
                  <a href={lien.href}>
                    <Icone icone={lien.icone} taille={15} /> {lien.libelle}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="ui-pied-bas">
          <span>Service municipal de propreté urbaine · Lomé, Togo</span>
          <span>Données de démonstration · aucune donnée personnelle publiée</span>
        </div>
      </footer>
    </div>
  );
}



