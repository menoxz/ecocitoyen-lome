import { useState, type ReactNode } from "react";
import { Bouton } from "../../ui/Bouton.tsx";
import { FilParcours } from "../../ui/FilParcours.tsx";
import { EtatErreur } from "../../ui/EtatErreur.tsx";
import { ZoneDepotPhoto, type PhotoChoisie } from "../../ui/ZoneDepotPhoto.tsx";
import { ESPACEMENT, TAILLE_TEXTE } from "../../ui/jetons.ts";
import type { OptionSelect } from "../../ui/ChampSelect.tsx";
import type { ErreurApi, Resultat, SignalementApi } from "../../api/client.ts";
import { RecuSignalement } from "./RecuSignalement.tsx";
import { EtapeLieu } from "./EtapeLieu.tsx";
import { EtapeProbleme } from "./EtapeProbleme.tsx";
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
 * Les étapes, la section à remplir et le bouton forment **une seule carte** : le fil d'étapes en
 * tête, le contenu au milieu, le bouton « Continuer » dans le pied de la carte. Le bouton reste
 * donc visible et fait partie du bloc qu'il valide, au lieu de flotter sous le contenu.
 *
 * Le composant est piloté : il ne fait aucun appel réseau lui-même. `envoyer` et les référentiels
 * sont fournis par l'écran. Aucune règle métier : la progression est décidée dans `etapes.ts`.
 */
export interface ProprietesAssistant {
  readonly categories: readonly OptionSelect[];
  readonly quartiers: readonly OptionSelect[];
  readonly envoyer: (
    demande: ReturnType<typeof construireDemande>,
    photos: readonly PhotoChoisie[],
  ) => Promise<Resultat<{ signalement: SignalementApi }>>;
  readonly etapeInitiale?: CleEtape;
  readonly positionInitiale?: { readonly latitude: number; readonly longitude: number } | null;
  readonly centres?: CentresQuartiers;
  readonly onOuvrirDossier?: (idSignalement: string) => void;
  readonly onTerminer?: () => void;
}

/** Identité locale d'une photo choisie : l'aperçu est une URL d'objet, libérée au retrait. */
let compteurPhoto = 0;

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

  /** Ajout réel : les fichiers choisis deviennent des photos du brouillon, aperçu compris. */
  const ajouterPhotos = (fichiers: readonly File[]): void => {
    const maximum = 3;
    const restantes = maximum - brouillon.photos.length;
    const retenues = fichiers.slice(0, Math.max(0, restantes)).map((fichier) => {
      compteurPhoto += 1;
      return {
        id: `photo-${compteurPhoto}`,
        nom: fichier.name,
        urlApercu: typeof URL !== "undefined" && "createObjectURL" in URL ? URL.createObjectURL(fichier) : undefined,
        octets: fichier,
        typeMime: fichier.type || "image/jpeg",
      };
    });
    if (retenues.length > 0) {
      maj({ photos: [...brouillon.photos, ...retenues], sansPhoto: false });
      setErreurProgression(null);
    }
  };

  const retirerPhoto = (id: string): void => {
    const visee = (brouillon.photos as readonly PhotoChoisie[]).find((photo) => photo.id === id);
    if (visee?.urlApercu && typeof URL !== "undefined" && "revokeObjectURL" in URL) {
      URL.revokeObjectURL(visee.urlApercu);
    }
    maj({ photos: brouillon.photos.filter((photo) => photo.id !== id) });
  };

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

  const dernier = etape === "probleme";

  return (
    <section className="ui-carte-etapes">
      <div className="ui-carte-tete">
        <FilParcours etapes={ETAPES} courante={etape} />
      </div>

      <div className="ui-carte-corps">
        {etape === "preuve" ? (
          <ZoneDepotPhoto
            photos={brouillon.photos as readonly PhotoChoisie[]}
            sansPhoto={brouillon.sansPhoto}
            onFichiers={ajouterPhotos}
            onRetirer={retirerPhoto}
            onDeclarerSansPhoto={() => maj({ sansPhoto: true, photos: [] })}
          />
        ) : null}

        {etape === "lieu" ? <EtapeLieu brouillon={brouillon} quartiers={proprietes.quartiers} onMaj={maj} /> : null}

        {etape === "probleme" ? (
          <EtapeProbleme brouillon={brouillon} categories={proprietes.categories} onMaj={maj} />
        ) : null}

        {erreurProgression ? <EtatErreur message={erreurProgression} code="PROGRESSION_BLOQUEE" /> : null}
        {erreurServeur ? <EtatErreur message={erreurServeur.message} code={erreurServeur.code} /> : null}
      </div>

      <footer className="ui-carte-pied">
        <p className="ui-carte-pied-note">
          {etape === "preuve" && brouillon.photos.length === 0 && !brouillon.sansPhoto
            ? "Ajoutez une photo, ou déclarez que vous ne pouvez pas photographier."
            : etape === "preuve"
              ? "Vous pouvez avancer : le service vérifiera la photo."
              : etape === "lieu"
                ? "Le quartier détermine l équipe qui sera envoyée."
                : "Vérifiez avant d envoyer : un signalement envoyé ne se modifie plus."}
        </p>
        <Bouton variante="primaire" enChargement={envoiEnCours} onClick={() => void avancer()}>
          {dernier ? "Envoyer le signalement" : "Continuer"}
        </Bouton>
      </footer>
    </section>
  );
}
