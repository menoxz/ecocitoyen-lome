import { useEffect, useRef, useState, type ReactNode } from "react";
import { Wrench } from "lucide-react";
import { Icone } from "./Icone.tsx";
import { ACCES_SERVICE } from "./navigation.ts";

/**
 * Accès de service, regroupés dans la barre de bureau.
 *
 * Ils n'existaient qu'en pied de page : il fallait descendre jusqu'en bas pour les découvrir. Un
 * menu les remonte dans l'en-tête sans les mêler au parcours citoyen — c'est la règle du cahier des
 * charges (« visibles mais discrets, groupés »). Le panneau se ferme au clic extérieur, à Échap et
 * après un choix. Sous 760 px, c'est le burger qui porte ces entrées ; ce menu disparaît avec la
 * barre de bureau.
 */
export function MenuService(): ReactNode {
  const [ouvert, setOuvert] = useState(false);
  const conteneur = useRef<HTMLDivElement | null>(null);

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
    <div className="ui-menu-service" ref={conteneur}>
      <button
        type="button"
        className="ui-menu-bouton"
        aria-expanded={ouvert}
        aria-controls="panneau-service"
        onClick={() => setOuvert((valeur) => !valeur)}
      >
        <Icone icone={Wrench} taille={18} />
        <span className="ui-menu-libelle">Service</span>
      </button>

      {/* Toujours monté, masqué au repos : `aria-controls` doit désigner un élément qui existe,
          sinon le bouton annonce une cible introuvable aux lecteurs d'écran. */}
      <div className="ui-menu-panneau" id="panneau-service" hidden={!ouvert}>
        {ACCES_SERVICE.map((acces) => (
          <a key={acces.href} href={acces.href} onClick={() => setOuvert(false)}>
            <Icone icone={acces.icone} taille={17} />
            {acces.libelle}
          </a>
        ))}
      </div>
    </div>
  );
}
