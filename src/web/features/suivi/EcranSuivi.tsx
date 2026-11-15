import { useEffect, useState, type ReactNode } from "react";
import { BadgeStatut } from "../../ui/BadgeStatut.tsx";
import { Bouton } from "../../ui/Bouton.tsx";
import { EtatChargement } from "../../ui/EtatChargement.tsx";
import { EtatErreur } from "../../ui/EtatErreur.tsx";
import { EtatVide } from "../../ui/EtatVide.tsx";
import { COULEURS, ESPACEMENT, RAYON, TAILLE_TEXTE } from "../../ui/jetons.ts";
import type { ClientApi, ErreurApi, EtapeHistoriqueApi, SignalementApi } from "../../api/client.ts";
import { etapesLisibles, libelleStatut } from "./logique.ts";
import { BoutonConfirmer } from "./BoutonConfirmer.tsx";

/**
 * Parcours 2 : le citoyen suit son dossier (PARCOURS.md §2).
 *
 * Le statut et l'historique viennent du serveur : l'écran ne calcule rien et ne promet aucun délai.
 * L'identité de qui a décidé n'est pas exposée (RG28) — la projection serveur ne l'envoie pas.
 */
export interface ProprietesEcranSuivi {
  readonly client: ClientApi;
  readonly idSignalement: string | null;
  readonly maintenantIso: string;
}

export function EcranSuivi(proprietes: ProprietesEcranSuivi): ReactNode {
  const [dossier, setDossier] = useState<SignalementApi | null>(null);
  const [etapes, setEtapes] = useState<readonly EtapeHistoriqueApi[] | null>(null);
  const [erreur, setErreur] = useState<ErreurApi | null>(null);
  const [chargement, setChargement] = useState(true);

  const id = proprietes.idSignalement;

  useEffect(() => {
    if (!id) {
      setChargement(false);
      return;
    }
    void (async () => {
      setChargement(true);
      setErreur(null);
      const [resultatDossier, resultatEtapes] = await Promise.all([
        proprietes.client.dossier(id),
        proprietes.client.historique(id),
      ]);
      if (!resultatDossier.ok) {
        setErreur(resultatDossier.erreur);
        setChargement(false);
        return;
      }
      setDossier(resultatDossier.valeur);
      setEtapes(resultatEtapes.ok ? resultatEtapes.valeur : []);
      setChargement(false);
    })();
  }, [proprietes.client, id]);

  if (!id) {
    return (
      <EtatVide
        titre="Aucun dossier désigné"
        explication="Cette adresse ne correspond à aucun dossier. Reprenez le numéro affiché sur votre reçu."
        libelleAction="Signaler un problème"
        onAction={() => {
          window.location.hash = "#/signaler";
        }}
      />
    );
  }

  if (chargement) {
    return <EtatChargement lignes={3} libelle="Chargement de votre dossier" />;
  }

  if (erreur) {
    return (
      <EtatErreur
        message={erreur.message}
        code={erreur.code}
        libelleReprise="Réessayer"
        onReprise={() => {
          window.location.reload();
        }}
      />
    );
  }

  if (!dossier) {
    return <EtatVide titre="Dossier introuvable" explication="Ce dossier n'existe pas ou ne vous est pas accessible." />;
  }

  const lisibles = etapesLisibles(etapes ?? []);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
      <h1 style={{ margin: 0, fontSize: TAILLE_TEXTE.xl, color: COULEURS.texte }}>Suivi du dossier</h1>

      <p style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: COULEURS.texteAttenue }}>
        Numéro : <strong>{dossier.id_signalement}</strong>
      </p>

      <div style={{ display: "flex", gap: ESPACEMENT.e2, alignItems: "center", flexWrap: "wrap" }}>
        <BadgeStatut statut={dossier.statut} />
        <span style={{ fontSize: TAILLE_TEXTE.sm, color: COULEURS.texte }}>
          Priorité : {libelleStatut(dossier.niveau_priorite)}
        </span>
      </div>

      {dossier.description ? (
        <p style={{ margin: 0, fontSize: TAILLE_TEXTE.md, color: COULEURS.texte }}>{dossier.description}</p>
      ) : null}

      <p style={{ margin: 0, fontSize: TAILLE_TEXTE.xs, color: COULEURS.texteAttenue }}>
        {dossier.quartier_nom ?? dossier.id_quartier} · signalé le {dossier.date_signalement}
        {dossier.motif_rejet ? ` · motif : ${dossier.motif_rejet}` : ""}
      </p>

      <BoutonConfirmer
        client={proprietes.client}
        idSignalement={dossier.id_signalement}
        nbConfirmations={dossier.nb_confirmations}
        statut={dossier.statut}
      />

      <h2 style={{ margin: 0, fontSize: TAILLE_TEXTE.lg, color: COULEURS.texte }}>Décisions du service</h2>

      {lisibles.length === 0 ? (
        <p style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: COULEURS.texteAttenue }}>
          Aucune étape enregistrée pour l'instant.
        </p>
      ) : (
        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: ESPACEMENT.e2 }}>
          {lisibles.map((etape, index) => (
            <li
              key={`${etape.date}-${index}`}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                padding: ESPACEMENT.e3,
                border: `1px solid ${COULEURS.bordure}`,
                borderRadius: RAYON.md,
                backgroundColor: COULEURS.surface,
              }}
            >
              <span style={{ fontSize: TAILLE_TEXTE.md, color: COULEURS.texte, fontWeight: 600 }}>{etape.titre}</span>
              {etape.detail ? (
                <span style={{ fontSize: TAILLE_TEXTE.sm, color: COULEURS.texteAttenue }}>{etape.detail}</span>
              ) : null}
              <span style={{ fontSize: TAILLE_TEXTE.xs, color: COULEURS.texteAttenue }}>{etape.date}</span>
            </li>
          ))}
        </ol>
      )}

      <Bouton variante="texte" onClick={() => { window.location.hash = "#/signaler"; }}>
        Signaler un autre problème
      </Bouton>
    </section>
  );
}
