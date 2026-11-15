import { useCallback, useEffect, useState, type ReactNode } from "react";
import { FormulaireSession } from "../compte/FormulaireSession.tsx";
import { Bouton } from "../../ui/Bouton.tsx";
import { CarteSignalement } from "../../ui/CarteSignalement.tsx";
import { EtatChargement } from "../../ui/EtatChargement.tsx";
import { EtatErreur } from "../../ui/EtatErreur.tsx";
import { EtatVide } from "../../ui/EtatVide.tsx";
import { COULEURS, ESPACEMENT, TAILLE_TEXTE } from "../../ui/jetons.ts";
import type { ClientApi, ErreurApi, SignalementApi } from "../../api/client.ts";
import { FormulaireDecision } from "./FormulaireDecision.tsx";
import { construireRejet, construireValidation, dossiersATrier, libellePriorite } from "./logique.ts";

/**
 * Parcours superviseur (PARCOURS.md §5) : une file de tri, une décision par dossier.
 *
 * Trois gestes : ouvrir un dossier, choisir la priorité, valider. Le rejet demande un motif, parce
 * qu'un rejet muet ne dit pas au citoyen ce qu'il doit corriger. Les valeurs de décision
 * (priorités, motifs) sont servies par le serveur : l'écran n'en invente aucune.
 */
export interface ProprietesEcranSupervision {
  readonly client: ClientApi;
  readonly maintenantIso: string;
}

type Session = "inconnu" | "absent" | "present";

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
        <h1 style={{ margin: 0, fontSize: TAILLE_TEXTE.xl, color: COULEURS.texte }}>File de tri</h1>
        <FormulaireSession
          client={proprietes.client}
          onSession={() => setSession("present")}
          titre="Se connecter pour décider"
          explication="La file de tri est réservée aux superviseurs : votre session détermine les dossiers que vous pouvez valider ou rejeter."
        />
      </section>
    );
  }

  if (erreur) {
    return <EtatErreur message={erreur.message} code={erreur.code} libelleReprise="Réessayer" onReprise={() => void charger()} />;
  }

  if (!file) {
    return <EtatChargement lignes={3} libelle="Chargement de la file de tri" />;
  }

  const dossierOuvert = file.find((dossier) => dossier.id_signalement === ouvert) ?? null;

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
      <h1 style={{ margin: 0, fontSize: TAILLE_TEXTE.xl, color: COULEURS.texte }}>File de tri</h1>
      <p style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: COULEURS.texteAttenue }}>
        {file.length} signalement(s) en attente de décision, les plus urgents et les plus anciens d'abord.
      </p>

      {message ? (
        <p role="status" style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: COULEURS.succes }}>
          {message}
        </p>
      ) : null}

      {dossierOuvert ? (
        <article style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
          <p style={{ margin: 0, fontSize: TAILLE_TEXTE.md, color: COULEURS.texte }}>
            {dossierOuvert.description ?? `Dossier ${dossierOuvert.id_signalement}`}
          </p>
          <p style={{ margin: 0, fontSize: TAILLE_TEXTE.xs, color: COULEURS.texteAttenue }}>
            {dossierOuvert.quartier_nom ?? dossierOuvert.id_quartier} · priorité proposée :{" "}
            {libellePriorite(dossierOuvert.niveau_priorite)}
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
        </article>
      ) : file.length === 0 ? (
        <EtatVide
          titre="Aucun signalement à trier"
          explication="La file est vide : les nouveaux signalements apparaîtront ici."
          libelleAction="Actualiser"
          onAction={() => void charger()}
        />
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: ESPACEMENT.e2 }}>
          {file.map((dossier) => (
            <li key={dossier.id_signalement}>
              <CarteSignalement
                id={dossier.id_signalement}
                statut={dossier.statut}
                priorite={dossier.niveau_priorite}
                scorePriorite={dossier.score_priorite}
                description={dossier.description ?? `Dossier ${dossier.id_signalement.slice(0, 12)}…`}
                quartier={dossier.quartier_nom ?? dossier.id_quartier}
                dateSignalement={dossier.date_signalement}
                maintenantIso={proprietes.maintenantIso}
                nbConfirmations={dossier.nb_confirmations}
                sansPhoto={dossier.sans_photo}
                selectionnee={ouvert === dossier.id_signalement}
                onOuvrir={setOuvert}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
