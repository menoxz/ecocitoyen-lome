# ADR-001 — Monolithe modulaire à couches explicites

**Statut** : Accepté — 14/11/2026
**Remplace** : l''organisation « un fichier serveur + un dossier de composants » du prototype.

## Contexte

Le prototype tient en un `server.ts` de 1 373 lignes et huit composants React. Le cahier des charges exige des barrières serveur prouvables (RB06, EF03), une machine à états fermée (§5.1), une traçabilité des actions sensibles (RB08) et une recette de 14 critères. Volume visé : 50 utilisateurs simultanés, 10 000 signalements, une commune (ENF03). L''équipe est réduite, l''infrastructure se limite à un VPS unique, et le budget d''exploitation est nul.

## Décision

Un processus Node unique, découpé en **huit couches** aux dépendances orientées (`config ← contrats ← domaine ← ports ← application ← infrastructure/interface ← web`), avec une composition root unique et des frontières vérifiées mécaniquement par `scripts/verifier-architecture.mjs`.

- Les règles vivent uniquement dans `src/domaine` (aucune dépendance externe).
- Un cas d''usage = un fichier dans `src/application`.
- Les accès techniques sont des implémentations de ports dans `src/infrastructure`.
- Le HTTP est une traduction, jamais une décision.
- Le front n''importe que `src/contrats`.

## Conséquences

**Bénéfices**
- Les 31 règles et 10 transitions se testent sans base ni serveur (millisecondes), donc la recette est réelle.
- Une barrière de sécurité unique, auditable : un seul middleware RBAC adossé à une seule matrice.
- Correctif localisable en un `grep` : le nom d''un fichier dit ce qu''il fait.
- Extraction future d''un module (indicateurs, IA) sans réécriture : les ports existent.

**Coûts / contraintes**
- Plus de fichiers, plus d''indirection : un correctif traverse application → domaine → dépôt.
- Discipline obligatoire : sans le script de vérification, les frontières se dégradent en une session.
- Le legacy reste visible jusqu''à P8 (voir `MIGRATION.md`), donc deux façons de faire coexistent temporairement.

## Alternatives évaluées

1. **Microservices** (signalements / IA / indicateurs / auth séparés) — rejeté : quatre déploiements, contrats distribués et observabilité pour 50 utilisateurs ; duplique la barrière RBAC dans chaque service et rend la preuve RB06 plus fragile.
2. **Backend-as-a-service (Supabase/Firebase)** — rejeté : règles métier dans des politiques propriétaires, verrou fournisseur, audit et sauvegarde soumis à un tiers, alors que RG31/ENF05 demandent la maîtrise des données personnelles.
3. **Monolithe sans couches (séparation par dossiers de features uniquement)** — rejeté : ne règle pas le défaut central constaté (règles éparpillées entre route, front et helper), et ne rend pas les règles testables sans I/O.

## Liens

`Z-12`, `ADR-002`, `ADR-004`, `ADR-007`, `ARCHITECTURE.md` §2 et §4.