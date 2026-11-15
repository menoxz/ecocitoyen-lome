import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import { Routeur, fragmentCourant } from "./app/routeur.tsx";
import { EcranAccueil } from "./features/accueil/EcranAccueil.tsx";
import { EcranSignaler, positionDuNavigateur } from "./features/signaler/EcranSignaler.tsx";
import { EcranInterventions } from "./features/interventions/EcranInterventions.tsx";
import { EcranSupervision } from "./features/supervision/EcranSupervision.tsx";
import { EcranRecette } from "./features/recette/EcranRecette.tsx";
import { EcranSuivi } from "./features/suivi/EcranSuivi.tsx";
import { idDuFragment } from "./features/suivi/logique.ts";
import { EcranIndicateurs } from "./features/indicateurs/EcranIndicateurs.tsx";
import { EcranAdministration } from "./features/administration/EcranAdministration.tsx";
import { creerClient } from "./api/client.ts";
import { MiseEnPage } from "./ui/MiseEnPage.tsx";
import "./ui/theme.css";
import "./ui/ui.css";

/**
 * Point d'entrée du front unique.
 *
 * Une seule ossature (`MiseEnPage`) porte l'en-tête, la largeur de lecture et le pied : les écrans
 * ne décident plus de leur propre mise en page, sinon chacun rend un document différent — c'était
 * le défaut constaté à l'écran.
 */
const client = creerClient("/api/v1");

function Application(): React.ReactNode {
  const [fragment, setFragment] = useState(fragmentCourant());
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    const surChangement = (): void => setFragment(fragmentCourant());
    window.addEventListener("hashchange", surChangement);
    void positionDuNavigateur().then(setPosition);
    return () => window.removeEventListener("hashchange", surChangement);
  }, []);

  return (
    <MiseEnPage>
      <Routeur
        fragment={fragment}
        rendu={{
          accueil: <EcranAccueil />,
          signaler: (
            <EcranSignaler
              client={client}
              positionInitiale={position}
              onOuvrirDossier={(idSignalement) => {
                window.location.hash = `#/dossier/${idSignalement}`;
              }}
            />
          ),
          interventions: <EcranInterventions client={client} maintenantIso={new Date().toISOString()} />,
          supervision: <EcranSupervision client={client} maintenantIso={new Date().toISOString()} />,
          recette: <EcranRecette />,
          dossier: (
            <EcranSuivi
              client={client}
              idSignalement={idDuFragment(fragment)}
              maintenantIso={new Date().toISOString()}
            />
          ),
          indicateurs: <EcranIndicateurs client={client} />,
          administration: <EcranAdministration client={client} />,
        }}
      />
    </MiseEnPage>
  );
}

const racine = document.getElementById("racine");
if (racine) {
  createRoot(racine).render(<Application />);
}
