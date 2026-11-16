import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, CameraOff, ClipboardList, Wrench } from "lucide-react";
import { FormulaireSession } from "../compte/FormulaireSession.tsx";
import { FormulaireMotDePasse } from "../compte/FormulaireMotDePasse.tsx";
import { EnTeteVue } from "../../ui/EnTeteVue.tsx";
import { EtatChargement } from "../../ui/EtatChargement.tsx";
import { EtatErreur } from "../../ui/EtatErreur.tsx";
import { EtatVide } from "../../ui/EtatVide.tsx";
import { ESPACEMENT, TAILLE_TEXTE } from "../../ui/jetons.ts";
import type { ClientApi, ErreurApi, SignalementApi } from "../../api/client.ts";
import { ListeInterventions } from "./ListeInterventions.tsx";
import { dossiersActionnables } from "./logique.ts";

/**
 * Parcours agent (PARCOURS.md §6), monté selon la hiérarchie de découverte :
 *   1. la donnée globale — combien de dossiers, combien d'urgents, combien sans photo ;
 *   2. la liste, cherchable, filtrable et triable (`ListeInterventions`) ;
 *   3. l'état de chaque dossier, en icône + couleur + infobulle (`CarteSignalement`) ;
 *   4. les gestes — démarrer, clôturer avec preuve — directement dans la carte.
 *
 * Rien d'administratif ici : ni catégorie à revalider, ni priorité à recalculer. L'agent ne voit
 * que les dossiers que le serveur lui renvoie (équipe affectée) : le périmètre est serveur.
 */
export interface ProprietesEcranInterventions {
  readonly client: ClientApi;

  readonly maintenantIso: string;
}

type Session = "inconnu" | "absent" | "present";

export function EcranInterventions(proprietes: ProprietesEcranInterventions): ReactNode {
  const [session, setSession] = useState<Session>("inconnu");
  const [dossiers, setDossiers] = useState<readonly SignalementApi[] | null>(null);
  const [erreur, setErreur] = useState<ErreurApi | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [demarrage, setDemarrage] = useState<string | null>(null);
  /** Vrai tant que le mot de passe remis par l'administrateur n'a pas été remplacé. */
  const [temporaire, setTemporaire] = useState(false);

  useEffect(() => {
    void (async () => {
      const resultat = await proprietes.client.moi();
      setSession(resultat.ok && resultat.valeur.compte ? "present" : "absent");
      setTemporaire(resultat.ok && resultat.valeur.compte?.mot_de_passe_temporaire === true);
    })();
  }, [proprietes.client]);

  useEffect(() => {
    if (session !== "present") {
      return;
    }
    // La connexion se fait sur cet écran : `session` devient « present » sans remonter le compte.
    // Sans cette relecture, un agent invité entrait directement dans la file avec un mot de passe
    // que l'administrateur connaissait encore.
    void (async () => {
      const resultat = await proprietes.client.moi();
      if (resultat.ok) {
        setTemporaire(resultat.valeur.compte?.mot_de_passe_temporaire === true);
      }
    })();
  }, [session, proprietes.client]);

  const charger = useCallback(async (): Promise<void> => {
    setErreur(null);
    const resultat = await proprietes.client.listerInterventions();
    if (!resultat.ok) {
      setErreur(resultat.erreur);
      return;
    }
    setDossiers(dossiersActionnables(resultat.valeur));
  }, [proprietes.client]);

  useEffect(() => {
    if (session === "present") {
      void charger();
    }
  }, [session, charger]);

  /**
   * Démarrage depuis la carte : l action principale de la file. Le serveur décide (statut, rôle,
   * affectation) ; la liste est rechargée ensuite pour afficher l'état réel, jamais un état supposé.
   */
  const demarrerDossier = useCallback(
    async (id: string): Promise<void> => {
      setDemarrage(id);
      setErreur(null);
      setMessage(null);
      const resultat = await proprietes.client.demarrer(id);
      setDemarrage(null);
      if (!resultat.ok) {
        setErreur(resultat.erreur);
        return;
      }
      setMessage("Intervention démarrée. Pensez à la photo de preuve avant de clôturer.");
      await charger();
    },
    [proprietes.client, charger],
  );

  if (session === "inconnu") {
    return <EtatChargement lignes={3} libelle="Vérification de votre session" />;
  }

  // Un mot de passe temporaire bloque le travail : l'administrateur le connaît, donc l'agent ne
  // doit rien faire d'autre avant de l'avoir remplacé.
  if (temporaire) {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e4 }}>
        <EnTeteVue
          icone={Wrench}
          titre="Mes interventions"
          explication="Les dossiers affectés à votre équipe, avec les gestes de terrain : démarrer, clôturer avec preuve."
        />
        <FormulaireMotDePasse client={proprietes.client} temporaire onChange={() => setTemporaire(false)} />
      </section>
    );
  }

  if (session === "absent") {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e4 }}>
        <EnTeteVue
          icone={Wrench}
          titre="Mes interventions"
          explication="Les dossiers affectés à votre équipe, avec les gestes de terrain : démarrer, clôturer avec preuve."
        />
        <FormulaireSession
          client={proprietes.client}
          onSession={() => setSession("present")}
          titre="Se connecter pour intervenir"
          explication="Vos interventions sont celles affectées à votre équipe : la session détermine la file que vous voyez."
        />
      </section>
    );
  }

  if (erreur) {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e4 }}>
        <EnTeteVue icone={Wrench} titre="Mes interventions" explication="Les dossiers affectés à votre équipe." />
        <EtatErreur
          message={erreur.message}
          code={erreur.code}
          libelleReprise="Réessayer"
          onReprise={() => void charger()}
        />
      </section>
    );
  }

  if (!dossiers) {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e4 }}>
        <EnTeteVue icone={Wrench} titre="Mes interventions" explication="Les dossiers affectés à votre équipe." />
        <EtatChargement lignes={3} libelle="Chargement de vos interventions" />
      </section>
    );
  }

  if (dossiers.length === 0) {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e4 }}>
        <EnTeteVue icone={Wrench} titre="Mes interventions" explication="Les dossiers affectés à votre équipe." />
        <EtatVide
          titre="Aucune intervention en cours"
          explication="Les dossiers affectés à votre équipe apparaîtront ici dès qu'un superviseur les aura validés."
          libelleAction="Actualiser"
          onAction={() => void charger()}
        />
      </section>
    );
  }

  const urgents = dossiers.filter((dossier) => dossier.niveau_priorite === "URGENTE").length;
  const sansPhoto = dossiers.filter((dossier) => dossier.sans_photo).length;

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
      <EnTeteVue
        icone={Wrench}
        titre="Mes interventions"
        explication="Les dossiers affectés à votre équipe, dans l'ordre décidé par le service : les plus urgents et les plus anciens d'abord."
        chiffres={[
          {
            icone: ClipboardList,
            valeur: String(dossiers.length),
            libelle: "dossier(s) à traiter",
            aide: "Dossiers validés et affectés à votre équipe, servis par le serveur.",
          },
          {
            icone: AlertTriangle,
            valeur: String(urgents),
            libelle: "urgent(s)",
            aide: "Dossiers dont la priorité calculée par le service est URGENTE.",
          },
          {
            icone: CameraOff,
            valeur: String(sansPhoto),
            libelle: "sans photo",
            aide: "Signalements déclarés en mode dégradé : aucune photo jointe.",
          },
        ]}
      />

      {message ? (
        <p role="status" style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-succes)" }}>
          {message}
        </p>
      ) : null}

      <ListeInterventions
        dossiers={dossiers}
        maintenantIso={proprietes.maintenantIso}
        client={proprietes.client}
        onDemarrer={(id) => void demarrerDossier(id)}
        demarrageEnCours={demarrage}
        onMessage={setMessage}
        onRecharge={() => void charger()}
      />
    </section>
  );
}



