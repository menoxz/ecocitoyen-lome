import { useState, type ReactNode } from "react";
import { CalendarClock, CircleDot, MessageSquare } from "lucide-react";
import { BarreListe } from "../../ui/BarreListe.tsx";
import { EtatVide } from "../../ui/EtatVide.tsx";
import { Facettes, type Facette } from "../../ui/Facettes.tsx";
import { PucesEtat, type PuceEtat } from "../../ui/PucesEtat.tsx";
import { ESPACEMENT, RAYON, TAILLE_TEXTE } from "../../ui/jetons.ts";
import { compterPar, filtrerParTexte, trierPar } from "../../ui/liste.ts";
import type { EtapeHistoriqueApi } from "../../api/client.ts";
import { libelleStatut, type EtapeLisible } from "./logique.ts";

/**
 * Niveaux 2, 3 et 4 de l'historique d'un dossier : les décisions du service sont une collection.
 *
 * Le citoyen peut chercher dans ses étapes, les trier, et filtrer par décision reçue. Chaque étape
 * porte son état en puces (statut atteint, date, commentaire présent) avec infobulle ; le texte
 * complet du commentaire s'ouvre au clic, pour ne pas écraser la ligne quand il est long.
 */
const TOUTES = "TOUTES";

const OPTIONS_TRI = [
  { valeur: "chrono", libelle: "Dans l ordre du service" },
  { valeur: "inverse", libelle: "De la plus récente" },
  { valeur: "statut", libelle: "Par décision" },
] as const;

export interface ProprietesListeHistorique {
  readonly etapes: readonly EtapeHistoriqueApi[];
  readonly lisibles: readonly EtapeLisible[];
}

export function ListeHistorique(proprietes: ProprietesListeHistorique): ReactNode {
  const [recherche, setRecherche] = useState("");
  const [tri, setTri] = useState<string>("chrono");
  const [statut, setStatut] = useState<string>(TOUTES);

  const etapes = proprietes.etapes.map((etape, index) => ({
    ...etape,
    lisible: proprietes.lisibles[index] ?? { titre: etape.nouveau_statut, detail: "", date: etape.date_changement },
  }));

  const parStatut = compterPar(etapes, (etape) => etape.nouveau_statut);
  const facettes: readonly Facette[] = [
    { cle: TOUTES, libelle: "Toutes", nombre: etapes.length },
    ...Object.keys(parStatut)
      .sort()
      .map((cle) => ({ cle, libelle: libelleStatut(cle), nombre: parStatut[cle] ?? 0 })),
  ];

  const filtrees = filtrerParTexte(etapes, recherche, (etape) => [
    etape.lisible.titre,
    etape.lisible.detail,
    etape.lisible.date,
    libelleStatut(etape.nouveau_statut),
  ]).filter((etape) => statut === TOUTES || etape.nouveau_statut === statut);

  const visibles = tri === "inverse" ? trierPar(filtrees, (etape) => indexDe(filtrees, etape), "descendant") : tri === "statut" ? trierPar(filtrees, (etape) => libelleStatut(etape.nouveau_statut)) : filtrees;

  if (etapes.length === 0) {
    return <p style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-texte-attenue)" }}>Aucune étape enregistrée pour l instant.</p>;
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
      <BarreListe
        idRecherche="recherche-historique"
        libelleRecherche="Chercher dans les décisions du service"
        exempleRecherche="Décision, date, commentaire…"
        recherche={recherche}
        onRecherche={setRecherche}
        tri={{ options: OPTIONS_TRI, valeur: tri, onChange: setTri }}
        filtres={<Facettes facettes={facettes} selection={statut} etiquette="Filtrer par décision" onSelectionner={setStatut} />}
        resume={`${visibles.length} décision(s) affichée(s) sur ${etapes.length}.`}
      />

      {visibles.length === 0 ? (
        <EtatVide
          titre="Aucune décision ne correspond"
          explication="Élargissez la recherche ou affichez toutes les décisions."
          libelleAction="Tout réafficher"
          onAction={() => {
            setRecherche("");
            setStatut(TOUTES);
          }}
        />
      ) : (
        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: ESPACEMENT.e2 }}>
          {visibles.map((etape, rang) => {
            const puces: PuceEtat[] = [
              {
                icone: CircleDot,
                libelle: libelleStatut(etape.nouveau_statut),
                ton: "statut",
                aide: "Décision enregistrée par le service pour ce dossier.",
              },
              {
                icone: CalendarClock,
                libelle: etape.lisible.date.slice(0, 16).replace("T", " "),
                ton: "neutre",
                aide: "Date et heure d enregistrement de la décision.",
              },
              ...(etape.commentaire
                ? [{ icone: MessageSquare, libelle: "motif", ton: "info" as const, aide: "Un commentaire accompagne cette décision ; le texte complet est dans le détail." }]
                : []),
            ];

            return (
              <li
                key={`${etape.date_changement}-${rang}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: ESPACEMENT.e2,
                  padding: ESPACEMENT.e3,
                  border: "1px solid var(--ui-bordure)",
                  borderRadius: RAYON.md,
                  backgroundColor: "var(--ui-surface)",
                }}
              >
                <span style={{ fontSize: TAILLE_TEXTE.md, fontWeight: 600, color: "inherit" }}>{etape.lisible.titre}</span>
                <PucesEtat puces={puces} etiquette={`État de la décision ${rang + 1}`} />
                <details>
                  <summary
                    style={{
                      minHeight: 44,
                      display: "flex",
                      alignItems: "center",
                      cursor: "pointer",
                      fontSize: TAILLE_TEXTE.sm,
                      color: "var(--ui-primaire)",
                    }}
                  >
                    Voir le détail
                  </summary>
                  <p style={{ margin: 0, paddingTop: ESPACEMENT.e1, fontSize: TAILLE_TEXTE.xs, color: "var(--ui-texte-attenue)" }}>
                    {etape.commentaire ?? "Aucun commentaire n a été joint à cette décision."}
                  </p>
                </details>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

/** Rang d'une étape dans la liste reçue : sert au tri antéchronologique sans horloge implicite. */
function indexDe(liste: readonly { date_changement: string }[], etape: { date_changement: string }): number {
  return liste.findIndex((element) => element.date_changement === etape.date_changement);
}
