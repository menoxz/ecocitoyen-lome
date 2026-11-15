import type { ReactNode } from "react";
import { ClipboardCheck, ListChecks } from "lucide-react";
import { EnTeteVue } from "../../ui/EnTeteVue.tsx";
import { ESPACEMENT } from "../../ui/jetons.ts";
import { PREUVES_RECETTE } from "../../recette/preuves.ts";
import { ListeRecette } from "./ListeRecette.tsx";

/**
 * Recette affichable, sans verdict inventé.
 *
 * L'ancien écran listait quatorze statuts « PASSED » écrits à la main et un bandeau « 100 % » :
 * rien n'était exécuté. Ici, chaque critère renvoie au test nommé qui le porte ; c'est
 * `tests/recette/preuves.test.ts` qui vérifie que ce fichier existe, et `bun test` qui dit si le
 * test passe. Cet écran ne peut pas connaître le résultat d'une exécution : il n'affiche donc
 * ni pourcentage ni statut.
 *
 * Les critères sont une collection : ils suivent donc la même hiérarchie de découverte que les
 * autres pages — donnée globale (nombre de critères), liste cherchable, filtrable et triable,
 * état en puces, preuve détaillée au clic.
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

      <ListeRecette />
    </section>
  );
}
