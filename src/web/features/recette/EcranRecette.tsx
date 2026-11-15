import type { ReactNode } from "react";
import { COULEURS, ESPACEMENT, RAYON, TAILLE_TEXTE } from "../../ui/jetons.ts";
import { PREUVES_RECETTE } from "../../recette/preuves.ts";

/**
 * Recette affichable, sans verdict inventé.
 *
 * L'ancien écran listait quatorze statuts « PASSED » écrits à la main et un bandeau « 100 % » :
 * rien n'était exécuté. Ici, chaque critère renvoie au test nommé qui le porte ; c'est
 * `tests/recette/preuves.test.ts` qui vérifie que ce fichier existe, et `bun test` qui dit si le
 * test passe. Cet écran ne peut pas connaître le résultat d'une exécution : il n'affiche donc
 * ni pourcentage ni statut.
 */
export function EcranRecette(): ReactNode {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
      <h1 style={{ margin: 0, fontSize: TAILLE_TEXTE.xl, color: COULEURS.texte }}>Recette vérifiable</h1>
      <p style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: COULEURS.texteAttenue }}>
        Les {PREUVES_RECETTE.length} critères de recette ne sont pas déclarés ici. Chacun renvoie au
        test qui le porte : le résultat se lit en lançant <code>bun test</code>, pas sur cette page.
      </p>

      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: ESPACEMENT.e2 }}>
        {PREUVES_RECETTE.map((preuve) => (
          <li
            key={preuve.code}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: ESPACEMENT.e1,
              padding: ESPACEMENT.e3,
              border: `1px solid ${COULEURS.bordure}`,
              borderRadius: RAYON.md,
              backgroundColor: COULEURS.surface,
            }}
          >
            <div style={{ display: "flex", gap: ESPACEMENT.e2, alignItems: "baseline", flexWrap: "wrap" }}>
              <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: TAILLE_TEXTE.sm, color: COULEURS.primaire }}>
                {preuve.code}
              </span>
              <span style={{ fontSize: TAILLE_TEXTE.md, color: COULEURS.texte }}>{preuve.critere}</span>
            </div>
            <p style={{ margin: 0, fontSize: TAILLE_TEXTE.xs, color: COULEURS.texteAttenue }}>
              {preuve.preuve}
            </p>
            <p style={{ margin: 0, fontSize: TAILLE_TEXTE.xs, color: COULEURS.texteAttenue, fontFamily: "monospace" }}>
              {preuve.fichier} — « {preuve.test} »
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
