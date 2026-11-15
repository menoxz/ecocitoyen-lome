/**
 * Tri et filtrage d'une liste déjà chargée — niveau 2 de la hiérarchie de découverte.
 *
 * Ces fonctions ne décident rien : elles ordonnent et restreignent ce que le serveur a renvoyé.
 * Aucune valeur n'est fabriquée ici, aucune règle métier (statut, priorité, délai) n'est rejouée :
 * le domaine décide, la vue présente.
 */
export type SensTri = "ascendant" | "descendant";

/** Minuscules sans accents : « Amoutivé » doit se trouver en tapant « amoutive ». */
export function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Recherche insensible à la casse et aux accents ; un terme vide ne restreint rien. */
export function correspond(texte: string, terme: string): boolean {
  const cherche = normaliser(terme);
  if (cherche.length === 0) {
    return true;
  }
  return normaliser(texte).includes(cherche);
}

export function filtrerParTexte<T>(
  elements: readonly T[],
  terme: string,
  champs: (element: T) => readonly string[],
): readonly T[] {
  if (terme.trim().length === 0) {
    return elements;
  }
  return elements.filter((element) =>
    champs(element).some((champ) => correspond(champ ?? "", terme)),
  );
}

/** Compte par valeur de clé — étiquette les filtres sans tenir un second compteur à la main. */
export function compterPar<T>(
  elements: readonly T[],
  cle: (element: T) => string,
): Readonly<Record<string, number>> {
  const comptes: Record<string, number> = {};
  for (const element of elements) {
    const valeur = cle(element);
    comptes[valeur] = (comptes[valeur] ?? 0) + 1;
  }
  return comptes;
}

/**
 * Tri stable : à valeurs égales, l'ordre servi par le serveur est conservé. C'est ce qui permet
 * d'offrir « tri par défaut » sans que la liste saute au premier tri secondaire.
 */
export function trierPar<T>(
  elements: readonly T[],
  valeur: (element: T) => number | string,
  sens: SensTri = "ascendant",
): readonly T[] {
  const facteur = sens === "ascendant" ? 1 : -1;
  return [...elements].sort((a, b) => {
    const va = valeur(a);
    const vb = valeur(b);
    if (typeof va === "number" && typeof vb === "number") {
      return (va - vb) * facteur;
    }
    return String(va).localeCompare(String(vb), "fr") * facteur;
  });
}

/** Pages : taille par défaut d'une liste d'objets de service. */
export const TAILLE_PAGE = 8;

/**
 * Pagination d'une liste côté affichage : on ne rend qu'une page, mais le total reste celui de la
 * collection reçue. La page demandée est ramenée dans les bornes — une recherche qui réduit la
 * liste ne doit pas laisser l'utilisateur sur une page vide.
 */
export function paginer<T>(elements: readonly T[], page: number, taille: number = TAILLE_PAGE): readonly T[] {
  const bornee = Math.max(1, Math.min(page, nombreDePages(elements.length, taille)));
  const debut = (bornee - 1) * taille;
  return elements.slice(debut, debut + taille);
}

export function nombreDePages(total: number, taille: number = TAILLE_PAGE): number {
  return Math.max(1, Math.ceil(total / taille));
}

/** Bornes affichables : « 9–16 sur 23 ». */
export function bornesPage(page: number, total: number, taille: number = TAILLE_PAGE): { debut: number; fin: number } {
  if (total === 0) {
    return { debut: 0, fin: 0 };
  }
  const bornee = Math.max(1, Math.min(page, nombreDePages(total, taille)));
  const debut = (bornee - 1) * taille + 1;
  return { debut, fin: Math.min(total, debut + taille - 1) };
}
