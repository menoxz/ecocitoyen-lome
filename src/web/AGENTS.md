# AGENTS.md — src/web

## Rôle
Afficher et collecter. Aucune règle, aucun secret, aucun accès direct aux données.

## Interdits (vérifiés)
- Importer `domaine`, `application`, `infrastructure`, `interface`. Seul `contrats` est importable, avec React et les utilitaires d'affichage.
- Décider d'une action métier : les actions disponibles viennent du serveur (`actions_disponibles`). Si le bouton manque, c'est un défaut de projection serveur, pas un `if` de plus dans le front.
- Recalculer un délai, un statut affichable, un indicateur. Un libellé se déduit de `i18n/fr.ts`, une valeur vient du serveur.
- Stocker un jeton en `localStorage` : la session est un cookie `httpOnly`.
- Importer Leaflet sur l'écran d'accueil : la carte est chargée en `React.lazy`.

## Forme
- `features/<vue>/` : une vue, ses hooks, ses composants. `ui/` : composants sans logique métier, réutilisables.
- `api/<ressource>.ts` : un client par ressource, typé par `contrats`. Aucun `fetch` brut dans un composant.
- Toute chaîne visible passe par `i18n/fr.ts`.
- Un composant > 150 lignes est découpé (le dossier d'un signalement se compose : en-tête, preuves, actions, historique).
- Accessibilité : cible tactile ≥ 44 px, contraste WCAG AA, écrans à partir de 360 px.

## Vérification
`bun run verif:arch` (imports) ; `bun run build` : JS initial < 1 Mo ; revue de vue : les 6 vues répondent sur `/api/v1`.