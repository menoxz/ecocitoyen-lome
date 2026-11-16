import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Icone } from "./Icone.tsx";
import { CLASSES } from "./jetons.ts";

/**
 * Pagination — niveau 2 de la hiérarchie de découverte : une liste longue se découpe.
 *
 * Trois informations, jamais une seule : le nombre de pages (où suis-je), les bornes affichées
 * (« 9–16 sur 23 »), et deux gestes bornés. Les numéros de page sont des boutons de 44 px : sur
 * un téléphone, une pagination en petits chiffres'est inutilisable.
 *
 * Le composant ne calcule rien : les nombres viennent de `liste.ts` et restent cohérents avec la
 * collection réellement reçue.
 */
export interface ProprietesPagination {
  readonly page: number;
  readonly pages: number;
  readonly debut: number;
  readonly fin: number;
  readonly total: number;
  readonly onPage: (page: number) => void;
  /** Nombre de numéros affichés autour de la page courante. */
  readonly fenetre?: number;
}

/** Numéros de page visibles : la fenêtre autour de la page courante, jamais les 40 pages. */
function numeros(page: number, pages: number, fenetre: number): readonly number[] {
  const largeur = fenetre * 2 + 1;
  const debut = Math.max(1, Math.min(page - fenetre, pages - largeur + 1));
  const fin = Math.min(pages, debut + largeur - 1);
  return Array.from({ length: Math.max(0, fin - debut + 1) }, (_, index) => debut + index);
}

export function Pagination(proprietes: ProprietesPagination): ReactNode {
  if (proprietes.pages <= 1) {
    return null;
  }
  const visibles = numeros(proprietes.page, proprietes.pages, proprietes.fenetre ?? 2);

  return (
    <nav className="ui-pagination" aria-label="Pagination de la liste">
      <p className="ui-pagination-bornes" aria-live="polite">
        {proprietes.debut}–{proprietes.fin} sur {proprietes.total}
      </p>

      <div className="ui-pagination-pages">
        <button
          type="button"
          className={[CLASSES.focusable, "ui-pagination-fleche"].join(" ")}
          aria-label="Page précédente"
          disabled={proprietes.page <= 1}
          onClick={() => proprietes.onPage(proprietes.page - 1)}
        >
          <Icone icone={ChevronLeft} taille={18} />
        </button>

        {visibles[0] !== undefined && visibles[0] > 1 ? <span className="ui-pagination-vide">…</span> : null}

        {visibles.map((numero) => (
          <button
            key={numero}
            type="button"
            className={[CLASSES.focusable, "ui-pagination-numero"].join(" ")}
            aria-current={numero === proprietes.page ? "page" : undefined}
            aria-label={`Page ${numero}`}
            onClick={() => proprietes.onPage(numero)}
          >
            {numero}
          </button>
        ))}

        {visibles[visibles.length - 1] !== undefined && (visibles[visibles.length - 1] ?? 0) < proprietes.pages ? (
          <span className="ui-pagination-vide">…</span>
        ) : null}

        <button
          type="button"
          className={[CLASSES.focusable, "ui-pagination-fleche"].join(" ")}
          aria-label="Page suivante"
          disabled={proprietes.page >= proprietes.pages}
          onClick={() => proprietes.onPage(proprietes.page + 1)}
        >
          <Icone icone={ChevronRight} taille={18} />
        </button>
      </div>
    </nav>
  );
}
