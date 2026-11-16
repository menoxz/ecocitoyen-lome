import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, CalendarClock, CircleDot, FileSearch, MapPin, Users } from "lucide-react";
import { Bouton } from "../../ui/Bouton.tsx";
import { EnTeteVue } from "../../ui/EnTeteVue.tsx";
import { EtatChargement } from "../../ui/EtatChargement.tsx";
import { EtatErreur } from "../../ui/EtatErreur.tsx";
import { EtatVide } from "../../ui/EtatVide.tsx";
import { PucesEtat, type PuceEtat } from "../../ui/PucesEtat.tsx";
import { ageRelatif } from "../../ui/CarteSignalement.tsx";
import { ESPACEMENT, TAILLE_TEXTE } from "../../ui/jetons.ts";
import type { ClientApi, ErreurApi, EtapeHistoriqueApi, SignalementApi } from "../../api/client.ts";
import { etapesLisibles, libelleStatut } from "./logique.ts";
import { BoutonConfirmer } from "./BoutonConfirmer.tsx";
import { ListeHistorique } from "./ListeHistorique.tsx";

/**
 * Parcours 2 : le citoyen suit son dossier (PARCOURS.md §2), selon la même hiérarchie de
 * découverte que les autres pages :
 *   1. la donnée globale — le dossier, son numéro, son état et son ancienneté ;
 *   2. la liste — ici il n'y a qu'un objet, la place revient à ses étapes ;
 *   3. l'état du dossier, en puces icône + couleur + infobulle ;
 *   4. le détail — l'historique des décisions et la confirmation citoyenne.
 *
 * Le statut et l'historique viennent du serveur : l'écran ne calcule rien et ne promet aucun délai.
 * L'identité de qui a décidé n'est pas exposée (RG28).
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

  const tete = (
    <EnTeteVue
      icone={FileSearch}
      titre="Suivi du dossier"
      explication="L état de votre signalement et chaque décision du service, dans l'ordre où elles ont été prises."
    />
  );

  if (!id) {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
        {tete}
        <EtatVide
          titre="Aucun dossier désigné"
          explication="Cette adresse ne correspond à aucun dossier. Reprenez le numéro affiché sur votre reçu."
          libelleAction="Signaler un problème"
          onAction={() => {
            window.location.hash = "#/signaler";
          }}
        />
      </section>
    );
  }

  if (chargement) {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
        {tete}
        <EtatChargement lignes={3} libelle="Chargement de votre dossier" />
      </section>
    );
  }

  if (erreur) {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
        {tete}
        <EtatErreur
          message={erreur.message}
          code={erreur.code}
          libelleReprise="Réessayer"
          onReprise={() => {
            window.location.reload();
          }}
        />
      </section>
    );
  }

  if (!dossier) {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
        {tete}
        <EtatVide titre="Dossier introuvable" explication="Ce dossier n'existe pas ou ne vous'est pas accessible." />
      </section>
    );
  }

  const lisibles = etapesLisibles(etapes ?? []);
  const puces: PuceEtat[] = [
    {
      icone: CircleDot,
      libelle: libelleStatut(dossier.statut),
      ton: "statut",
      aide: "Statut du dossier : il décide des actions possibles, il ne les indique pas.",
    },
    {
      icone: AlertTriangle,
      libelle: `Priorité ${String(dossier.niveau_priorite).toLowerCase()}`,
      ton: dossier.niveau_priorite === "URGENTE" || dossier.niveau_priorite === "HAUTE" ? "erreur" : "priorite",
      aide: "Priorité calculée par le service à partir de la catégorie et des confirmations.",
    },
    {
      icone: MapPin,
      libelle: dossier.quartier_nom ?? dossier.id_quartier,
      ton: "neutre",
      aide: "Quartier déclaré au signalement.",
    },
    {
      icone: CalendarClock,
      libelle: ageRelatif(dossier.date_signalement, proprietes.maintenantIso),
      ton: "neutre",
      aide: "Ancienneté depuis la date de signalement.",
    },
    ...(dossier.nb_confirmations > 0
      ? [
          {
            icone: Users,
            libelle: `${dossier.nb_confirmations} confirmation(s)`,
            ton: "info" as const,
            aide: "Nombre de citoyens ayant confirmé le même problème.",
          },
        ]
      : []),
  ];

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
      <EnTeteVue
        icone={FileSearch}
        titre="Suivi du dossier"
        explication="L état de votre signalement et chaque décision du service, dans l'ordre où elles ont été prises."
        chiffres={[
          {
            icone: CircleDot,
            valeur: libelleStatut(dossier.statut),
            libelle: "état actuel",
            aide: "Statut renvoyé par le service pour ce dossier.",
          },
          {
            icone: CalendarClock,
            valeur: String(lisibles.length),
            libelle: "étape(s) enregistrée(s)",
            aide: "Chaque changement de statut est conservé dans l'historique.",
          },
        ]}
      />

      <p style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-texte-attenue)" }}>
        Numéro : <strong>{dossier.id_signalement}</strong>
      </p>

      <PucesEtat puces={puces} etiquette="État du dossier" />

      {dossier.description ? (
        <p style={{ margin: 0, fontSize: TAILLE_TEXTE.md, color: "inherit" }}>{dossier.description}</p>
      ) : null}

      {dossier.motif_rejet ? (
        <p role="alert" style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-erreur)" }}>
          Motif du rejet : {dossier.motif_rejet}
        </p>
      ) : null}

      <BoutonConfirmer
        client={proprietes.client}
        idSignalement={dossier.id_signalement}
        nbConfirmations={dossier.nb_confirmations}
        statut={dossier.statut}
      />

      <h2 style={{ margin: 0, fontSize: TAILLE_TEXTE.lg, color: "inherit" }}>Décisions du service</h2>

      <ListeHistorique etapes={etapes ?? []} lisibles={lisibles} />

      <Bouton
        variante="texte"
        onClick={() => {
          window.location.hash = "#/signaler";
        }}
      >
        Signaler un autre problème
      </Bouton>
    </section>
  );
}
