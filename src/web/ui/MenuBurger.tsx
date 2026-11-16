import { useEffect, useRef, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { BoutonTheme } from "./BoutonTheme.tsx";
import { Icone } from "./Icone.tsx";
import { ACCES_SERVICE, LIENS_NAV } from "./navigation.ts";

/**
 * Menu burger, seul affiché sous 760 px.
 *
 * À 360 px, trois parcours, un menu service et le sélecteur de thème ne tiennent pas sur une ligne :
 * la barre s'empilait sur deux lignes et repoussait le contenu. Un bouton unique ouvre tout, dans
 * l'ordre de lecture : parcours citoyen, accès de service, réglage du thème. Les mêmes entrées que
 * la barre de bureau viennent de `navigation.ts`, donc rien ne peut diverger.
 */
export function MenuBurger(): ReactNode {
  const [ouvert, setOuvert] = useState(false);
  const conteneur = useRef<HTMLDivElement | null>(null);
  const fermer = (): void => setOuvert(false);

  useEffect(() => {
    if (!ouvert) {
      return;
    }
    const surClic = (evenement: MouseEvent): void => {
      const cible = evenement.target as Node | null;
      if (conteneur.current && cible && !conteneur.current.contains(cible)) {
        setOuvert(false);
      }
    };
    const surTouche = (evenement: KeyboardEvent): void => {
      if (evenement.key === "Escape") {
        setOuvert(false);
      }
    };
    document.addEventListener("mousedown", surClic);
    document.addEventListener("keydown", surTouche);
    return () => {
      document.removeEventListener("mousedown", surClic);
      document.removeEventListener("keydown", surTouche);
    };
  }, [ouvert]);

  return (
    <div className="ui-burger" ref={conteneur}>
      <button
        type="button"
        className="ui-burger-bouton"
        aria-expanded={ouvert}
        aria-controls="panneau-burger"
        aria-label={ouvert ? "Fermer le menu" : "Ouvrir le menu"}
        onClick={() => setOuvert((valeur) => !valeur)}
      >
        <Icone icone={ouvert ? X : Menu} taille={20} />
      </button>

      <div className="ui-burger-panneau" id="panneau-burger" hidden={!ouvert}>
        <ul className="ui-burger-liste">
          {LIENS_NAV.map((lien) => (
            <li key={lien.href}>
              <a href={lien.href} onClick={fermer}>
                <Icone icone={lien.icone} taille={18} />
                {lien.libelle}
              </a>
            </li>
          ))}
        </ul>

        <p className="ui-burger-titre">Accès de service</p>
        <ul className="ui-burger-liste">
          {ACCES_SERVICE.map((acces) => (
            <li key={acces.href}>
              <a href={acces.href} onClick={fermer}>
                <Icone icone={acces.icone} taille={18} />
                {acces.libelle}
              </a>
            </li>
          ))}
        </ul>

        <div className="ui-burger-reglage">
          <BoutonTheme />
        </div>
      </div>
    </div>
  );
}
