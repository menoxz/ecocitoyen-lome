import { useState, type ReactNode } from "react";
import { Bouton } from "../../ui/Bouton.tsx";
import { CarteSignalement } from "../../ui/CarteSignalement.tsx";
import { ChampZoneTexte } from "../../ui/ChampZoneTexte.tsx";
import { ESPACEMENT, TAILLE_TEXTE } from "../../ui/jetons.ts";
import type { ClientApi, ErreurApi, SignalementApi } from "../../api/client.ts";
import { actionPossible, construireEntreeCloture, peutCloturer, type PhotoPreuve } from "./logique.ts";

/**
 * Niveau 4 de la hiérarchie de découverte : le dossier ouvert, et les deux gestes de l'agent.
 *
 * Le détail est monté à part de la liste pour deux raisons : la carte de liste reste légère, et la
 * clôture — le seul geste irréversible de ce parcours — ne partage pas son état avec le filtrage.
 * La preuve est le fichier lui-même : un booléen déclaratif ne prouverait rien.
 */
export interface ProprietesDetailIntervention {
  readonly dossier: SignalementApi;
  readonly client: ClientApi;
  readonly maintenantIso: string;
  readonly onFermer: () => void;
  readonly onMessage: (message: string) => void;
  readonly onRecharge: () => void;
}

export function DetailIntervention(proprietes: ProprietesDetailIntervention): ReactNode {
  const [demarree, setDemarree] = useState(false);
  const [commentaire, setCommentaire] = useState("");
  const [photo, setPhoto] = useState<PhotoPreuve | null>(null);
  const [erreur, setErreur] = useState<ErreurApi | null>(null);

  const action = actionPossible(proprietes.dossier, demarree);
  const decision = peutCloturer(commentaire, photo);

  return (
    <article style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
      <Bouton variante="texte" onClick={proprietes.onFermer}>
        Retour à la liste
      </Bouton>

      <CarteSignalement
        id={proprietes.dossier.id_signalement}
        statut={proprietes.dossier.statut}
        priorite={proprietes.dossier.niveau_priorite}
        scorePriorite={proprietes.dossier.score_priorite}
        description={proprietes.dossier.description ?? `Dossier ${proprietes.dossier.id_signalement}`}
        quartier={proprietes.dossier.quartier_nom ?? proprietes.dossier.id_quartier}
        dateSignalement={proprietes.dossier.date_signalement}
        maintenantIso={proprietes.maintenantIso}
        nbConfirmations={proprietes.dossier.nb_confirmations}
        sansPhoto={proprietes.dossier.sans_photo}
        selectionnee
      />

      {erreur ? (
        <p role="alert" style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-erreur)" }}>
          {erreur.message}
        </p>
      ) : null}

      {action === "demarrer" ? (
        <Bouton
          variante="primaire"
          onClick={() => {
            void (async () => {
              const resultat = await proprietes.client.demarrer(proprietes.dossier.id_signalement);
              if (!resultat.ok) {
                setErreur(resultat.erreur);
                return;
              }
              setDemarree(true);
              proprietes.onMessage("Intervention démarrée. Pensez à la photo de preuve avant de clôturer.");
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
            <label htmlFor="photo-preuve" style={{ fontSize: TAILLE_TEXTE.sm, fontWeight: 600, color: "inherit" }}>
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
              <p style={{ margin: 0, fontSize: TAILLE_TEXTE.xs, color: "var(--ui-texte-attenue)" }}>
                {photo.nom} — {Math.max(1, Math.round(photo.octets.size / 1024))} Ko
              </p>
            ) : null}
          </div>

          {!photo ? (
            <p style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-alerte)" }}>
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
                  proprietes.dossier.id_signalement,
                  photo.octets,
                  photo.typeMime,
                );
                if (!envoi.ok) {
                  setErreur(envoi.erreur);
                  return;
                }

                // 2. la clôture reprend le chemin renvoyé par le serveur, jamais un chemin forgé
                const resultat = await proprietes.client.resoudre(
                  proprietes.dossier.id_signalement,
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
                proprietes.onMessage("Intervention clôturée. La preuve est enregistrée et le citoyen est notifié.");
                proprietes.onFermer();
                proprietes.onRecharge();
              })();
            }}
          >
            Clôturer avec preuve
          </Bouton>
        </div>
      ) : null}
    </article>
  );
}
