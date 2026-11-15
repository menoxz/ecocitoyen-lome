import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import { Routeur, fragmentCourant } from "./app/routeur.tsx";
import { EcranSignaler, positionDuNavigateur } from "./features/signaler/EcranSignaler.tsx";
import { EcranInterventions } from "./features/interventions/EcranInterventions.tsx";
import { creerClient } from "./api/client.ts";
import { COULEURS, ESPACEMENT, TAILLE_TEXTE } from "./ui/jetons.ts";
import "./ui/ui.css";

/**
 * Point d''entrée du nouveau front.
 *
 * Séparé de `src/main.tsx` (legacy gelé) et servi par `signaler.html` : le prototype reste
 * utilisable pendant la migration (P7 → P8), et la bascule se fait en changeant une entrée HTML,
 * pas en réécrivant l''existant. Retour arrière immédiat.
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
    <main style={{ maxWidth: 720, margin: "0 auto", padding: ESPACEMENT.e4 }}>
      <Routeur
        fragment={fragment}
        rendu={{
          accueil: (
            <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
              <h1 style={{ margin: 0, fontSize: TAILLE_TEXTE.xl, color: COULEURS.texte }}>EcoCitoyen Lomé</h1>
              <p style={{ margin: 0, fontSize: TAILLE_TEXTE.md, color: COULEURS.texteAttenue }}>
                Signalez un dépôt sauvage, un caniveau bouché ou un déchet dangereux : le service
                municipal décide, vous suivez chaque étape.
              </p>
              <a
                href="#/interventions"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 44,
                  padding: `0 ${ESPACEMENT.e4}px`,
                  borderRadius: 8,
                  border: `1px solid ${COULEURS.primaire}`,
                  color: COULEURS.primaire,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Je suis agent : mes interventions
              </a>
              <a
                href="#/signaler"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 48,
                  padding: `0 ${ESPACEMENT.e4}px`,
                  borderRadius: 8,
                  backgroundColor: COULEURS.primaire,
                  color: "#ffffff",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Signaler un problème
              </a>
            </section>
          ),
          signaler: <EcranSignaler client={client} positionInitiale={position} />,
          interventions: <EcranInterventions client={client} maintenantIso={new Date().toISOString()} />,
        }}
      />
    </main>
  );
}

const racine = document.getElementById("racine");
if (racine) {
  createRoot(racine).render(<Application />);
}