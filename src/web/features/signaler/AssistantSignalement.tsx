import { useState, type ReactNode } from "react";
import { Bouton } from "../../ui/Bouton.tsx";
import { ChampSelect, type OptionSelect } from "../../ui/ChampSelect.tsx";
import { ChampTexte } from "../../ui/ChampTexte.tsx";
import { ChampZoneTexte } from "../../ui/ChampZoneTexte.tsx";
import { EtatErreur } from "../../ui/EtatErreur.tsx";
import { RecuSignalement } from "./RecuSignalement.tsx";
import { FilParcours } from "../../ui/FilParcours.tsx";
import { ZoneDepotPhoto, type PhotoChoisie } from "../../ui/ZoneDepotPhoto.tsx";
import { ESPACEMENT, TAILLE_TEXTE } from "../../ui/jetons.ts";
import type { ErreurApi, Resultat, SignalementApi } from "../../api/client.ts";
import {
  BROUILLON_INITIAL,
  ETAPES,
  construireDemande,
  etapeSuivante,
  peutAvancer,
  type Brouillon,
  type CentresQuartiers,
  type CleEtape,
} from "./etapes.ts";

/**
 * Assistant de signalement (parcours 1) — trois étapes et un reçu, conformément à PARCOURS.md §3.
 *
 * Le composant est piloté : il ne fait aucun appel réseau lui-même. `envoyer` et les référentiels
 * sont fournis par l''écran, ce qui rend chaque étape testable en rendu serveur et le composant
 * indépendant du transport.
 *
 * Aucune règle métier : la validation de progression est dans `etapes.ts`, les refus définitifs
 * viennent du serveur et sont affichés avec leur code.
 */
export interface ProprietesAssistant {
  readonly categories: readonly OptionSelect[];
  readonly quartiers: readonly OptionSelect[];
  readonly envoyer: (demande: ReturnType<typeof construireDemande>, photos: readonly PhotoChoisie[]) => Promise<Resultat<{ signalement: SignalementApi }>>;
  readonly etapeInitiale?: CleEtape;
  readonly positionInitiale?: { readonly latitude: number; readonly longitude: number } | null;
  readonly centres?: CentresQuartiers;
  readonly onOuvrirDossier?: (idSignalement: string) => void;
  readonly onTerminer?: () => void;
}

export function AssistantSignalement(proprietes: ProprietesAssistant): ReactNode {
  const [etape, setEtape] = useState<CleEtape>(proprietes.etapeInitiale ?? "preuve");
  const [brouillon, setBrouillon] = useState<Brouillon>({
    ...BROUILLON_INITIAL,
    position: proprietes.positionInitiale ?? null,
  });
  const [erreurProgression, setErreurProgression] = useState<string | null>(null);
  const [erreurServeur, setErreurServeur] = useState<ErreurApi | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [recu, setRecu] = useState<SignalementApi | null>(null);

  const maj = (partiel: Partial<Brouillon>): void => setBrouillon((precedent) => ({ ...precedent, ...partiel }));

  const avancer = async (): Promise<void> => {
    const decision = peutAvancer(etape, brouillon);
    if (!decision.ok) {
      setErreurProgression(decision.raison);
      return;
    }
    setErreurProgression(null);

    const suivante = etapeSuivante(etape);
    if (suivante) {
      setEtape(suivante);
      return;
    }

    setEnvoiEnCours(true);
    try {
      const resultat = await proprietes.envoyer(
        construireDemande(brouillon, proprietes.centres ?? {}),
        brouillon.photos as readonly PhotoChoisie[],
      );
      if (!resultat.ok) {
        setErreurServeur(resultat.erreur);
        return;
      }
      setRecu(resultat.valeur.signalement);
    } finally {
      setEnvoiEnCours(false);
    }
  };

  if (recu) {
    return (
      <RecuSignalement
        idSignalement={recu.id_signalement}
        statut={recu.statut}
        onOuvrirDossier={proprietes.onOuvrirDossier}
        onTerminer={proprietes.onTerminer}
      />
    );
  }
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e4 }}>
      <FilParcours etapes={ETAPES} courante={etape} />

      {etape === "preuve" ? (
        <ZoneDepotPhoto
          photos={brouillon.photos as readonly PhotoChoisie[]}
          sansPhoto={brouillon.sansPhoto}
          onDeclarerSansPhoto={() => maj({ sansPhoto: true, photos: [] })}
          onRetirer={(id) => maj({ photos: brouillon.photos.filter((photo) => photo.id !== id) })}
        />
      ) : null}

      {etape === "lieu" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
          <p style={{ margin: 0, fontSize: TAILLE_TEXTE.md, color: "inherit" }}>
            {brouillon.position
              ? `Position enregistrée : ${brouillon.position.latitude.toFixed(4)}, ${brouillon.position.longitude.toFixed(4)}`
              : brouillon.positionManuelle
                ? "Position approximative : le centre du quartier choisi sera transmis au service."
                : "Aucune position pour le moment : activez la localisation, ou situez le problème au centre de son quartier."}
          </p>

          {!brouillon.position && !brouillon.positionManuelle ? (
            <Bouton variante="secondaire" onClick={() => maj({ positionManuelle: true })}>
              Utiliser le centre du quartier
            </Bouton>
          ) : null}
          <ChampSelect
            id="quartier"
            libelle="Quartier"
            valeur={brouillon.idQuartier}
            options={proprietes.quartiers}
            onChange={(valeur) => maj({ idQuartier: valeur })}
            texteVide="Choisir un quartier…"
            aide="Le quartier détermine l équipe qui sera envoyée."
            requis
          />
          <ChampTexte
            id="repere"
            libelle="Repère (facultatif)"
            valeur={brouillon.repere}
            onChange={(valeur) => maj({ repere: valeur })}
            exemple="Devant la pharmacie, à côté du marché"
            aide="Un repère connu aide l équipe à trouver le problème."
          />
        </div>
      ) : null}

      {etape === "probleme" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
          <ChampSelect
            id="categorie"
            libelle="Catégorie"
            valeur={brouillon.idCategorie}
            options={proprietes.categories}
            onChange={(valeur) => maj({ idCategorie: valeur })}
            texteVide="Choisir une catégorie…"
            aide="Vous êtes le seul à voir le problème : c est vous qui savez de quoi il s agit."
            requis
          />
          <ChampZoneTexte
            id="description"
            libelle="Description"
            valeur={brouillon.description}
            onChange={(valeur) => maj({ description: valeur })}
            aide="Décrivez ce que vous voyez : quantité, odeur, risque pour les enfants."
            requis
          />
        </div>
      ) : null}

      {erreurProgression ? (
        <EtatErreur message={erreurProgression} code="PROGRESSION_BLOQUEE" />
      ) : null}

      {erreurServeur ? (
        <EtatErreur message={erreurServeur.message} code={erreurServeur.code} />
      ) : null}

      <div style={{ display: "flex", gap: ESPACEMENT.e2 }}>
        <Bouton variante="primaire" enChargement={envoiEnCours} onClick={() => void avancer()}>
          {etape === "probleme" ? "Envoyer le signalement" : "Continuer"}
        </Bouton>
      </div>
    </section>
  );
}