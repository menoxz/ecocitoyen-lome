import type { ReactNode } from "react";
import { ESPACEMENT, RAYON, TAILLE_TEXTE } from "../../ui/jetons.ts";
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
      <h1 style={{ margin: 0, fontSize: TAILLE_TEXTE.xl, color: "inherit" }}>Recette vérifiable</h1>
      <p style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-texte-attenue)" }}>
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
              border: "1px solid var(--ui-bordure)",
              borderRadius: RAYON.md,
              backgroundColor: "var(--ui-surface)",
            }}
          >
            <div style={{ display: "flex", gap: ESPACEMENT.e2, alignItems: "baseline", flexWrap: "wrap" }}>
              <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-primaire)" }}>
                {preuve.code}
              </span>
              <span style={{ fontSize: TAILLE_TEXTE.md, color: "inherit" }}>{preuve.critere}</span>
            </div>
            <p style={{ margin: 0, fontSize: TAILLE_TEXTE.xs, color: "var(--ui-texte-attenue)" }}>
              {preuve.preuve}
            </p>
            <p style={{ margin: 0, fontSize: TAILLE_TEXTE.xs, color: "var(--ui-texte-attenue)", fontFamily: "monospace" }}>
              {preuve.fichier} — « {preuve.test} »
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
