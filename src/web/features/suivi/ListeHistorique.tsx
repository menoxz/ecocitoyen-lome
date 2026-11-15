import { useState, type ReactNode } from "react";
import { CalendarClock, CircleDot, MessageSquare } from "lucide-react";
import { BarreListe } from "../../ui/BarreListe.tsx";
import { Bouton } from "../../ui/Bouton.tsx";
import { EtatVide } from "../../ui/EtatVide.tsx";
import { Facettes, type Facette } from "../../ui/Facettes.tsx";
import { Modale } from "../../ui/Modale.tsx";
import { Pagination } from "../../ui/Pagination.tsx";
import { PucesEtat, type PuceEtat } from "../../ui/PucesEtat.tsx";
import { ESPACEMENT, RAYON, TAILLE_TEXTE } from "../../ui/jetons.ts";
import { bornesPage, compterPar, filtrerParTexte, nombreDePages, paginer, trierPar } from "../../ui/liste.ts";
import type { EtapeHistoriqueApi } from "../../api/client.ts";
import { libelleStatut, type EtapeLisible } from "./logique.ts";

/**
 * Niveaux 2 à 4 de l'historique d'un dossier.
 *
 * Les décisions sont une collection : on les cherche, on les trie, on filtre par décision reçue.
 * Le commentaire complet s'ouvre dans une modale — le lire est un moment de concentration, pas une
 * ligne de plus dans une liste. Disposition en une colonne : chaque décision porte un titre, des
 * puces et un texte, trop dense pour une grille.
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
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<(typeof etapesAvecLisible)[number] | null>(null);

  const etapesAvecLisible = proprietes.etapes.map((etape, index) => ({
    ...etape,
    rang: index,
    lisible: proprietes.lisibles[index] ?? { titre: etape.nouveau_statut, detail: "", date: etape.date_changement },
  }));

  const parStatut = compterPar(etapesAvecLisible, (etape) => etape.nouveau_statut);
  const facettes: readonly Facette[] = [
    { cle: TOUTES, libelle: "Toutes", nombre: etapesAvecLisible.length },
    ...Object.keys(parStatut)
      .sort()
      .map((cle) => ({ cle, libelle: libelleStatut(cle), nombre: parStatut[cle] ?? 0 })),
  ];

  const filtrees = filtrerParTexte(etapesAvecLisible, recherche, (etape) => [
    etape.lisible.titre,
    etape.lisible.detail,
    etape.lisible.date,
    libelleStatut(etape.nouveau_statut),
  ]).filter((etape) => statut === TOUTES || etape.nouveau_statut === statut);

  const visibles =
    tri === "inverse"
      ? trierPar(filtrees, (etape) => etape.rang, "descendant")
      : tri === "statut"
        ? trierPar(filtrees, (etape) => libelleStatut(etape.nouveau_statut))
        : filtrees;

  if (etapesAvecLisible.length === 0) {
    return (
      <p style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-texte-attenue)" }}>
        Aucune étape enregistrée pour l instant.
      </p>
    );
  }

  const pages = nombreDePages(visibles.length);
  const courante = Math.min(page, pages);
  const bornes = bornesPage(courante, visibles.length);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
      <BarreListe
        idRecherche="recherche-historique"
        libelleRecherche="Chercher dans les décisions du service"
        exempleRecherche="Décision, date, commentaire…"
        recherche={recherche}
        onRecherche={(valeur) => { setRecherche(valeur); setPage(1); }}
        tri={{ options: OPTIONS_TRI, valeur: tri, onChange: setTri }}
        filtres={<Facettes facettes={facettes} selection={statut} etiquette="Filtrer par décision" onSelectionner={(cle) => { setStatut(cle); setPage(1); }} />}
        resume={`${visibles.length} décision(s) affichée(s) sur ${etapesAvecLisible.length}.`}
      />

      {visibles.length === 0 ? (
        <EtatVide
          titre="Aucune décision ne correspond"
          explication="Élargissez la recherche ou affichez toutes les décisions."
          libelleAction="Tout réafficher"
          onAction={() => {
            setRecherche("");
            setStatut(TOUTES);
            setPage(1);
          }}
        />
      ) : (
        <>
          <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: ESPACEMENT.e2 }}>
            {paginer(visibles, courante).map((etape) => {
              const puces: PuceEtat[] = [
                { icone: CircleDot, libelle: libelleStatut(etape.nouveau_statut), ton: "statut", aide: "Décision enregistrée par le service pour ce dossier." },
                {
                  icone: CalendarClock,
                  libelle: etape.lisible.date.slice(0, 16).replace("T", " "),
                  ton: "neutre",
                  aide: "Date et heure d enregistrement de la décision.",
                },
                ...(etape.commentaire
                  ? [{ icone: MessageSquare, libelle: "motif", ton: "info" as const, aide: "Un commentaire accompagne cette décision ; il s ouvre au clic." }]
                  : []),
              ];

              return (
                <li
                  key={`${etape.date_changement}-${etape.rang}`}
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
                  <PucesEtat puces={puces} etiquette={`État de la décision ${etape.rang + 1}`} />
                  <Bouton variante="texte" taille="sm" onClick={() => setDetail(etape)}>
                    Voir le détail
                  </Bouton>
                </li>
              );
            })}
          </ol>

          <Pagination page={courante} pages={pages} debut={bornes.debut} fin={bornes.fin} total={visibles.length} onPage={setPage} />
        </>
      )}

      <Modale ouverte={detail !== null} titre={detail ? detail.lisible.titre : ""} onFermer={() => setDetail(null)}>
        <p style={{ margin: 0, fontSize: TAILLE_TEXTE.md, color: "var(--ui-texte)" }}>
          {detail && detail.commentaire ? detail.commentaire : "Aucun commentaire n a été joint à cette décision."}
        </p>
        <p style={{ margin: 0, fontSize: TAILLE_TEXTE.xs, color: "var(--ui-texte-attenue)" }}>
          {detail ? `Enregistrée le ${detail.lisible.date.slice(0, 16).replace("T", " ")}.` : ""}
        </p>
      </Modale>
    </section>
  );
}
