# AGENTS.md — tests

## Rôle
Prouver. Ce dossier contient ce qui ne peut pas être colocalisé : HTTP réel et recette.

## Organisation
| Dossier | Contenu | Outil |
|---|---|---|
| `api/` | routes, middlewares, RBAC, transitions, zone, uploads — sur base SQLite temporaire recréée par test | vitest + supertest |
| `recette/` | un fichier par critère du CDC : `CR01.cas.test.ts` … `CR14.cas.test.ts` | vitest |
| `e2e/` | parcours nominal §12.1 rejoué de bout en bout | vitest |

Les tests de règles pures restent colocalisés dans `src/domaine/**/*.test.ts` : ce dossier ne les accueille pas.

## Règles
- Un test nomme la règle qu'il protège : `describe('T5 En cours → Résolu')`, pas `describe('resolve')`.
- Toute transition et tout droit testés en **autorisé et refusé**.
- Dépendances non déterministes injectées : `Horloge` fixe, `Identifiants` séquentiels. Aucun test ne dépend de l'heure réelle.
- Aucun test ne dépend de l'ordre d'exécution ni d'un état partagé : chaque fichier crée et détruit son contexte.
- Interdit : un test qui assouplit une assertion pour passer ; un `skip` sans ticket et sans date de réexamen ; un test qui appelle une fonction interne non exportée.
- La vue « recette » de l'interface lit un rapport d'exécution produit ici ; elle n'invente aucun statut.

## Vérification
`bun run test` exit 0. Un critère de recette non couvert est un critère non livré.