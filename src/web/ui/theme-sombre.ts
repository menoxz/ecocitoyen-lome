/**
 * Choix de thème : automatique (système), clair ou sombre.
 *
 * Le choix est un confort d'affichage, pas une donnée de session : il se garde localement. Aucun
 * jeton, aucune identité n'est stocké ici — la session reste le cookie `httpOnly` du serveur.
 */
export type ChoixTheme = "auto" | "clair" | "sombre";

export const CLE_THEME = "eco-theme";
export const ATTRIBUT_THEME = "data-theme";

const VALEURS: readonly ChoixTheme[] = ["auto", "clair", "sombre"];

/** Valeur relue du stockage : tout ce qui n'est pas reconnu retombe sur l'automatique. */
export function choixDepuis(valeur: string | null | undefined): ChoixTheme {
  return valeur === "clair" || valeur === "sombre" ? valeur : "auto";
}

/** Ordre de cycle du sélecteur : auto → clair → sombre → auto. */
export function choixSuivant(choix: ChoixTheme): ChoixTheme {
  const rang = VALEURS.indexOf(choix);
  return VALEURS[(rang + 1) % VALEURS.length];
}

/**
 * Valeur de l'attribut `data-theme` : `null` en automatique, pour laisser la feuille suivre
 * `prefers-color-scheme`. Forcer « auto » ne doit jamais figer un thème.
 */
export function attributTheme(choix: ChoixTheme): string | null {
  return choix === "auto" ? null : choix;
}

export function libelleTheme(choix: ChoixTheme): string {
  if (choix === "clair") {
    return "Clair";
  }
  if (choix === "sombre") {
    return "Sombre";
  }
  return "Auto";
}
