# ADR-010 — Exécuteur de tests : `bun test`, aucun runner supplémentaire

**Statut** : Accepté — 14/11/2026
**Remplace partiellement** : ADR-009 (les trois niveaux restent ; seul l''outil change).

## Contexte

ADR-009 a fixé trois niveaux de tests et a nommé vitest + supertest comme outils, sans contrainte imposée de l''extérieur. À l''ouverture de la phase P0, la contrainte réelle apparaît : le projet tourne sur Vite 8, sorti après la matrice de compatibilité des runners externes. Ajouter vitest, c''est importer une chaîne (vite ↔ vitest ↔ types) dont la compatibilité n''est pas garantie, pour un besoin qui est de lancer des fichiers TypeScript avec des assertions.

Bun 1.4.2 est déjà l''exécuteur du projet : il charge TypeScript nativement, résout `paths` du `tsconfig.json` (donc les alias `@domaine/*`), et `bun test` est intégré.

## Décision

- Exécuteur : **`bun test`**, aucune dépendance de test ajoutée (`bun:test` fournit `describe`, `test`, `expect`, `mock`, `beforeEach`).
- Les tests HTTP de phase P3 démarrent l''application sur un port éphémère et l''attaquent par `fetch` : pas de `supertest`.
- Les types viennent de `@types/bun` (déjà nécessaire pour que `tsc --noEmit` résolve `bun:test`).
- Les trois niveaux, les règles de nommage et les interdits d''ADR-009 sont **inchangés**.

## Conséquences

**Bénéfices**
- Zéro dépendance de test, zéro matrice de compatibilité avec Vite 8.
- Les alias du `tsconfig.json` fonctionnent dans les tests comme dans le code : une règle se teste par son nom (`@domaine/erreurs.ts`).
- Un seul exécuteur pour servir, tester et installer.

**Coûts / contraintes**
- `@types/bun` et `@types/node` coexistent : une montée de l''un peut demander d''aligner l''autre.
- Pas de `--coverage` natif aussi abouti que celui de vitest : à compléter par `bun test --coverage` ou un outil dédié le jour où l''on mesurera la couverture.
- Le dépôt est lié à Bun pour les tests, sans conséquence sur le code livré (aucun import de `bun:*` hors `*.test.ts`, vérifié par `verif:arch`).

## Alternatives évaluées

1. **vitest + supertest (ADR-009)** — écarté : compatibilité Vite 8 non garantie au moment de P0, deux dépendances de plus, pour des fonctions (snapshot, mocks de modules) que la stratégie de test n''utilise pas.
2. **`node --test`** — écarté : ne charge pas TypeScript sans `tsx`, ne résout pas les `paths` du tsconfig, et demande donc une couche de compilation par-dessus.
3. **Aucun test exécutable, vérification manuelle** — écarté : c''est la situation du legacy, avec un écran de recette à 14/14 non mesuré.

## Liens

`ADR-009` (stratégie conservée), `MIGRATION.md` P0 (porte atteinte avec cet exécuteur), `src/AGENTS.md` (commandes).