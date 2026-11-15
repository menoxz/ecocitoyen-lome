import type { ReactNode } from "react";
import { ClipboardCheck, ListChecks } from "lucide-react";
import { EnTeteVue } from "../../ui/EnTeteVue.tsx";
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
      <EnTeteVue
        icone={ClipboardCheck}
        titre="Recette vérifiable"
        explication="Les critères ne sont pas déclarés ici : chacun renvoie au test qui le porte. Le résultat se lit en lançant bun test, pas sur cette page."
        chiffres={[
          {
            icone: ListChecks,
            valeur: String(PREUVES_RECETTE.length),
            libelle: "critère(s) rattaché(s) à un test",
            aide: "Chaque critère porte le nom du test qui le vérifie, exécuté par bun test.",
          },
        ]}
      />

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
