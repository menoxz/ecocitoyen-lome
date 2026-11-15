import { useState, type ReactNode } from "react";
import { CircleHelp, Gauge, Info } from "lucide-react";
import { BarreListe } from "../../ui/BarreListe.tsx";
import { Bouton } from "../../ui/Bouton.tsx";
import { EtatVide } from "../../ui/EtatVide.tsx";
import { Facettes, type Facette } from "../../ui/Facettes.tsx";
import { Modale } from "../../ui/Modale.tsx";
import { Pagination } from "../../ui/Pagination.tsx";
import { PucesEtat, type PuceEtat } from "../../ui/PucesEtat.tsx";
import { ESPACEMENT, RAYON, TAILLE_TEXTE } from "../../ui/jetons.ts";
import { bornesPage, compterPar, filtrerParTexte, nombreDePages, paginer, trierPar } from "../../ui/liste.ts";
import type { LigneIndicateur } from "./logique.ts";

/**
 * Niveaux 2 à 4 des indicateurs : dix lignes sont une collection.
 *
 * Le détail — ce que l'indicateur mesure — s'ouvre dans une modale, pas sous la ligne : la fiche
 * prend le focus, la liste reste intacte derrière. La disposition suit la règle écrite dans
 * `docs/design/DESIGN.md` : objets courts en grille de deux colonnes au-delà de 1100 px.
 */
const TOUTES = "TOUTES";

const OPTIONS_TRI = [
  { valeur: "service", libelle: "Ordre du service" },
  { valeur: "libelle", libelle: "Intitulé (A → Z)" },
  { valeur: "valeur", libelle: "Valeur décroissante" },
] as const;

/** Valeur numérique d'une ligne, pour le tri ; `null` quand la valeur n'est pas un nombre. */
function nombreDe(valeur: string): number | null {
  const propre = valeur.replace(",", ".").replace(/[^\d.]/g, "");
  const nombre = Number.parseFloat(propre);
  return Number.isFinite(nombre) ? nombre : null;
}

export interface ProprietesListeIndicateurs {
  readonly lignes: readonly LigneIndicateur[];
}

export function ListeIndicateurs(proprietes: ProprietesListeIndicateurs): ReactNode {
  const [recherche, setRecherche] = useState("");
  const [tri, setTri] = useState<string>("service");
  const [mesure, setMesure] = useState<string>(TOUTES);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<LigneIndicateur | null>(null);

  const parMesure = compterPar(proprietes.lignes, (ligne) => (ligne.mesurable ? "MESURABLE" : "NON_MESURABLE"));
  const facettes: readonly Facette[] = [
    { cle: TOUTES, libelle: "Toutes", nombre: proprietes.lignes.length },
    { cle: "MESURABLE", libelle: "Mesurables", nombre: parMesure.MESURABLE ?? 0 },
    { cle: "NON_MESURABLE", libelle: "Non mesurables", nombre: parMesure.NON_MESURABLE ?? 0 },
  ];

  const filtrees = filtrerParTexte(proprietes.lignes, recherche, (ligne) => [ligne.libelle, ligne.valeur, ligne.definition])
    .filter((ligne) => (mesure === TOUTES ? true : mesure === "MESURABLE" ? ligne.mesurable : !ligne.mesurable));

  const visibles =
    tri === "libelle"
      ? trierPar(filtrees, (ligne) => ligne.libelle)
      : tri === "valeur"
        ? trierPar(filtrees, (ligne) => {
            const nombre = nombreDe(ligne.valeur);
            return nombre === null ? -1 : nombre;
          }, "descendant")
        : filtrees;

  const pages = nombreDePages(visibles.length);
  const courante = Math.min(page, pages);
  const bornes = bornesPage(courante, visibles.length);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
      <BarreListe
        idRecherche="recherche-indicateur"
        libelleRecherche="Chercher un indicateur"
        exempleRecherche="Délai, rejet, résolution, non mesurable…"
        recherche={recherche}
        onRecherche={(valeur) => {
          setRecherche(valeur);
          setPage(1);
        }}
        tri={{ options: OPTIONS_TRI, valeur: tri, onChange: setTri }}
        filtres={<Facettes facettes={facettes} selection={mesure} etiquette="Filtrer par mesurabilité" onSelectionner={(cle) => { setMesure(cle); setPage(1); }} />}
        resume={`${visibles.length} indicateur(s) affiché(s) sur ${proprietes.lignes.length}.`}
      />

      {visibles.length === 0 ? (
        <EtatVide
          titre="Aucun indicateur ne correspond"
          explication="Élargissez la recherche ou affichez toutes les lignes."
          libelleAction="Tout réafficher"
          onAction={() => {
            setRecherche("");
            setMesure(TOUTES);
            setPage(1);
          }}
        />
      ) : (
        <>
          <ul className="ui-grille-objets">
            {paginer(visibles, courante).map((ligne) => {
              const puces: PuceEtat[] = [
                {
                  icone: ligne.mesurable ? Gauge : CircleHelp,
                  libelle: ligne.valeur,
                  ton: ligne.mesurable ? "succes" : "alerte",
                  aide: ligne.mesurable
                    ? "Valeur calculée par le serveur sur la période."
                    : "Indicateur non calculable sur la période : aucune valeur de repli n'est affichée.",
                },
              ];

              return (
                <li
                  key={ligne.libelle}
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
                  <span style={{ fontSize: TAILLE_TEXTE.md, fontWeight: 600, color: "inherit" }}>{ligne.libelle}</span>
                  <PucesEtat puces={puces} etiquette={`Valeur de ${ligne.libelle}`} />
                  <Bouton variante="texte" taille="sm" onClick={() => setDetail(ligne)}>
                    Ce que cet indicateur mesure
                  </Bouton>
                </li>
              );
            })}
          </ul>

          <Pagination
            page={courante}
            pages={pages}
            debut={bornes.debut}
            fin={bornes.fin}
            total={visibles.length}
            onPage={setPage}
          />
        </>
      )}

      <Modale ouverte={detail !== null} titre={detail ? detail.libelle : ""} onFermer={() => setDetail(null)}>
        <p style={{ margin: 0, display: "flex", alignItems: "flex-start", gap: 8, fontSize: TAILLE_TEXTE.md, color: "var(--ui-texte)" }}>
          <Info size={18} aria-hidden="true" style={{ flex: "0 0 auto", marginTop: 3, color: "var(--ui-accent)" }} />
          <span>{detail ? detail.definition : ""}</span>
        </p>
        <p style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-texte-attenue)" }}>
          {detail && detail.mesurable
            ? `Valeur servie par le serveur : ${detail.valeur}.`
            : "La valeur n'est pas mesurable sur la période : le motif figure dans la section « Indicateurs non mesurables »."}
        </p>
      </Modale>
    </section>
  );
}
