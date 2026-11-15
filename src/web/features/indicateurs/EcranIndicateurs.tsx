import { useCallback, useEffect, useState, type ReactNode } from "react";
import { FormulaireSession } from "../compte/FormulaireSession.tsx";
import { Bouton } from "../../ui/Bouton.tsx";
import { EtatChargement } from "../../ui/EtatChargement.tsx";
import { EtatErreur } from "../../ui/EtatErreur.tsx";
import { ESPACEMENT, RAYON, TAILLE_TEXTE } from "../../ui/jetons.ts";
import type { ClientApi, ErreurApi, SyntheseApi } from "../../api/client.ts";
import { NON_MESURABLE, libelleStatutIndicateur, lignesPilotage, volumesOrdonnes } from "./logique.ts";

/**
 * Parcours 6 : pilotage par les indicateurs (PARCOURS.md §7, CDC §13).
 *
 * Deux règles tenues ici et vérifiables : un indicateur non calculable affiche « non mesurable »
 * (jamais 0, jamais une valeur de repli), et le motif de chaque absence est listé tel que le
 * serveur l'a motivé. L'écran ne calcule aucun taux : il met en forme ce que le domaine a décidé.
 */
export interface ProprietesEcranIndicateurs {
  readonly client: ClientApi;
}

type Session = "inconnu" | "absent" | "present";

export function EcranIndicateurs(proprietes: ProprietesEcranIndicateurs): ReactNode {
  const [session, setSession] = useState<Session>("inconnu");
  const [synthese, setSynthese] = useState<SyntheseApi | null>(null);
  const [erreur, setErreur] = useState<ErreurApi | null>(null);

  useEffect(() => {
    void (async () => {
      const resultat = await proprietes.client.moi();
      setSession(resultat.ok && resultat.valeur.compte ? "present" : "absent");
    })();
  }, [proprietes.client]);

  const charger = useCallback(async (): Promise<void> => {
    setErreur(null);
    const resultat = await proprietes.client.synthese();
    if (!resultat.ok) {
      setErreur(resultat.erreur);
      return;
    }
    setSynthese(resultat.valeur);
  }, [proprietes.client]);

  useEffect(() => {
    if (session === "present") {
      void charger();
    }
  }, [session, charger]);

  if (session === "inconnu") {
    return <EtatChargement lignes={2} libelle="Vérification de votre session" />;
  }

  if (session === "absent") {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e4 }}>
        <h1 style={{ margin: 0, fontSize: TAILLE_TEXTE.xl, color: "inherit" }}>Indicateurs de pilotage</h1>
        <FormulaireSession
          client={proprietes.client}
          onSession={() => setSession("present")}
          titre="Se connecter pour consulter les indicateurs"
          explication="Les délais internes et la qualité de la classification sont réservés à la supervision."
        />
      </section>
    );
  }

  if (erreur) {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e4 }}>
        <h1 style={{ margin: 0, fontSize: TAILLE_TEXTE.xl, color: "inherit" }}>Indicateurs de pilotage</h1>
        <EtatErreur
          message={erreur.message}
          code={erreur.code}
          libelleReprise="Réessayer"
          onReprise={() => void charger()}
        />
      </section>
    );
  }

  if (!synthese) {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e4 }}>
        <h1 style={{ margin: 0, fontSize: TAILLE_TEXTE.xl, color: "inherit" }}>Indicateurs de pilotage</h1>
        <EtatChargement lignes={4} libelle="Calcul des indicateurs" />
      </section>
    );
  }

  const lignes = lignesPilotage(synthese);
  const volumes = volumesOrdonnes(synthese);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
      <h1 style={{ margin: 0, fontSize: TAILLE_TEXTE.xl, color: "inherit" }}>Indicateurs de pilotage</h1>
      <p style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-texte-attenue)" }}>
        {synthese.total} dossier(s) sur la période. Un indicateur non calculable est marqué «{" "}
        {NON_MESURABLE} » : il n'est jamais remplacé par une valeur de repli.
      </p>

      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: ESPACEMENT.e2 }}>
        {lignes.map((ligne) => (
          <li
            key={ligne.libelle}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: ESPACEMENT.e3,
              padding: `${ESPACEMENT.e2}px ${ESPACEMENT.e3}px`,
              border: "1px solid var(--ui-bordure)",
              borderRadius: RAYON.md,
              backgroundColor: "var(--ui-surface)",
            }}
          >
            <span style={{ fontSize: TAILLE_TEXTE.sm, color: "inherit" }}>{ligne.libelle}</span>
            <strong
              style={{
                fontSize: TAILLE_TEXTE.md,
                color: ligne.mesurable ? "var(--ui-texte)" : "var(--ui-texte-attenue)",
                fontStyle: ligne.mesurable ? "normal" : "italic",
              }}
            >
              {ligne.valeur}
            </strong>
          </li>
        ))}
      </ul>

      <h2 style={{ margin: 0, fontSize: TAILLE_TEXTE.lg, color: "inherit" }}>Dossiers par statut</h2>
      <p style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "inherit" }}>
        {volumes.map((volume) => `${libelleStatutIndicateur(volume.statut)} : ${volume.nombre}`).join(" · ")}
      </p>

      {synthese.indisponibles.length > 0 ? (
        <>
          <h2 style={{ margin: 0, fontSize: TAILLE_TEXTE.lg, color: "inherit" }}>
            Indicateurs non mesurables, et pourquoi
          </h2>
          <ul style={{ margin: 0, paddingLeft: ESPACEMENT.e4, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-texte-attenue)" }}>
            {synthese.indisponibles.map((motif) => (
              <li key={motif}>{motif}</li>
            ))}
          </ul>
        </>
      ) : null}

      <Bouton variante="texte" onClick={() => void charger()}>
        Recalculer
      </Bouton>
    </section>
  );
}
