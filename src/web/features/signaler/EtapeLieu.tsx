import type { ReactNode } from "react";
import { Bouton } from "../../ui/Bouton.tsx";
import { ChampSelect, type OptionSelect } from "../../ui/ChampSelect.tsx";
import { ChampTexte } from "../../ui/ChampTexte.tsx";
import { PucesEtat, type PuceEtat } from "../../ui/PucesEtat.tsx";
import { ESPACEMENT, TAILLE_TEXTE } from "../../ui/jetons.ts";
import { MapPin, MapPinOff, LocateFixed } from "lucide-react";
import type { Brouillon } from "./etapes.ts";

/**
 * Étape « Lieu » — position et quartier.
 *
 * L'état de la position se lit avant le texte : une puce avec icône, couleur et infobulle dit
 * « GPS enregistré », « approximatif » ou « aucune position ». Le paragraphe qui suit explique
 * seulement les conséquences, il ne porte plus l'information à lui seul.
 */
export interface ProprietesEtapeLieu {
  readonly brouillon: Brouillon;
  readonly quartiers: readonly OptionSelect[];
  readonly onMaj: (partiel: Partial<Brouillon>) => void;
}

export function EtapeLieu(proprietes: ProprietesEtapeLieu): ReactNode {
  const { brouillon } = proprietes;

  const puce: PuceEtat = brouillon.position
    ? {
        icone: LocateFixed,
        libelle: "Position GPS enregistrée",
        ton: "succes",
        aide: "Coordonnées relevées par l appareil : la position est précise.",
      }
    : brouillon.positionManuelle
      ? {
          icone: MapPin,
          libelle: "Position approximative",
          ton: "alerte",
          aide: "Le centre du quartier choisi sera transmis : la position est indicative, pas relevée.",
        }
      : {
          icone: MapPinOff,
          libelle: "Aucune position",
          ton: "erreur",
          aide: "Sans position ni quartier, le service ne peut pas envoyer d équipe.",
        };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
      <PucesEtat puces={[puce]} etiquette="État de la position" />

      <p style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-texte-attenue)" }}>
        {brouillon.position
          ? `Coordonnées transmises : ${brouillon.position.latitude.toFixed(4)}, ${brouillon.position.longitude.toFixed(4)}.`
          : brouillon.positionManuelle
            ? "Le centre du quartier choisi sera transmis au service."
            : "Activez la localisation, ou situez le problème au centre de son quartier."}
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
