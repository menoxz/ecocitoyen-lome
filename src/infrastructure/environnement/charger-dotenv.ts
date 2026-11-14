import "dotenv/config";

/**
 * Chargement du fichier .env.
 *
 * Placé en infrastructure et non dans la composition root : `dotenv` est une dépendance
 * technique, et la couche interface n''a pas à en connaître l''existence. La validation des
 * variables, elle, reste dans `src/config` — charger n''est pas valider.
 */
export function chargerFichierEnv(): void {
  // L'import ci-dessus produit l'effet ; cette fonction existe pour rendre l'appel explicite.
}