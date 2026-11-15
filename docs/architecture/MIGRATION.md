# Migration du code actuel vers l'architecture cible

Version 1.0 — 14/11/2026. Compagnon de `ARCHITECTURE.md`.

## 1. Principe

**On ne réécrit rien en un geste.** Le code actuel (`server.ts`, `src/components/*`) reste l'application qui tourne et la référence fonctionnelle. Chaque phase livre un morceau testé, branché, commité. Le legacy n'est supprimé qu'en phase P8, quand plus aucune route de `server.ts` n'est atteinte.

Trois règles de conduite pendant toute la migration :

1. **Une phase = un commit vérifié** (`bun run verif:arch`, `bun run test`, `bun run typecheck` verts).
2. **Aucun fichier legacy n'est modifié pour « faire propre ».** On le remplace, on ne le rafistole pas. Exception : un bug bloquant pour la démonstration.
3. **Le contrat `/api/v1` est figé avant P3.** Le front bascule ensuite sans renégocier.

## 2. État de départ mesuré (14/11/2026)

| Élément | Mesure |
|---|---|
| `server.ts` | 1 373 lignes, 34 routes, 22 responsabilités mêlées |
| `src/components/*` | 8 fichiers, 968 à 42 916 octets, `ReportDetailModal` = 42 916 o |
| Règles métier dans le front | oui (transitions, gardes de rôle) — interdites en cible |
| Persistance | mémoire vive, 22 signalements en dur |
| Authentification | aucune (identifiant seul), `currentUser` global mutable |
| KPI | 6 calculés, 1 constant (`tauxRespectDelais = 88`), 2 avec repli inventé |
| Tests | 0 |
| Typecheck | `bunx tsc --noEmit` sort 0 sur le legacy |
| Dépendances | 182 paquets installés (bun), `node_modules` absent avant cette session |

## 3. Phases et portes de sortie

Chaque porte est une **preuve exécutable**, pas une déclaration.

### P0 — Socle technique (0,5 j)
**But** : un projet où l'on peut écrire du code testé sans dépendre du legacy.
**Livrables** : alias TypeScript (`@domaine/*`, `@contrats/*`, `@application/*`, `@ports/*`, `@infra/*`, `@interface/*`, `@web/*`), `scripts/verifier-architecture.mjs`, `src/config/environnement.ts`, `src/contrats/erreurs.ts`, vitest, scripts npm `test` / `typecheck` / `verif:arch`.
**Porte** : `bun run typecheck` exit 0 ; `bun run test` exit 0 avec au moins 1 test ; `bun run verif:arch` exit 0 ; violation d'import volontaire ⇒ exit 1 (prouvé en la créant puis la retirant).
**Atteinte le 14/11/2026** : typecheck exit 0 (0 erreur), `bun test` 11 tests / 51 assertions au vert, `verif:arch` exit 0 sur 6 fichiers, violation volontaire (domaine important express + `Date.now`) exit 1 avec 2 violations nommées.

### P1 — Domaine pur (1 j)
**But** : toutes les décisions du CDC hors base et hors HTTP.
**Livrables** : `domaine/signalement/{signalement.type,transitions.regle,priorite.regle,doublon.regle}`, `domaine/intervention/unicite-active.regle`, `domaine/compte/droits.regle` (matrice §3.3), `domaine/zone/point-dans-polygone.regle`, `domaine/indicateurs/formules.regle`.
**Porte** : un test par transition T0-T9 (autorisée **et** refusée), un test par ligne de la matrice de droits, un test de doublon aux trois bornes (30 m, 30 j, catégorie), un test qui casse volontairement la formule du taux de résolution (CR14). Aucune ligne de `domaine/` n'importe express, react, sqlite ou `fetch` — vérifié par le script.

### P2 — Persistance (1 j)
**But** : plus rien ne vit en mémoire.
**Livrables** : `infrastructure/sqlite/base.ts`, `migrations/001-initial.sql` (tables du §9 de `ARCHITECTURE.md`), implémentations des ports de dépôts, `seed.ts` (12 quartiers, 5 catégories, 4 équipes, 6 comptes, 22 signalements) activé par `MODE_DEMO`, sauvegarde documentée (copie du fichier + `VACUUM`) pour ENF05.
**Porte** : base créée depuis zéro, seed chargé, redémarrage du serveur ⇒ mêmes données ; test d'intégrité (clé composée `confirmation`, index partiel intervention) qui prouve le refus du doublon de confirmation et de la 2e intervention active ; `.gitignore` couvre `data/`.

### P3 — Interface HTTP et sécurité (1,5 j)
**But** : le contrat `/api/v1` et les barrières serveur.
**Livrables** : `interface/http/serveur.ts` (composition root), middlewares session/RBAC/débit/erreurs/upload, routes `auth` + `referentiel` + `signalements` (création, lecture, transitions), `application/signalement/*`, `application/compte/*`, `journal` alimenté par les cas d'usage.
**Porte** : `tests/api` couvre CR1-CR13 ; un test prouve qu'un citoyen reçoit 403 sur `valider` et qu'un appel sans cookie reçoit 401 ; 6 échecs de connexion ⇒ 423 ; 3 signalements dans l'heure ⇒ 429 ; après T1, `GET /journal` contient la ligne.

### P4 — Interventions et notifications (0,5 j)
**But** : le circuit complet, du signalement à la preuve de nettoyage.
**Livrables** : `application/intervention/*`, notifications in-app sur les 6 événements MVP, canaux extensibles via le port.
**Porte** : parcours §12.1 rejoué par un test de bout en bout : création → validation → affectation → démarrage → clôture avec photo → notification citoyen.

### P5 — Photos et IA asynchrone (1 j)
**But** : ENF08 et CR13 tenus.
**Livrables** : `infrastructure/photos` (disque, type réel, EXIF retiré, nom aléatoire), `POST /signalements/:id/photos`, `infrastructure/gemini`, `infrastructure/travaux/worker`, champ `mode_ia` persisté.
**Porte** : un `.jpg` contenant du HTML est refusé ; une image valide est écrite hors dossier exécutable et servie ; sans clé Gemini, le signalement est accepté avec `mode_ia=SIMULATION` et la mention visible (test sur la réponse).

### P6 — Indicateurs (0,5 j)
**But** : plus aucune constante.
**Livrables** : `application/indicateur/synthese.cas`, lecture des SLA depuis `parametre`, `null` + `motif_indisponible` quand la donnée manque ; suppression de la constante 88 et des replis 92/0.90.
**Porte** : test comparant la sortie au calcul manuel d'un jeu de 6 dossiers couvrant les 4 priorités et les 3 jalons (CR14) ; `grep -r "88" src/application/indicateur` ne doit rien renvoyer de suspect.

### P7 — Front découpé (2 j)
**But** : le front ne contient plus aucune règle, et reste utilisable en démonstration.
**Livrables** : `web/app`, `web/api` (client typé sur les contrats), `web/features/{carte,signalements,dossier,tableau-de-bord,administration,recette}`, `web/ui`, `web/i18n/fr.ts`. `ReportDetailModal` éclaté en : en-tête, preuves photo, actions disponibles (calculées par le serveur), historique.
**Prérequis obligatoire (ADR-011)** : `docs/design/DESIGN.md` (jetons + un style par composant avec tous ses états) et `docs/design/PARCOURS.md` (parcours métier par profil, coût en gestes, écrans) validés **avant** la première ligne d'écran. Sans ces deux fichiers, P7 ne démarre pas.
**Porte** : les six vues fonctionnent sur `/api/v1` ; aucun import de `domaine`/`application` dans `web` (script) ; bundle initial < 1 Mo (ENF02) mesuré ; la recette affiche l'état réel de `tests/recette`, plus de `PASSED` en dur.

### P8 — Retrait du legacy (0,5 j)
**But** : une seule façon de faire dans le dépôt.
**Livrables** : suppression de `server.ts`, `src/App.tsx`, `src/components/*`, `src/types/index.ts`, `src/utils/helpers.ts`, `src/data/initialData.ts` ; `index.html` et `vite.config.ts` pointent sur `src/web/principal.tsx`.
**Porte** : `bun run build` exit 0 ; `bun run dev` sert l'application ; `bun run verif:arch` scanne désormais **tout** `src/` (plus d'exception legacy) et sort 0.

## 4. Ordre imposé par les dépendances

```
P0 socle ─┬─▶ P1 domaine ─┬─▶ P3 interface ─┬─▶ P4 interventions ─┐
          │               │                 │                    ├─▶ P7 front ─▶ P8 retrait
          └─▶ P2 base ────┘                 └─▶ P5 photos/IA ────┤
                                                               └─▶ P6 indicateurs
```
P1 et P2 sont parallélisables ; P7 ne démarre pas avant que `/api/v1` ne réponde sur les six ressources.

## 5. Risques de migration et parades

| Risque | Parade |
|---|---|
| Deux applications qui tournent en parallèle et divergent | Une seule racine d'exécution : `bun run dev` sert la nouvelle interface dès P3 ; le legacy reste accessible par `--legacy` jusqu'à P8 |
| Le front casse des écrans attendus en démonstration | Porte P7 : chaque vue listée doit répondre, sinon la phase n'est pas finie |
| Régression silencieuse de règle métier | P1 fige les règles par tests **avant** toute réécriture d'interface |
| Perte du jeu de démonstration | `seed.ts` reprend les 22 signalements actuels et reste activable par `MODE_DEMO` |
| Dérive de style pendant la migration | `verifier-architecture.mjs` + revue de phase ; pas de nouvelle règle sans test |
| Pression de délai (démonstration) | Chaque phase est démontrable seule ; P0-P4 + seed suffisent à rejouer le scénario nominal |

## 6. Definition of Done global de l'architecture

L'architecture est en place quand, simultanément :

1. `bun run verif:arch` sort 0 sur l'intégralité de `src/` (legacy supprimé).
2. Aucune règle métier n'existe hors de `src/domaine` (vérifié par revue + script sur les imports interdits).
3. `tests/recette` couvre CR1-CR14, un test nommé par critère, tous verts.
4. Les indicateurs sont calculés et un test les compare à un calcul manuel.
5. Un serveur redémarré retrouve ses données, et une sauvegarde se restaure.
6. Chaque `AGENTS.md` de l'arborescence décrit encore une règle réellement appliquée (revue trimestrielle).