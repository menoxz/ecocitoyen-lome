# ADR-002 — Persistance SQLite derrière des ports de dépôts

**Statut** : Accepté — 14/11/2026
**Remplace** : le stockage en mémoire vive (`let reports = [...]`).

## Contexte

Aucune donnée ne survit au redémarrage aujourd''hui. ENF05 impose une sauvegarde quotidienne, une perte maximale de 24 h et une restauration en 4 h testée ; ENF03 vise 10 000 signalements sans perte de performance. Le pilote couvre une commune, un seul nœud applicatif. Les requêtes spatiales se limitent à deux rayons (30 m pour les doublons, 100 m pour la corroboration). Aucun besoin de PostGIS, aucune écriture concurrente forte.

## Décision

**SQLite** via `better-sqlite3`, fichier `data/ecocitoyen.db`, avec :
- migrations SQL versionnées et numérotées (`infrastructure/sqlite/migrations/00N-*.sql`), appliquées au démarrage et tracées dans `schema_version` ;
- un dépôt par agrégat derrière un port (`DepotSignalements`, `DepotComptes`, …) ;
- les contraintes d''intégrité portées par le schéma quand elles expriment une règle : clé composée sur `confirmation`, index partiel unique sur l''intervention active, `NOT NULL` sur `motif_rejet` quand `statut = REJETE` (par déclencheur) ;
- sauvegarde = copie du fichier après `VACUUM INTO`, documentée et testée une fois (ENF05).

Cible de migration : PostgreSQL + PostGIS, par une nouvelle implémentation des mêmes ports. Aucun code de `domaine`, `application`, `interface` ou `web` ne change.

## Conséquences

**Bénéfices**
- Zéro serveur à administrer, sauvegarde et restauration triviales, latence locale sub-milliseconde.
- Les règles portées par le schéma ne peuvent pas être contournées par un cas d''usage mal écrit.
- La bascule PostgreSQL est une tâche d''infrastructure, pas un refactor.

**Coûts / contraintes**
- `better-sqlite3` est synchrone : les transactions bloquent la boucle d''événements (acceptable à ce volume, à surveiller au-delà de quelques centaines de requêtes/seconde).
- Pas de client réseau : impossible de séparer l''application de la base (contrairement à PostgreSQL).
- Pas de type `geography` : distances calculées en TypeScript (Haversine) ou via l''extension `spatialite` si nécessaire.

## Alternatives évaluées

1. **PostgreSQL dès maintenant** — rejeté : ajoute un serveur à installer, sauvegarder et superviser pour un volume que SQLite absorbe ; aucun besoin PostGIS identifié (deux rayons, une commune).
2. **ORM (Prisma/Drizzle) avec SQLite** — rejeté : couche d''abstraction supplémentaire pour un schéma de 14 tables ; les migrations SQL brutes restent lisibles et vérifiables, et l''ORM masque les contraintes partielles qu''on veut justement explicites.
3. **Rester en mémoire avec un fichier JSON** — rejeté : aucune contrainte d''intégrité, écriture non atomique, corruption possible au crash, ENF05 impossible à prouver.

## Liens

`Z-03`, `ADR-001`, `ARCHITECTURE.md` §9.