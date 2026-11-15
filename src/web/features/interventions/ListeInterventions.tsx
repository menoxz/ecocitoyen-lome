import { useState, type ReactNode } from "react";
import { BarreListe } from "../../ui/BarreListe.tsx";
import { CarteSignalement } from "../../ui/CarteSignalement.tsx";
import { EtatVide } from "../../ui/EtatVide.tsx";
import { Facettes, type Facette } from "../../ui/Facettes.tsx";
import { ESPACEMENT } from "../../ui/jetons.ts";
import { compterPar, filtrerParTexte, trierPar } from "../../ui/liste.ts";
import type { ClientApi, SignalementApi } from "../../api/client.ts";
import { ClotureIntervention } from "./ClotureIntervention.tsx";

/**
 * Niveaux 2 et 3 de la hiérarchie de découverte pour la file de l'agent : la liste se cherche,
 * se filtre et se trie ; chaque carte montre l'état de l'objet. Rien n'est décidé ici.
 *
 * L'ordre livré par le serveur reste le tri par défaut : c'est lui qui porte la règle de priorité.
 * Les autres tris sont des commodités de lecture, jamais un recalcul de l'urgence.
 */
export interface ProprietesListeInterventions {
  readonly dossiers: readonly SignalementApi[];
  readonly maintenantIso: string;
  readonly client: ClientApi;
  readonly onDemarrer: (id: string) => void;
  readonly demarrageEnCours: string | null;
  readonly onMessage: (message: string) => void;
  readonly onRecharge: () => void;
}

const TOUTES = "TOUTES";

const OPTIONS_TRI = [
  { valeur: "servi", libelle: "Ordre du service" },
  { valeur: "recent", libelle: "Plus récents d'abord" },
  { valeur: "ancien", libelle: "Plus anciens d'abord" },
] as const;

export function ListeInterventions(proprietes: ProprietesListeInterventions): ReactNode {
  const [recherche, setRecherche] = useState("");
  const [tri, setTri] = useState<string>("servi");
  const [priorite, setPriorite] = useState<string>(TOUTES);
  const [clotureId, setClotureId] = useState<string | null>(null);

  const parPriorite = compterPar(proprietes.dossiers, (dossier) => dossier.niveau_priorite);
  const facettes: readonly Facette[] = [
    { cle: TOUTES, libelle: "Toutes", nombre: proprietes.dossiers.length },
    ...["URGENTE", "HAUTE", "NORMALE", "BASSE"].map((cle) => ({
      cle,
      libelle: cle.charAt(0) + cle.slice(1).toLowerCase(),
      nombre: parPriorite[cle] ?? 0,
    })),
  ];

  const filtres = filtrerParTexte(
    proprietes.dossiers,
    recherche,
    (dossier) => [dossier.id_signalement, dossier.description ?? "", dossier.quartier_nom ?? dossier.id_quartier],
  ).filter((dossier) => priorite === TOUTES || dossier.niveau_priorite === priorite);

  const visibles =
    tri === "recent"
      ? trierPar(filtres, (dossier) => Date.parse(dossier.date_signalement), "descendant")
      : tri === "ancien"
        ? trierPar(filtres, (dossier) => Date.parse(dossier.date_signalement), "ascendant")
        : filtres;

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
      <BarreListe
        idRecherche="recherche-intervention"
        libelleRecherche="Chercher un dossier"
        exempleRecherche="Référence, mot du signalement ou quartier"
        recherche={recherche}
        onRecherche={setRecherche}
        tri={{ options: OPTIONS_TRI, valeur: tri, onChange: setTri }}
        filtres={
          <Facettes
            facettes={facettes}
            selection={priorite}
            etiquette="Filtrer par priorité"
            onSelectionner={setPriorite}
          />
        }
        resume={`${visibles.length} dossier(s) affiché(s) sur ${proprietes.dossiers.length}.`}
      />

      {visibles.length === 0 ? (
        <EtatVide
          titre="Aucun dossier ne correspond"
          explication="Élargissez la recherche ou choisissez une autre priorité."
          libelleAction="Tout réafficher"
          onAction={() => {
            setRecherche("");
            setPriorite(TOUTES);
          }}
        />
      ) : (
        <ul className="ui-grille-cartes">
          {visibles.map((dossier) => (
            <li key={dossier.id_signalement} style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e2 }}>
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
                {...(dossier.statut === "EN_COURS"
                  ? {
                      onCloturer: (id: string) => setClotureId((precedent) => (precedent === id ? null : id)),
                      clotureOuverte: clotureId === dossier.id_signalement,
                    }
                  : {
                      onDemarrer: proprietes.onDemarrer,
                      demarrageEnCours: proprietes.demarrageEnCours === dossier.id_signalement,
                    })}
              />

              {clotureId === dossier.id_signalement ? (
                <ClotureIntervention
                  dossier={dossier}
                  client={proprietes.client}
                  onMessage={proprietes.onMessage}
                  onFermer={() => setClotureId(null)}
                  onRecharge={proprietes.onRecharge}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}


