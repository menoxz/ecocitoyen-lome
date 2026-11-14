# AGENTS.md — src/domaine

## Rôle
Décider. Toute règle du cahier des charges vit ici, et nulle part ailleurs.

## Interdits absolus (vérifiés par `verif:arch`)
- Importer quoi que ce soit hors de `src/domaine` (ni `express`, ni `react`, ni une base, ni `fetch`, ni `zod`).
- `Date.now()`, `new Date()`, `Math.random()` : le temps et le hasard sont des paramètres (`maintenant: string`, `identifiants: string[]`).
- Écrire, journaliser, notifier : le domaine **retourne** une décision ou une erreur, il n'agit pas.
- `async` : une règle est synchrone. Un besoin d'I/O dans une règle = la règle est mal placée.
- Lire une variable d'environnement. Un seuil se reçoit en paramètre (`parametre`), jamais en constante.

## Forme d'une règle
```ts
export function decider(entree: Entree, contexte: Contexte): Decision | ErreurMetier
```
- Retour explicite d'un refus (`ErreurMetier('TRANSITION_INTERDITE', {...})`), jamais `null` ambigu.
- Table exhaustive plutôt que cascade de `if` : `transitions.regle.ts` liste les 10 transitions autorisées, le reste est refusé par défaut.
- Un fichier = une règle nommée par le vocabulaire métier (`doublon.regle.ts`, `priorite.regle.ts`, `droits.regle.ts`).

## Modules
`signalement` (cycle de vie, priorité, doublons) · `intervention` (unicité, clôture) · `compte` (droits §3.3, mot de passe) · `zone` (appartenance) · `indicateurs` (formules §13).

## Vérification
Un `*.test.ts` par fichier de règle. Obligatoire pour une transition et pour un droit : **le cas autorisé et le cas refusé**. Une règle modifiée sans test modifié est un défaut, pas un raccourci.