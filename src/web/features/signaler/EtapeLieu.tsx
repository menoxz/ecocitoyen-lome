import type { ReactNode } from "react";
import { Bouton } from "../../ui/Bouton.tsx";
import { ChampSelect, type OptionSelect } from "../../ui/ChampSelect.tsx";
import { ChampTexte } from "../../ui/ChampTexte.tsx";
import { ESPACEMENT, TAILLE_TEXTE } from "../../ui/jetons.ts";
import type { Brouillon } from "./etapes.ts";

/**
 * Étape « Lieu » — position et quartier.
 *
 * Extraite de l'assistant pour tenir dans la limite de 150 lignes et pour être relue seule : c'est
 * l'étape où un refus de géolocalisation bloquait tout. La sortie de secours — centre du quartier —
 * est donc visible ici, pas enfouie dans une aide.
 */
export interface ProprietesEtapeLieu {
  readonly brouillon: Brouillon;
  readonly quartiers: readonly OptionSelect[];
  readonly onMaj: (partiel: Partial<Brouillon>) => void;
}

export function EtapeLieu(proprietes: ProprietesEtapeLieu): ReactNode {
  const { brouillon } = proprietes;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
      <p style={{ margin: 0, fontSize: TAILLE_TEXTE.md, color: "inherit" }}>
        {brouillon.position
          ? `Position enregistrée : ${brouillon.position.latitude.toFixed(4)}, ${brouillon.position.longitude.toFixed(4)}`
          : brouillon.positionManuelle
            ? "Position approximative : le centre du quartier choisi sera transmis au service."
            : "Aucune position pour le moment : activez la localisation, ou situez le problème au centre de son quartier."}
      </p>

      {!brouillon.position && !brouillon.positionManuelle ? (
        <div>
          <Bouton variante="secondaire" onClick={() => proprietes.onMaj({ positionManuelle: true })}>
            Utiliser le centre du quartier
          </Bouton>
        </div>
      ) : null}

      <ChampSelect
        id="quartier"
        libelle="Quartier"
        valeur={brouillon.idQuartier}
        options={proprietes.quartiers}
        onChange={(valeur) => proprietes.onMaj({ idQuartier: valeur })}
        texteVide="Choisir un quartier…"
        aide="Le quartier détermine l équipe qui sera envoyée."
        requis
      />

      <ChampTexte
        id="repere"
        libelle="Repère (facultatif)"
        valeur={brouillon.repere}
        onChange={(valeur) => proprietes.onMaj({ repere: valeur })}
        exemple="Devant la pharmacie, à côté du marché"
        aide="Un repère connu aide l équipe à trouver le problème."
      />
    </div>
  );
}
