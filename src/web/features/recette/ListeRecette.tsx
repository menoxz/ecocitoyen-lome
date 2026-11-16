import { useState, type ReactNode } from "react";
import { FileCode2, FlaskConical, Hash } from "lucide-react";
import { BarreListe } from "../../ui/BarreListe.tsx";
import { Bouton } from "../../ui/Bouton.tsx";
import { EtatVide } from "../../ui/EtatVide.tsx";
import { Facettes, type Facette } from "../../ui/Facettes.tsx";
import { Modale } from "../../ui/Modale.tsx";
import { Pagination } from "../../ui/Pagination.tsx";
import { PucesEtat, type PuceEtat } from "../../ui/PucesEtat.tsx";
import { ESPACEMENT, RAYON, TAILLE_TEXTE } from "../../ui/jetons.ts";
import { bornesPage, compterPar, filtrerParTexte, nombreDePages, paginer, trierPar } from "../../ui/liste.ts";
import { PREUVES_RECETTE, type PreuveRecette } from "../../recette/preuves.ts";

/**
 * Niveaux 2 à 4 de la recette : les critères sont une collection.
 *
 * Chaque critère porte son état en puces — code, fichier de test, test nommé — avec icône et
 * infobulle. La preuve s'ouvre dans une modale : elle prend le focus au lieu d'allonger la liste.
 * Aucune puce ne dit « vérifié » : cet écran ne connaît pas le résultat de `bun test`, et une
 * couleur verte affichée sans exécution serait le mensonge du prototype.
 */
const TOUS = "TOUS";

const OPTIONS_TRI = [
  { valeur: "recette", libelle: "Ordre de la recette" },
  { valeur: "fichier", libelle: "Fichier de test" },
  { valeur: "critere", libelle: "Critère (A → Z)" },
] as const;

/** Domaine = segment de dossier du fichier de test : `tests/api/x.test.ts` → `api`. */
function domaineDeTest(fichier: string): string {
  const segments = fichier.split("/");
  return segments.length > 2 ? segments[1] : "autre";
}

export function ListeRecette(): ReactNode {
  const [recherche, setRecherche] = useState("");
  const [tri, setTri] = useState<string>("recette");
  const [domaine, setDomaine] = useState<string>(TOUS);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<PreuveRecette | null>(null);

  const parDomaine = compterPar(PREUVES_RECETTE, (preuve) => domaineDeTest(preuve.fichier));
  const domaines = Object.keys(parDomaine).sort((a, b) => a.localeCompare(b, "fr"));
  const facettes: readonly Facette[] = [
    { cle: TOUS, libelle: "Toutes", nombre: PREUVES_RECETTE.length },
    ...domaines.map((cle) => ({ cle, libelle: cle, nombre: parDomaine[cle] ?? 0 })),
  ];

  const filtres = filtrerParTexte(PREUVES_RECETTE, recherche, (preuve) => [
    preuve.code,
    preuve.critere,
    preuve.fichier,
    preuve.test,
    preuve.preuve,
  ]).filter((preuve) => domaine === TOUS || domaineDeTest(preuve.fichier) === domaine);

  const visibles =
    tri === "fichier"
      ? trierPar(filtres, (preuve) => `${preuve.fichier} ${preuve.code}`)
      : tri === "critere"
        ? trierPar(filtres, (preuve) => preuve.critere)
        : filtres;

  const pages = nombreDePages(visibles.length);
  const courante = Math.min(page, pages);
  const bornes = bornesPage(courante, visibles.length);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
      <BarreListe
        idRecherche="recherche-recette"
        libelleRecherche="Chercher un critère de recette"
        exempleRecherche="CR5, validation, signalements.test.ts, 403…"
        recherche={recherche}
        onRecherche={(valeur) => { setRecherche(valeur); setPage(1); }}
        tri={{ options: OPTIONS_TRI, valeur: tri, onChange: setTri }}
        filtres={<Facettes facettes={facettes} selection={domaine} etiquette="Filtrer par domaine de test" onSelectionner={(cle) => { setDomaine(cle); setPage(1); }} />}
        resume={`${visibles.length} critère(s) affiché(s) sur ${PREUVES_RECETTE.length}.`}
      />

      {visibles.length === 0 ? (
        <EtatVide
          titre="Aucun critère ne correspond"
          explication="Élargissez la recherche ou choisissez un autre domaine de test."
          libelleAction="Tout réafficher"
          onAction={() => {
            setRecherche("");
            setDomaine(TOUS);
            setPage(1);
          }}
        />
      ) : (
        <>
          <ul className="ui-grille-objets">
            {paginer(visibles, courante).map((preuve) => {
              const puces: PuceEtat[] = [
                { icone: Hash, libelle: preuve.code, ton: "info", aide: "Code du critère, repris dans les tests et le cahier des charges." },
                {
                  icone: FileCode2,
                  libelle: preuve.fichier,
                  ton: "neutre",
                  aide: "Fichier de test qui porte ce critère ; son existence est vérifiée par preuves.test.ts.",
                },
                { icone: FlaskConical, libelle: "test nommé", ton: "neutre", aide: "Le libellé exact du test figure dans la preuve, ouverte au clic." },
              ];

              return (
                <li
                  key={preuve.code}
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
                  <span style={{ fontSize: TAILLE_TEXTE.md, fontWeight: 600, color: "inherit" }}>{preuve.critere}</span>
                  <PucesEtat puces={puces} etiquette={`Critère ${preuve.code}`} />
                  <Bouton variante="texte" taille="sm" onClick={() => setDetail(preuve)}>
                    Voir la preuve
                  </Bouton>
                </li>
              );
            })}
          </ul>

          <Pagination page={courante} pages={pages} debut={bornes.debut} fin={bornes.fin} total={visibles.length} onPage={setPage} />
        </>
      )}

      <Modale ouverte={detail !== null} titre={detail ? `${detail.code} — ${detail.critere}` : ""} onFermer={() => setDetail(null)}>
        <p style={{ margin: 0, fontSize: TAILLE_TEXTE.md, color: "var(--ui-texte)" }}>
          {detail ? detail.preuve : ""}
        </p>
        <p style={{ margin: 0, fontSize: TAILLE_TEXTE.xs, color: "var(--ui-texte-attenue)", fontFamily: "monospace" }}>
          {detail ? `${detail.fichier} — « ${detail.test} »` : ""}
        </p>
        <p style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-texte-attenue)" }}>
          Le résultat se lit en lançant bun test : cette page ne peut pas connaître l'exécution.
        </p>
      </Modale>
    </section>
  );
}
