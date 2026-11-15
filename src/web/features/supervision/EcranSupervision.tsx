import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, CameraOff, Filter, ListChecks } from "lucide-react";
import { FormulaireSession } from "../compte/FormulaireSession.tsx";
import { Bouton } from "../../ui/Bouton.tsx";
import { CarteSignalement } from "../../ui/CarteSignalement.tsx";
import { EnTeteVue } from "../../ui/EnTeteVue.tsx";
import { EtatChargement } from "../../ui/EtatChargement.tsx";
import { EtatErreur } from "../../ui/EtatErreur.tsx";
import { Modale } from "../../ui/Modale.tsx";
import { ESPACEMENT, TAILLE_TEXTE } from "../../ui/jetons.ts";
import type { ClientApi, ErreurApi, SignalementApi } from "../../api/client.ts";
import { FormulaireDecision } from "./FormulaireDecision.tsx";
import { ListeSupervision } from "./ListeSupervision.tsx";
import { construireRejet, construireValidation, dossiersATrier, libellePriorite } from "./logique.ts";

/**
 * Parcours superviseur (PARCOURS.md §5), monté selon la hiérarchie de découverte :
 *   1. la donnée globale — combien de signalements attendent une décision, combien sont urgents ;
 *   2. la file, cherchable, filtrable par priorité et triable (`ListeSupervision`) ;
 *   3. l'état de chaque signalement, en icône + couleur + infobulle (`CarteSignalement`) ;
 *   4. la décision, au clic, dans `FormulaireDecision`.
 *
 * Les valeurs de décision (priorités, motifs) sont servies par le serveur : l'écran n'en invente
 * aucune. Le rejet exige un motif, parce qu'un rejet muet ne dit pas au citoyen quoi corriger.
 */
export interface ProprietesEcranSupervision {
  readonly client: ClientApi;
  readonly maintenantIso: string;
}

type Session = "inconnu" | "absent" | "present";

const EXPLICATION = "Les signalements en attente de décision, les plus urgents et les plus anciens d abord.";

export function EcranSupervision(proprietes: ProprietesEcranSupervision): ReactNode {
  const [session, setSession] = useState<Session>("inconnu");
  const [file, setFile] = useState<readonly SignalementApi[] | null>(null);
  const [priorites, setPriorites] = useState<readonly string[]>([]);
  const [motifs, setMotifs] = useState<readonly string[]>([]);
  const [erreur, setErreur] = useState<ErreurApi | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    void (async () => {
      const resultat = await proprietes.client.moi();
      setSession(resultat.ok && resultat.valeur.compte ? "present" : "absent");
    })();
  }, [proprietes.client]);

  const charger = useCallback(async (): Promise<void> => {
    setErreur(null);
    const [liste, listePriorites, listeMotifs] = await Promise.all([
      proprietes.client.listerDossiers("NOUVEAU"),
      proprietes.client.priorites(),
      proprietes.client.motifsRejet(),
    ]);
    if (!liste.ok) {
      setErreur(liste.erreur);
      return;
    }
    setFile(dossiersATrier(liste.valeur));
    if (listePriorites.ok) {
      setPriorites(listePriorites.valeur);
    }
    if (listeMotifs.ok) {
      setMotifs(listeMotifs.valeur);
    }
  }, [proprietes.client]);

  useEffect(() => {
    if (session === "present") {
      void charger();
    }
  }, [session, charger]);

  const decider = useCallback(
    async (dossier: SignalementApi, choix: string, commentaire: string, valider: boolean): Promise<void> => {
      setEnCours(true);
      setErreur(null);
      const resultat = valider
        ? await proprietes.client.valider(dossier.id_signalement, construireValidation(choix, commentaire, dossier.id_categorie))
        : await proprietes.client.rejeter(dossier.id_signalement, construireRejet(choix, commentaire));
      setEnCours(false);
      if (!resultat.ok) {
        setErreur(resultat.erreur);
        return;
      }
      setFile((courante) => (courante ?? []).filter((d) => d.id_signalement !== dossier.id_signalement));
      setOuvert(null);
      setMessage(
        valider
          ? "Signalement validé : les équipes peuvent planifier l'intervention."
          : "Signalement rejeté : le citoyen reçoit le motif.",
      );
    },
    [proprietes.client],
  );

  if (session === "inconnu") {
    return <EtatChargement lignes={3} libelle="Vérification de votre session" />;
  }

  if (session === "absent") {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e4 }}>
        <EnTeteVue icone={ListChecks} titre="File de tri" explication={EXPLICATION} />
        <FormulaireSession
          client={proprietes.client}
          onSession={() => setSession("present")}
          titre="Se connecter pour décider"
          explication="La file de tri est réservée aux superviseurs : votre session détermine les dossiers que vous pouvez valider ou rejeter."
        />
      </section>
    );
  }

  if (erreur && !file) {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e4 }}>
        <EnTeteVue icone={ListChecks} titre="File de tri" explication={EXPLICATION} />
        <EtatErreur
          message={erreur.message}
          code={erreur.code}
          libelleReprise="Réessayer"
          onReprise={() => void charger()}
        />
      </section>
    );
  }

  if (!file) {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e4 }}>
        <EnTeteVue icone={ListChecks} titre="File de tri" explication={EXPLICATION} />
        <EtatChargement lignes={3} libelle="Chargement de la file de tri" />
      </section>
    );
  }

  const dossierOuvert = file.find((dossier) => dossier.id_signalement === ouvert) ?? null;
  const urgents = file.filter((dossier) => dossier.niveau_priorite === "URGENTE").length;
  const sansPhoto = file.filter((dossier) => dossier.sans_photo).length;

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
      <EnTeteVue
        icone={ListChecks}
        titre="File de tri"
        explication={EXPLICATION}
        chiffres={[
          {
            icone: Filter,
            valeur: String(file.length),
            libelle: "en attente de décision",
            aide: "Signalements au statut NOUVEAU, servis par le serveur.",
          },
          {
            icone: AlertTriangle,
            valeur: String(urgents),
            libelle: "urgent(s)",
            aide: "Signalements dont la priorité calculée par le service est URGENTE.",
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

      {erreur ? (
        <p role="alert" style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-erreur)" }}>
          {erreur.message}
        </p>
      ) : null}

      {dossierOuvert ? (
        <Modale
          ouverte
          taille="standard"
          titre={`Décider du dossier ${dossierOuvert.id_signalement}`}
          libelleFermeture="Fermer la décision"
          onFermer={() => setOuvert(null)}
        >
          <div className="ui-panneau-dossier">
          <CarteSignalement
            id={dossierOuvert.id_signalement}
            statut={dossierOuvert.statut}
            priorite={dossierOuvert.niveau_priorite}
            scorePriorite={dossierOuvert.score_priorite}
            description={dossierOuvert.description ?? `Dossier ${dossierOuvert.id_signalement}`}
            quartier={dossierOuvert.quartier_nom ?? dossierOuvert.id_quartier}
            dateSignalement={dossierOuvert.date_signalement}
            maintenantIso={proprietes.maintenantIso}
            nbConfirmations={dossierOuvert.nb_confirmations}
            sansPhoto={dossierOuvert.sans_photo}
            selectionnee
          />
          <p style={{ margin: 0, fontSize: TAILLE_TEXTE.xs, color: "var(--ui-texte-attenue)" }}>
            Priorité proposée par le service : {libellePriorite(dossierOuvert.niveau_priorite)}.
          </p>
          <FormulaireDecision
            dossier={dossierOuvert}
            priorites={priorites}
            motifs={motifs}
            enCours={enCours}
            onValider={(priorite, commentaire) => void decider(dossierOuvert, priorite, commentaire, true)}
            onRejeter={(motif, commentaire) => void decider(dossierOuvert, motif, commentaire, false)}
          />
          <Bouton variante="texte" onClick={() => setOuvert(null)}>
            Revenir à la file
          </Bouton>
          </div>
        </Modale>
      ) : (
        <ListeSupervision file={file} maintenantIso={proprietes.maintenantIso} onOuvrir={setOuvert} />
      )}
    </section>
  );
}


