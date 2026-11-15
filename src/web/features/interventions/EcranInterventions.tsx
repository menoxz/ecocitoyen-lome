import { useCallback, useEffect, useState, type ReactNode } from "react";
import { FormulaireSession } from "../compte/FormulaireSession.tsx";
import { Bouton } from "../../ui/Bouton.tsx";
import { ChampZoneTexte } from "../../ui/ChampZoneTexte.tsx";
import { CarteSignalement } from "../../ui/CarteSignalement.tsx";
import { EtatChargement } from "../../ui/EtatChargement.tsx";
import { EtatErreur } from "../../ui/EtatErreur.tsx";
import { EtatVide } from "../../ui/EtatVide.tsx";
import { COULEURS, ESPACEMENT, TAILLE_TEXTE } from "../../ui/jetons.ts";
import type { ClientApi, ErreurApi, SignalementApi } from "../../api/client.ts";
import {
  actionPossible,
  construireEntreeCloture,
  dossiersActionnables,
  peutCloturer,
  type PhotoPreuve,
} from "./logique.ts";

/**
 * Parcours agent (PARCOURS.md §6) : la liste est l'écran d'ouverture, la clôture tient en un
 * formulaire court. Rien d'administratif : ni catégorie à revalider, ni priorité à recalculer.
 *
 * L'agent ne voit que les dossiers que le serveur lui renvoie (équipe affectée) : le filtrage de
 * périmètre est serveur, pas une politesse de l'interface.
 */
export interface ProprietesEcranInterventions {
  readonly client: ClientApi;
  /** Dossier ouvert directement (navigation profonde) ; sinon la liste commande. */
  readonly idInitial?: string;
  readonly maintenantIso: string;
}

type Session = "inconnu" | "absent" | "present";

export function EcranInterventions(proprietes: ProprietesEcranInterventions): ReactNode {
  const [session, setSession] = useState<Session>("inconnu");
  const [dossiers, setDossiers] = useState<readonly SignalementApi[] | null>(null);
  const [erreur, setErreur] = useState<ErreurApi | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(proprietes.idInitial ?? null);
  const [demarree, setDemarree] = useState(false);
  const [commentaire, setCommentaire] = useState("");
  // La preuve est le fichier lui-même : un booléen déclaratif ne prouve rien (leçon du prototype).
  const [photo, setPhoto] = useState<PhotoPreuve | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const resultat = await proprietes.client.moi();
      setSession(resultat.ok && resultat.valeur.compte ? "present" : "absent");
    })();
  }, [proprietes.client]);

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

  if (session === "inconnu") {
    return <EtatChargement lignes={3} libelle="Vérification de votre session" />;
  }

  if (session === "absent") {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e4 }}>
        <h1 style={{ margin: 0, fontSize: TAILLE_TEXTE.xl, color: COULEURS.texte }}>Mes interventions</h1>
        <FormulaireSession client={proprietes.client} onSession={() => setSession("present")} />
      </section>
    );
  }

  if (erreur) {
    return <EtatErreur message={erreur.message} code={erreur.code} libelleReprise="Réessayer" onReprise={() => void charger()} />;
  }

  if (!dossiers) {
    return <EtatChargement lignes={3} libelle="Chargement de vos interventions" />;
  }

  if (dossiers.length === 0) {
    return (
      <EtatVide
        titre="Aucune intervention en cours"
        explication="Les dossiers affectés à votre équipe apparaîtront ici dès qu'un superviseur les aura validés."
        libelleAction="Actualiser"
        onAction={() => void charger()}
      />
    );
  }

  const dossierOuvert = dossiers.find((dossier) => dossier.id_signalement === ouvert) ?? null;
  const action = dossierOuvert ? actionPossible(dossierOuvert, demarree) : "aucune";
  const decision = peutCloturer(commentaire, photo);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
      <h1 style={{ margin: 0, fontSize: TAILLE_TEXTE.xl, color: COULEURS.texte }}>Mes interventions</h1>
      <p style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: COULEURS.texteAttenue }}>
        {dossiers.length} dossier(s) à traiter, triés par priorité puis par ancienneté.
      </p>

      {message ? (
        <p role="status" style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: COULEURS.succes }}>{message}</p>
      ) : null}

      {!dossierOuvert ? (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: ESPACEMENT.e2 }}>
          {dossiers.map((dossier) => (
            <li key={dossier.id_signalement}>
              <CarteSignalement
                id={dossier.id_signalement}
                statut={dossier.statut}
                priorite={dossier.niveau_priorite}
                scorePriorite={dossier.score_priorite}
                description={`Dossier ${dossier.id_signalement.slice(0, 12)}…`}
                quartier={dossier.id_quartier}
                dateSignalement={dossier.date_signalement}
                maintenantIso={proprietes.maintenantIso}
                nbConfirmations={dossier.nb_confirmations}
                sansPhoto={dossier.sans_photo}
                onOuvrir={(id) => {
                  setOuvert(id);
                  setDemarree(false);
                  setMessage(null);
                }}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
          <Bouton variante="texte" onClick={() => setOuvert(null)}>
            Retour à la liste
          </Bouton>

          <CarteSignalement
            id={dossierOuvert.id_signalement}
            statut={dossierOuvert.statut}
            priorite={dossierOuvert.niveau_priorite}
            scorePriorite={dossierOuvert.score_priorite}
            description={`Dossier ${dossierOuvert.id_signalement}`}
            quartier={dossierOuvert.id_quartier}
            dateSignalement={dossierOuvert.date_signalement}
            maintenantIso={proprietes.maintenantIso}
            nbConfirmations={dossierOuvert.nb_confirmations}
            sansPhoto={dossierOuvert.sans_photo}
            selectionnee
          />

          {action === "demarrer" ? (
            <Bouton
              variante="primaire"
              onClick={() => {
                void (async () => {
                  const resultat = await proprietes.client.demarrer(dossierOuvert.id_signalement);
                  if (!resultat.ok) {
                    setErreur(resultat.erreur);
                    return;
                  }
                  setDemarree(true);
                  setMessage("Intervention démarrée. Pensez à la photo de preuve avant de clôturer.");
                })();
              }}
            >
              Démarrer l intervention
            </Bouton>
          ) : null}

          {action === "cloturer" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
              <ChampZoneTexte
                id="compte-rendu"
                libelle="Ce qui a été fait"
                valeur={commentaire}
                onChange={setCommentaire}
                minimum={10}
                aide="Site nettoyé, bacs relevés, déchets transportés."
                requis
              />

              <div style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e1 }}>
                <label htmlFor="photo-preuve" style={{ fontSize: TAILLE_TEXTE.sm, fontWeight: 600, color: COULEURS.texte }}>
                  Photographie du site nettoyé (obligatoire)
                </label>
                <input
                  id="photo-preuve"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(evenement) => {
                    const fichier = evenement.currentTarget.files?.[0];
                    setPhoto(
                      fichier
                        ? { octets: fichier, nom: fichier.name, typeMime: fichier.type || "image/jpeg" }
                        : null,
                    );
                  }}
                  style={{ minHeight: 44, fontSize: TAILLE_TEXTE.sm }}
                />
                {photo ? (
                  <p style={{ margin: 0, fontSize: TAILLE_TEXTE.xs, color: COULEURS.texteAttenue }}>
                    {photo.nom} — {Math.max(1, Math.round(photo.octets.size / 1024))} Ko
                  </p>
                ) : null}
              </div>

              {!photo ? (
                <p style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: COULEURS.alerte }}>
                  Sans photographie, la clôture sera refusée par le service : c est la preuve du travail.
                </p>
              ) : null}

              <Bouton
                variante="primaire"
                desactive={!decision.ok}
                onClick={() => {
                  void (async () => {
                    if (!photo) {
                      setErreur({
                        code: "PHOTO_MANQUANTE",
                        message: "Ajoutez la photographie du site nettoyé avant de clôturer.",
                      });
                      return;
                    }

                    // 1. le fichier part réellement au serveur (binaire, jamais en JSON)
                    const envoi = await proprietes.client.envoyerPhoto(
                      dossierOuvert.id_signalement,
                      photo.octets,
                      photo.typeMime,
                    );
                    if (!envoi.ok) {
                      setErreur(envoi.erreur);
                      return;
                    }

                    // 2. la clôture reprend le chemin renvoyé par le serveur, jamais un chemin forgé
                    const resultat = await proprietes.client.resoudre(
                      dossierOuvert.id_signalement,
                      construireEntreeCloture(commentaire, {
                        chemin: envoi.valeur.media.chemin,
                        mime: photo.typeMime,
                        tailleOctets: photo.octets.size,
                      }),
                    );
                    if (!resultat.ok) {
                      setErreur(resultat.erreur);
                      return;
                    }
                    setMessage("Intervention clôturée. La preuve est enregistrée et le citoyen est notifié.");
                    setOuvert(null);
                    setCommentaire("");
                    setPhoto(null);
                    setDemarree(false);
                    void charger();
                  })();
                }}
              >
                Clôturer avec preuve
              </Bouton>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}