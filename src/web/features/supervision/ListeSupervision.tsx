import { useState, type ReactNode } from "react";
import { BarreListe } from "../../ui/BarreListe.tsx";
import { CarteSignalement } from "../../ui/CarteSignalement.tsx";
import { EtatVide } from "../../ui/EtatVide.tsx";
import { Facettes, type Facette } from "../../ui/Facettes.tsx";
import { ESPACEMENT } from "../../ui/jetons.ts";
import { compterPar, filtrerParTexte, trierPar } from "../../ui/liste.ts";
import type { SignalementApi } from "../../api/client.ts";

/**
 * Niveaux 2 et 3 de la file de tri : la file se cherche, se filtre et se trie ; chaque signalement
 * montre son état en icône + couleur + infobulle.
 *
 * L'ordre du serveur reste le tri par défaut : il porte « les plus urgents et les plus anciens
 * d'abord ». Les tris proposés sont des commodités de lecture, pas un recalcul de l'urgence.
 */
export interface ProprietesListeSupervision {
  readonly file: readonly SignalementApi[];
  readonly maintenantIso: string;
  readonly onOuvrir: (id: string) => void;
}

const TOUTES = "TOUTES";

const OPTIONS_TRI = [
  { valeur: "servi", libelle: "Urgence puis ancienneté" },
  { valeur: "recent", libelle: "Plus récents d'abord" },
  { valeur: "ancien", libelle: "Plus anciens d'abord" },
] as const;

export function ListeSupervision(proprietes: ProprietesListeSupervision): ReactNode {
  const [recherche, setRecherche] = useState("");
  const [tri, setTri] = useState<string>("servi");
  const [priorite, setPriorite] = useState<string>(TOUTES);

  const parPriorite = compterPar(proprietes.file, (dossier) => dossier.niveau_priorite);
  const facettes: readonly Facette[] = [
    { cle: TOUTES, libelle: "Toutes", nombre: proprietes.file.length },
    ...["URGENTE", "HAUTE", "NORMALE", "BASSE"].map((cle) => ({
      cle,
      libelle: cle.charAt(0) + cle.slice(1).toLowerCase(),
      nombre: parPriorite[cle] ?? 0,
    })),
  ];

  const filtres = filtrerParTexte(
    proprietes.file,
    recherche,
    (dossier) => [dossier.id_signalement, dossier.description ?? "", dossier.quartier_nom ?? dossier.id_quartier],
  ).filter((dossier) => priorite === TOUTES || dossier.niveau_priorite === priorite);

  const visibles =
    tri === "recent"
      ? trierPar(filtres, (dossier) => Date.parse(dossier.date_signalement), "descendant")
      : tri === "ancien"
        ? trierPar(filtres, (dossier) => Date.parse(dossier.date_signalement), "ascendant")
        : filtres;

  if (proprietes.file.length === 0) {
    return (
      <EtatVide
        titre="Aucun signalement à trier"
        explication="La file est vide : les nouveaux signalements apparaîtront ici."
      />
    );
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
      <BarreListe
        idRecherche="recherche-tri"
        libelleRecherche="Chercher dans la file de tri"
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
        resume={`${visibles.length} signalement(s) affiché(s) sur ${proprietes.file.length}.`}
      />

      {visibles.length === 0 ? (
        <EtatVide
          titre="Aucun signalement ne correspond"
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
                onOuvrir={proprietes.onOuvrir}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

