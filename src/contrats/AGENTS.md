# AGENTS.md — src/contrats

## Rôle
Décrire les échanges HTTP : ce qui entre (validation), ce qui sort (forme), et les codes d''erreur. Source unique partagée par le serveur et le front.

## Règles
- Un fichier par ressource : `<ressource>.contrat.ts`. Exporte les schémas zod + les types inférés (`z.infer`).
- Entrée validée strictement : champ inconnu ⇒ refus (`.strict()`). Sortie typée mais tolérante (le serveur peut enrichir sans casser un client).
- `erreurs.ts` porte l''union fermée des codes métier + leur message par défaut. Un nouveau refus métier ⇒ nouveau code, jamais une phrase libre.
- Aucune projection d''entité : le contrat décrit le transport, pas l''agrégat. Les champs sensibles (identité de l''auteur) n''existent pas dans un contrat public.
- `snake_case` conservé (compatibilité front et exports).
- Interdit : importer `express`, `react`, `infrastructure`, `interface`, `application` ; importer `fs`, `http`, une base. Importer `domaine` est autorisé pour réutiliser une énumération — jamais pour exécuter une règle.
- Interdit : un schéma qui accepte `any` ou une chaîne non bornée (`z.string()` sans `.min`/`.max`).

## Vérification
`bun run verif:arch` ; un test par contrat : cas valide, cas limite (longueur min/max, enum inconnue), champ en trop rejeté.