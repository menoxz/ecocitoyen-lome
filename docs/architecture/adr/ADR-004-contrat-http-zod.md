# ADR-004 — Contrat HTTP versionné, schémas zod partagés, erreurs typées

**Statut** : Accepté — 14/11/2026
**Remplace** : routes non versionnées, validation ad hoc dans chaque handler, erreurs en texte libre.

## Contexte

Aujourd''hui : 34 routes sous `/api/…`, validation écrite à la main dans chaque handler (longueurs, types, champs requis), erreurs renvoyées en `{ error: "phrase" }`. Le front ne partage aucun type avec le serveur : renommer un champ casse silencieusement un écran. Les tests de recette doivent distinguer un refus métier (transition interdite) d''un refus de forme (champ manquant), ce qu''une phrase libre ne permet pas.

## Décision

- Base **`/api/v1`**, versionnée dès le premier jour.
- **Un fichier de contrat par ressource** dans `src/contrats/` : schémas **zod** d''entrée (corps, query, params) et types de sortie. Le serveur valide avec, le front réutilise les mêmes types.
- **Erreurs typées** : `{ code, message, details }`, `code` appartenant à une union fermée (`TRANSITION_INTERDITE`, `HORS_ZONE`, `PHOTO_MANQUANTE`, `DOUBLON_CONFIRMATION`, `DROIT_REFUSE`, `DEBIT_DEPASSE`, `COMPTE_VERROUILLE`, …). La correspondance code → statut HTTP est une table unique dans `src/interface/http/middlewares/erreurs.ts`.
- Les routes sont **déclaratives** : contrat → middleware RBAC → cas d''usage → projection. Aucune règle métier dans la route.
- `snake_case` conservé dans les charges utiles (le front existant et les exports s''y appuient).

## Conséquences

**Bénéfices**
- Le front et le serveur ne peuvent plus diverger sur un nom de champ : une erreur de compilation les sépare.
- Les tests de recette s''expriment sur des codes stables (`CR10` attend `TRANSITION_INTERDITE`), pas sur des phrases.
- Une évolution cassante se fait en `/api/v2` sans casser un client existant.

**Coûts / contraintes**
- zod devient une dépendance de production partagée par les deux côtés.
- Deux représentations coexistent : entité de domaine et schéma de transport ; une projection explicite est nécessaire (c''est voulu : elle empêche de renvoyer l''identité de l''auteur par accident).
- Le versionnement impose de maintenir l''ancienne version lors d''une rupture.

## Alternatives évaluées

1. **OpenAPI-first (spec YAML + génération de client)** — rejeté au pilote : outillage de génération à maintenir, boucle de développement plus lente, pour un seul consommateur (le front du dépôt).
2. **tRPC** — rejeté : couple fortement le client au serveur TypeScript et complique l''intégration future d''un partenaire municipal ou d''un client mobile.
3. **GraphQL** — rejeté : sur-dimensionné pour 12 ressources, et la résolution de champs décourage la validation explicite par cas d''usage.
4. **Validation manuelle + types TypeScript dupliqués** — rejeté : c''est la situation actuelle, et elle a déjà produit un décalage (front envoie `photos: [{url}]` en base64 alors que la cible stocke des fichiers).

## Liens

`Z-13`, `ADR-001`, `ADR-007`, `ARCHITECTURE.md` §8.