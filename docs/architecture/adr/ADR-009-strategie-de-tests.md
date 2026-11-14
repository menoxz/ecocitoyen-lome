# ADR-009 — Trois niveaux de tests, la recette exécutée pour de vrai

**Statut** : Accepté — 14/11/2026
**Remplace** : l''absence de tests et l''écran de recette à 14/14 « PASSED » codés en dur.

## Contexte

Le dépôt ne contient aucun test, alors que le CDC impose 14 critères de recette (CR1-CR14) et que la valeur du produit tient dans des règles de décision. L''écran actuel affiche 14/14 et « 100 % » en dur ; trois critères seulement ont un bouton de test manuel. Un jury ou une mairie qui découvre cela perd confiance dans tout le reste.

## Décision

Trois niveaux, chacun avec un rôle distinct :

| Niveau | Outil | Portée | Ce qu''il prouve |
|---|---|---|---|
| Domaine | vitest, sans mock | règles pures : transitions, priorité, doublons, droits, formules | qu''une décision est correcte pour toutes les entrées |
| API | vitest + `supertest`, base SQLite temporaire recréée par test | routes, middlewares, cas d''usage, persistance | que le serveur refuse ce qu''il doit refuser (RB06) |
| Recette | vitest, un fichier nommé par critère (`CR01.cas.test.ts` …) | parcours CR1-CR14 | que chaque critère du CDC est satisfait, et lequel ne l''est pas |

Règles :
- **Un test par transition**, autorisée et refusée (T0-T9 × 2).
- **Un test par ligne de la matrice de droits** (§3.3), exécuté sur les routes réelles.
- Les dépendances non déterministes sont injectées : `Horloge` (délais de 7 jours, SLA) et `Identifiants` (UUID prévisibles en test).
- L''écran de recette **lit** le résultat d''exécution (fichier de rapport), il ne décide pas d''un statut.
- Aucun test ne dépend de l''ordre d''exécution ni d''un état partagé.

## Conséquences

**Bénéfices**
- La recette devient un artefact, pas une déclaration.
- Modifier une règle casse un test nommé, ce qui rend la conséquence visible avant la production.
- Les délais (7 jours de contestation, SLA) deviennent testables grâce à l''horloge injectée — impossible avec `Date.now()` disséminé.

**Coûts / contraintes**
- Du temps d''écriture avant la première démonstration, et une base de test à recréer par exécution (quelques centaines de millisecondes).
- Aucun test d''interface graphique au pilote : les vues sont vérifiées par revue et par le parcours de démonstration, pas automatiquement (assumé).
- La discipline « pas de `Date.now()` dans le domaine » n''est utile que si elle est respectée : elle est vérifiée par revue et par le script d''architecture.

## Alternatives évaluées

1. **Tests de bout en bout uniquement (Playwright)** — rejeté au pilote : lents, fragiles, et ils ne localisent pas la règle fautive ; un parcours vert peut masquer trois transitions cassées.
2. **Tests de snapshots de composants** — rejeté : verrouille l''apparence sans prouver une règle ; coût de maintenance élevé pour un front en cours de découpage.
3. **Aucun test, démonstration manuelle** — rejeté : c''est la situation actuelle, avec une recette affichée à 100 % qui n''est pas mesurée.

## Liens

`ADR-001`, `ADR-008`, `MIGRATION.md` §3 (portes P1, P3, P6).