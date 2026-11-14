# EcoCitoyen Lomé — Architecture cible

Version 1.0 — 14/11/2026. Compagnon de `BESOIN.md` (le pourquoi) et `MIGRATION.md` (le comment y aller).
Décisions détaillées : `adr/`.

---

## 1. Résumé exécutif

Un **monolithe modulaire** : un processus Node, **huit couches** à frontières explicites, un domaine métier pur qui porte toutes les règles du cahier des charges, des adaptateurs remplaçables derrière des ports, un front React qui ne contient aucune règle.

Trois choix structurent tout le reste :

1. **Le domaine ne connaît ni Express, ni React, ni SQLite, ni `fetch`.** Conséquence : les 6 statuts, les 10 transitions, les 31 règles et les formules d'indicateurs se testent en millisecondes, sans base ni serveur.
2. **Un cas d'usage = un fichier = une action.** Une route HTTP ne fait que traduire une requête en commande, appeler le cas d'usage, traduire le résultat. Aucune règle dans une route.
3. **Les frontières sont vérifiées par un script, pas par la discipline.** `scripts/verifier-architecture.mjs` échoue si un import interdit apparaît. La discipline non outillée se perd en une session.

## 2. Approches comparées

| Critère | A. Monolithe modulaire **(retenu)** | B. Microservices (API signalements / service IA / service indicateurs / auth) | C. Backend-as-a-service (Supabase/Firebase + fonctions edge) |
|---|---|---|---|
| Coût d'exploitation | 1 VPS, 1 processus, 1 fichier de données | 4 déploiements, bus, secrets, observabilité distribuée | Abonnement + fonctions, dépendance fournisseur |
| Latence de la démonstration | locale, < 10 ms | appels réseau internes, retries, files | dépend du réseau vers l'éditeur |
| Complexité initiale | faible | élevée (contrats, idempotence, sagas) | faible au départ, moyenne ensuite |
| Évolutivité réelle visée | 50 utilisateurs simultanés, 10 000 signalements (ENF03) — un nœud suffit | utile au-delà de plusieurs communes et équipes | correcte mais plafonnée par la tarification |
| Compétence requise | TypeScript | TypeScript + infra distribuée | TypeScript + modèle de sécurité du fournisseur |
| Sécurité des règles métier | une seule barrière serveur, facile à prouver (RB06) | barrière dupliquée par service, risque d'écart | règles dans des politiques propriétaires, audit difficile |
| Verrou | aucun | plateforme de conteneurs | total |
| Réversibilité | forte : extraction d'un module possible | faible | très faible |

**Décision : A.** B et C résolvent des problèmes que ce projet n'a pas (échelle multi-villes, équipe d'exploitation, besoin de déploiements indépendants) au prix de la propriété la plus demandée par le CDC : *pouvoir prouver que le serveur refuse ce qu'il doit refuser*. Une barrière unique, testée, vaut mieux que quatre barrières réparties.
Point d'extraction documenté : si le module `indicateurs` devient lourd (séries temporelles, agrégats), il sort en service séparé — son port `SourceIndicateurs` existe déjà pour cela.

## 3. Vue d'ensemble

```
                      ┌──────────────────────────────────────────────┐
                      │  NAVIGATEUR (mobile-first)                   │
                      │  src/web : features React, zéro règle métier │
                      └───────────────┬──────────────────────────────┘
                                      │ HTTP JSON (contrats zod, /api/v1)
┌─────────────────────────────────────▼──────────────────────────────────────┐
│ src/interface/http                                                          │
│   serveur.ts (composition root) · routes/ · middlewares/                    │
│   session → RBAC → limite de débit → validation → cas d'usage → erreurs      │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │ commande / requête typée
┌─────────────────────────────────────▼──────────────────────────────────────┐
│ src/application   un fichier = une action (creer, valider, affecter, …)      │
│   orchestre : charge l'agrégat → appelle la règle → persiste → notifie →     │
│   journalise. Aucune règle métier ici, seulement un enchaînement.            │
└───────┬──────────────────────────────────────┬─────────────────────────────┘
        │ règles pures                          │ ports (interfaces)
┌───────▼──────────────────────┐   ┌────────────▼─────────────────────────────┐
│ src/domaine                  │   │ src/ports                                │
│  signalement (statuts, T0-T9,│   │  DepotSignalements · DepotComptes ·      │
│   doublons, priorité)        │   │  StockagePhotos · ClassificateurIA ·     │
│  intervention · compte ·     │   │  Notificateur · Journal · Horloge ·      │
│  zone · indicateurs          │   │  Identifiants · LimiteDebit              │
│  0 dépendance externe        │   │  (interfaces seules)                     │
└──────────────────────────────┘   └────────────┬─────────────────────────────┘
                                                │ implémentations
┌───────────────────────────────────────────────▼─────────────────────────────┐
│ src/infrastructure : sqlite/ · gemini/ · photos/ · notifications/ ·         │
│                      journal/ · horloge/ · identifiants/ · limite-debit/    │
│                      travaux/ (worker IA asynchrone)                        │
└─────────────────────────────────────────────────────────────────────────────┘
        │                                                  │
   data/ecocitoyen.db                              data/photos/AAAA/MM/*.webp
```

## 4. Les huit couches et la matrice de dépendances

| Couche | Une seule responsabilité | Peut importer | Interdit |
|---|---|---|---|
| `config` | lire et valider l'environnement | `zod` | tout le reste |
| `contrats` | décrire les échanges HTTP (validation entrante, forme sortante, codes d'erreur) | `domaine`, `zod` | express, react, base, fs |
| `domaine` | décider : règles, transitions, calculs | rien | express, react, base, fs, `fetch`, `Date.now` direct |
| `ports` | déclarer ce dont le domaine a besoin du monde extérieur | `domaine` | toute implémentation |
| `application` | orchestrer un cas d'usage complet et transactional | `domaine`, `ports` | express, react, sqlite, `fetch` |
| `infrastructure` | parler au monde (SQL, Gemini, disque, HTTP) | `ports`, `domaine`, `config` | `application`, `interface`, `web` |
| `interface` | traduire HTTP ⇄ cas d'usage, appliquer session/RBAC/débit | `contrats`, `application`, `domaine`, `ports`, `config` | règles métier, accès SQL direct |
| `web` | afficher et collecter | `contrats` | `domaine`, `application`, `infrastructure`, `interface` |

Deux règles fermes :
- **Composition root unique** : seul `src/interface/http/serveur.ts` a le droit d'importer `infrastructure`. Tout le reste reçoit ses dépendances en paramètre.
- **Aucun barrel** (`index.ts` réexportant) : les réexports créent des cycles et masquent la frontière. On importe le chemin exact.

## 5. Modules et responsabilités

Un module = un mot du vocabulaire métier, présent dans les mêmes dossiers à chaque couche (`signalement`, `intervention`, `compte`, `referentiel`, `notification`, `indicateur`, `journal`, `zone`). Ajouter une fonctionnalité = remplir un module dans les couches concernées, pas ajouter une couche.

| Module | Responsabilité | Interface principale | Complexité |
|---|---|---|---|
| `signalement` | cycle de vie complet : création, doublons, priorité, 10 transitions, fusion, contestation | cas d'usage `creer`, `valider`, `rejeter`, `rouvrir`, `reviser`, `fusionner` | L |
| `intervention` | affectation, démarrage, clôture avec preuve, annulation, unicité de l'intervention active | `affecter`, `demarrer`, `clore`, `annuler` | M |
| `compte` | inscription, connexion, session, rôles, mot de passe, anonymisation, dernier admin | `inscrire`, `connecter`, `changerRole`, `anonymiser` | M |
| `referentiel` | communes, quartiers, catégories, équipes, paramètres (SLA, seuils, rayons) | `lister`, `modifier`, `parametreLire` | S |
| `notification` | créer et lire les notifications in-app, canaux extensibles | `notifier`, `listerParUtilisateur`, `marquerLu` | S |
| `indicateur` | les 8 indicateurs du CDC, calculés depuis l'historique | `synthese`, `parStatut`, `parQuartier`, `respectDelais` | M |
| `journal` | audit append-only des actions sensibles | `enregistrer`, `lister` | S |
| `zone` | appartenance d'un point à la zone pilote (polygone + repli bbox) | `contient`, `quartierDe` | S |

Couverture des cas d'usage du CDC : `signalement` couvre T0/T1/T2/T4/T7/T9 + EF09-EF13, `intervention` couvre T3/T5/T6/T8 + EF15-EF19, `compte` couvre EF01-EF08, `indicateur` couvre §13 + EF45-EF48, `referentiel` couvre EF49-EF51, `journal` couvre EF52 + RB08.

## 6. Arborescence cible

Chaque dossier porte un `AGENTS.md` qui dit quoi y mettre et quoi n'y mettre jamais ; c'est le mécanisme d'application des règles.

```
ecocitoyen-lomé/
├── AGENTS.md                     règles projet (lues à chaque tour)
├── docs/
│   ├── Cahier_des_Charges_ECOCITOYEN_v2.docx
│   └── architecture/
│       ├── BESOIN.md             besoin + arbitrages Z-01..Z-15
│       ├── ARCHITECTURE.md       ce document
│       ├── MIGRATION.md          plan de bascule + portes de sortie
│       ├── AGENTS.md
│       └── adr/
│           ├── AGENTS.md
│           └── ADR-001..009-*.md
├── scripts/
│   └── verifier-architecture.mjs  barrière mécanique des frontières
├── data/                          (ignoré de git)
│   ├── ecocitoyen.db
│   └── photos/AAAA/MM/
├── src/
│   ├── AGENTS.md
│   ├── config/
│   │   ├── AGENTS.md
│   │   └── environnement.ts       zod sur process.env, échec au démarrage
│   ├── contrats/
│   │   ├── AGENTS.md
│   │   ├── erreurs.ts             union de codes métier + table HTTP
│   │   ├── commun.ts              pagination, identifiants, dates
│   │   ├── auth.contrat.ts
│   │   ├── signalement.contrat.ts
│   │   ├── intervention.contrat.ts
│   │   ├── referentiel.contrat.ts
│   │   ├── notification.contrat.ts
│   │   ├── indicateur.contrat.ts
│   │   └── compte.contrat.ts
│   ├── domaine/
│   │   ├── AGENTS.md
│   │   ├── signalement/
│   │   │   ├── signalement.type.ts        agrégat + statuts + priorités
│   │   │   ├── transitions.regle.ts       T0-T9, table exhaustive, refus explicite
│   │   │   ├── priorite.regle.ts          barème §5.3, sans IA (RG01)
│   │   │   ├── doublon.regle.ts           même catégorie, 30 m, 30 j (RG04)
│   │   │   └── *.test.ts
│   │   ├── intervention/  (type, unicite-active.regle.ts, *.test.ts)
│   │   ├── compte/        (type, droits.regle.ts = matrice §3.3, mot-de-passe.regle.ts)
│   │   ├── zone/          (point-dans-polygone.regle.ts, zone.type.ts)
│   │   └── indicateurs/   (formules.regle.ts, periodes.regle.ts)
│   ├── application/
│   │   ├── AGENTS.md
│   │   ├── signalement/   (creer.cas.ts, valider.cas.ts, rejeter.cas.ts,
│   │   │                   affecter.cas.ts, demarrer.cas.ts, resoudre.cas.ts,
│   │   │                   annuler.cas.ts, rouvrir.cas.ts, reviser.cas.ts,
│   │   │                   fusionner.cas.ts, confirmer.cas.ts, lister.cas.ts)
│   │   ├── compte/        (inscrire, connecter, deconnecter, changer-role,
│   │   │                   anonymiser, reinitialiser-mot-de-passe)
│   │   ├── referentiel/   (lister, modifier, parametres)
│   │   ├── notification/  (lister, marquer-lu)
│   │   ├── indicateur/    (synthese)
│   │   └── journal/       (lister)
│   ├── ports/
│   │   ├── AGENTS.md
│   │   ├── depot-signalements.port.ts
│   │   ├── depot-comptes.port.ts
│   │   ├── depot-referentiel.port.ts
│   │   ├── depot-notifications.port.ts
│   │   ├── stockage-photos.port.ts
│   │   ├── classificateur-ia.port.ts
│   │   ├── notificateur.port.ts
│   │   ├── journal.port.ts
│   │   ├── horloge.port.ts
│   │   ├── identifiants.port.ts
│   │   ├── limite-debit.port.ts
│   │   └── travaux.port.ts
│   ├── infrastructure/
│   │   ├── AGENTS.md
│   │   ├── sqlite/        (base.ts, migrations/001..N.sql, *.depot.ts, seed.ts)
│   │   ├── gemini/        (classificateur-gemini.ts, classificateur-simulation.ts)
│   │   ├── photos/        (stockage-disque.ts, verification-image.ts)
│   │   ├── notifications/ (notificateur-in-app.ts)
│   │   ├── journal/       (journal-sqlite.ts)
│   │   ├── horloge/       (horloge-systeme.ts, horloge-fixe.ts pour les tests)
│   │   ├── identifiants/  (uuid.ts)
│   │   ├── limite-debit/  (limite-sqlite.ts)
│   │   └── travaux/       (file.ts, worker.ts)
│   ├── interface/
│   │   ├── AGENTS.md
│   │   └── http/
│   │       ├── serveur.ts             composition root
│   │       ├── routes/                (auth.routes.ts, signalements.routes.ts, …)
│   │       ├── middlewares/           (session.ts, rbac.ts, debit.ts, erreurs.ts, upload.ts)
│   │       └── presentation/          (vers-signalement-public.ts, projections)
│   └── web/
│       ├── AGENTS.md
│       ├── principal.tsx
│       ├── app/           (routeur, coquille, fournisseur de session)
│       ├── api/           (client.ts, un fichier par ressource, types = contrats)
│       ├── features/      (carte/, signalements/, dossier/, tableau-de-bord/,
│       │                   administration/, recette/)
│       ├── ui/            (bouton, champ, badge, modale, mise-en-page)
│       └── i18n/          (fr.ts — dictionnaire plat, aucune lib)
└── tests/
    ├── AGENTS.md
    ├── api/               (parcours HTTP sur base temporaire : transitions, RBAC, zone)
    ├── recette/           (CR1-CR14, un test nommé par critère)
    └── e2e/               (parcours nominal §12.1)
```

## 7. Conventions

**Objectif : qu'un correctif se trouve en un `grep` et se modifie dans un seul fichier.**

| Sujet | Règle |
|---|---|
| Nommage | vocabulaire métier en français (`signalement`, `priorite`, `equipe`), suffixe de rôle technique : `.type.ts`, `.regle.ts`, `.cas.ts`, `.port.ts`, `.depot.ts`, `.routes.ts`, `.contrat.ts`, `.test.ts` |
| Taille | fichier ≤ 150 lignes utiles, fonction ≤ 30 lignes, paramètres ≤ 4 (au-delà : objet). Au-delà, c'est deux responsabilités. |
| Exports | nommés uniquement. `export default` interdit (renommage et recherche cassés). |
| Types | un type par fichier de type ; pas de `any` ; `unknown` + validation zod aux frontières. |
| Erreurs | jamais `throw new Error('message libre')` dans le domaine : `ErreurMetier(code, details)` avec un code de `domaine/erreurs.ts`. La couche `interface` est la seule à choisir un statut HTTP. |
| Temps et hasard | jamais `Date.now()` / `new Date()` / `Math.random()` dans le domaine ou l'application : `Horloge` et `Identifiants` injectés. Sinon les tests de délais ne sont pas reproductibles. |
| Commentaires | expliquer un *pourquoi* non évident ; pas de commentaire de narration, pas de code mort commenté. |
| Tests | colocalisés `*.test.ts` dans le domaine, dans `tests/api` pour HTTP, dans `tests/recette` pour CR1-CR14. Aucun test ne dépend de l'ordre d'exécution. |
| Logs | JSON structuré `{niveau, evenement, acteur, cible, code}` ; jamais de mot de passe, jeton, coordonnée ou photo en clair. |

## 8. Contrat HTTP

Base `/api/v1` (versionné dès maintenant : le front et les intégrations municipales en dépendent). Réponses JSON, `snake_case` conservé pour ne pas casser les écrans existants. Toute erreur a la même forme :

```json
{ "code": "TRANSITION_INTERDITE", "message": "Nouveau → Résolu n'est pas une transition autorisée.", "details": {"de": "NOUVEAU", "vers": "RESOLU"} }
```

| Ressource | Routes | Rôles |
|---|---|---|
| `auth` | `POST /auth/inscription`, `POST /auth/connexion`, `POST /auth/deconnexion`, `GET /auth/moi` | publics / connectés |
| `referentiel` | `GET /referentiels/{categories,quartiers,equipes,parametres}` | tous (lecture) |
| `signalements` | `GET/POST /signalements`, `GET /signalements/:id`, `GET /signalements/export.csv`, `GET /signalements/doublons` | selon matrice §3.3 |
| transitions | `POST /signalements/:id/{valider,rejeter,affecter,demarrer,resoudre,annuler-intervention,rouvrir,reviser,fusionner}` | superviseur/admin sauf `demarrer`/`resoudre` (agent de l'équipe) |
| confirmations | `POST /signalements/:id/confirmations` | citoyen non-auteur |
| medias | `POST /signalements/:id/photos`, `PATCH /medias/:id/masquage` | auteur / superviseur |
| `ia` | `GET /signalements/:id/classification` (état du traitement asynchrone) | interne |
| `notifications` | `GET /notifications`, `PATCH /notifications/:id`, `PATCH /notifications` | connecté, ses propres lignes |
| `indicateurs` | `GET /indicateurs/synthese?periode=` | superviseur/admin (`EF48` public en phase 2) |
| `comptes` | `POST /comptes`, `PATCH /comptes/:id` | admin |
| `journal` | `GET /journal` | admin |
| `sante` | `GET /sante` | public |

Aucune route ne porte de règle : elle valide le contrat, appelle un cas d'usage, renvoie. Le RBAC est un middleware déclaratif (`rbac('valider')`) adossé à la matrice unique du domaine — un seul endroit définit qui a le droit, un seul endroit le vérifie.

## 9. Schéma de données (SQLite, migrations versionnées)

| Table | Clés et contraintes notables |
|---|---|
| `utilisateur` | `role` ∈ {CITOYEN, AGENT, SUPERVISEUR, ADMIN} ; `actif` ; `empreinte_mot_de_passe` ; unicité e-mail et téléphone ; jamais de suppression (désactivation/anonymisation, RB05) |
| `session` | jeton haché, `expire_le` (30 min glissant), révocation à la déconnexion (ENF06) |
| `commune`, `quartier`, `categorie`, `equipe`, `parametre` | référentiels éditables ; `parametre` porte SLA par priorité, rayons (30 m / 100 m), seuils (3 confirmations), saison des pluies |
| `signalement` | `statut` ; `niveau_priorite` ; `score_priorite` ; identité auteur (masquée à la projection publique, pas à la requête) ; `id_categorie_ia`, `score_ia`, `mode_ia`, `justification_ia` ; index `(statut, date_signalement)`, index spatial approx `(latitude, longitude)` |
| `media` | `type` ∈ {SIGNALEMENT, RESOLUTION} ; `chemin` ; `mime` ; `masque` ; 1 à 3 photos de signalement (contrainte applicative + test) |
| `confirmation` | clé primaire `(id_signalement, id_utilisateur)` ⇒ « une seule fois » garanti par la base, pas par un `if` |
| `historique_statut` | append-only : `ancien_statut`, `nouveau_statut`, `id_auteur`, `date`, `commentaire` ; **source de vérité des dates** `date_validation`/`date_resolution` |
| `intervention` | index partiel unique : une seule ligne par signalement avec `statut ∈ {PLANIFIEE, EN_COURS}` |
| `notification` | `canal` étendu sans migration de schéma (APPLICATION maintenant, EMAIL plus tard) |
| `journal_audit` | append-only, `acteur`, `action`, `cible`, `avant`/`apres` JSON, `ip`, `date` ; purge à 12 mois (ENF09) |
| `tache` | file de travaux persistante : `type` (classification_ia, purge, alerte_delai), `etat`, `tentatives`, `disponible_le` |
| `limite_debit` | compteurs par acteur et par fenêtre, survivent au redémarrage (RG23/RG24) |

Décisions de schéma qui portent une règle : `confirmation` par clé composée, `intervention` par index partiel, `historique_statut` comme source des dates d'indicateurs. Une règle qu'on peut faire porter par la base n'est pas à réécrire en TypeScript.

## 10. Trois flux de référence

**Création (T0)** : `POST /signalements` → contrat → session → RBAC → `creer.cas` → zone contient le point ? → photo valide (type réel, taille, EXIF) → règle de doublon (catégorie + 30 m + 30 j) → score de priorité → écriture signalement + historique + notification auteur + tâche de classification → `201 {signalement}`. La classification tourne après la réponse.

**Transition (ex. T5 clôture)** : session → RBAC → chargement → `transitions.regle` valide `EN_COURS → RESOLU` et l'acteur → photo de résolution obligatoire (CR8) → écriture statut + intervention terminée + historique + notification + journal. Toute transition hors table renvoie `TRANSITION_INTERDITE` (CR10).

**Classification IA** : worker → prend une tâche → `ClassificateurIA.classifier(photo)` avec délai max 5 s et 3 tentatives → succès : écrit `id_categorie_ia`, `score_ia`, `mode_ia=MODELE` ; échec : `mode_ia=SIMULATION` + `simulation_notice`, jamais de blocage du signalement (CR13). N'écrase jamais `id_categorie` choisi par le citoyen (RG01).

## 11. Indicateurs — formules écrites une fois

| Indicateur | Formule | Source |
|---|---|---|
| Taux de résolution | `RESOLU / (VALIDE + EN_COURS + RESOLU + ROUVERT) × 100` | statuts |
| Délai moyen de tri | moyenne(`date_validation − date_signalement`) sur les dossiers décidés | `historique_statut` |
| Délai moyen de traitement | moyenne(`date_resolution − date_validation`) sur les résolus | `historique_statut` |
| Respect des délais cibles | part des dossiers dont chaque jalon respecte `parametre` (tri / affectation / résolution), par priorité | `parametre` + `historique_statut` |
| Taux de rejet | `REJETE / (décidés) × 100` avec `décidés = VALIDE + EN_COURS + RESOLU + ROUVERT + REJETE` | statuts |
| Couverture géographique | quartiers avec ≥ 1 signalement / quartiers actifs × 100 | référentiel |
| Qualité IA | accords (catégorie finale = catégorie IA) / dossiers évalués × 100 ; score moyen | champs IA |
| Volume | comptages par statut, catégorie, quartier, période | signalement |

Aucune valeur de repli inventée : donnée insuffisante ⇒ `null` + `motif_indisponible`. Le test `formules.test.ts` compare chaque formule à un jeu dont le résultat est calculé à la main (CR14).

## 12. Sécurité — barrières en couches

| Barrière | Où | Preuve attendue |
|---|---|---|
| Session en base, cookie `httpOnly` + `SameSite=Lax` + `Secure`, TTL 30 min glissant | `interface/http/middlewares/session.ts` + `compte` | test : cookie absent ⇒ 401 |
| Mot de passe Argon2id, 8 caractères minimum | `compte/mot-de-passe.regle.ts` + port | test : empreinte ≠ clair, vérification |
| Verrouillage 5 échecs / 15 min | `limite-debit` + `compte` | test : 6e tentative ⇒ 423 |
| RBAC déclaratif par action, matrice unique | `domaine/compte/droits.regle.ts` + middleware | un test par ligne de la matrice §3.3 |
| Refus des transitions non prévues | `domaine/signalement/transitions.regle.ts` | CR10 + table exhaustive |
| Validation d'entrée zod partout | `contrats/*` | test par contrat, cas limites |
| Upload : type réel, taille, nom aléatoire, EXIF retiré, dossier non exécutable | `infrastructure/photos` | test sur fichier piégé (`.jpg` contenant du HTML) |
| Débit 3/h et 10/j par utilisateur | `limite-debit` | test RG23 |
| Journal des actions sensibles | `application/*` + `journal` | test : après T1, une ligne existe |
| En-têtes de sécurité + CORS restreint | `interface/http/serveur.ts` | test d'en-têtes |

## 13. Évolutivité — les quatre extensions attendues, et leur coût

| Évolution demandée | Ce qu'on touche | Ce qu'on ne touche pas |
|---|---|---|
| Nouvelle catégorie de déchet | une ligne en `referentiel` (+ icône) | aucun code |
| Nouvelle transition (ex. T9 révision) | table de `transitions.regle.ts` + un cas d'usage + une route | le reste du domaine |
| Canal e-mail / push | implémentation de `Notificateur` + branchement dans la composition root | les cas d'usage |
| Deuxième commune | `zone` (polygones) + `referentiel` + filtre dans `lister` | le cycle de vie |
| Migration PostgreSQL | nouvelle implémentation des ports `Depot*` + migrations SQL | domaine, application, interface, web |
| Application mobile native | les contrats HTTP existent déjà | le serveur |

## 14. Ce que cette architecture refuse explicitement

1. **Une règle métier dans une route, un middleware ou un composant React.** C'est le défaut central du code actuel : trois endroits décident, un seul est testé.
2. **Un état global serveur mutable** (`let currentUser`). Une session se résout par requête, sinon deux navigateurs partagent une identité.
3. **Des photos en base64 dans le corps JSON.**
4. **Un indicateur en constante.** Pas de `const tauxRespectDelais = 88`.
5. **Un mock non étiqueté.** Simulation ⇒ `mode_ia = SIMULATION` et mention visible (RG18).
6. **Un test qui n'existe pas mais qui s'affiche vert.** La recette affiche l'état réel d'exécution de `tests/recette`, pas une constante.
7. **Un front qui garde un secret ou un droit.** Le front masque pour l'ergonomie, le serveur refuse pour la sécurité.
8. **Une abstraction sans deuxième implémentation prévue.** Pas de port si rien ne doit varier.

## 15. Correspondance code actuel → cible

| Aujourd'hui | Lignes / fichiers | Devient |
|---|---|---|
| `server.ts` helpers de distance, quartier, priorité | 44-118 | `domaine/zone/point-dans-polygone.regle.ts`, `domaine/zone/quartier.regle.ts`, `domaine/signalement/priorite.regle.ts` |
| `server.ts` routes `auth/*` + `switch-user` | 189-259 | `application/compte/*` + `interface/http/routes/auth.routes.ts` (bascule réservée à `MODE_DEMO`) |
| `POST /api/reports` + validations | 430-562 | `application/signalement/creer.cas.ts` + `domaine/signalement/doublon.regle.ts` |
| `confirm` | 565-602 | `application/signalement/confirmer.cas.ts` (unicité portée par la base) |
| `validate` / `reject` | 605-719 | `application/signalement/{valider,rejeter}.cas.ts` + `transitions.regle.ts` |
| `assign` / `start-intervention` / `resolve` / `cancel-intervention` | 722-972 | `application/intervention/*` |
| `reopen` | 975-1019 | `application/signalement/rouvrir.cas.ts` |
| `mask-photo` | 1022-1037 | `application/signalement/masquer-photo.cas.ts` |
| `ai/classify` | 1040-1127 | `infrastructure/gemini/*` + `infrastructure/travaux/worker.ts` |
| `notifications/*` | 1130-1155 | `application/notification/*` |
| `stats/overview` (dont constante 88) | 1158-1291 | `application/indicateur/synthese.cas.ts` + `domaine/indicateurs/formules.regle.ts` |
| `admin/users*` | 1294-1348 | `application/compte/*` + `interface/http/routes/comptes.routes.ts` |
| `src/components/*` (8 fichiers, 1 287 à 968 lignes) | 8 fichiers | `src/web/features/*` découpés par vue + `src/web/ui/*` |
| `src/types/index.ts` | 223 | `domaine/*/*.type.ts` (agrégats) + `contrats/*.contrat.ts` (échanges) |
| `src/data/initialData.ts` (22 signalements) | 1 500+ | `infrastructure/sqlite/seed.ts` derrière `MODE_DEMO` |
| `src/utils/helpers.ts` (SLA incomplets) | 42-71 | `parametre` en base (3 jalons) + `web/i18n/fr.ts` pour les libellés |

## 16. Dettes assumées à la livraison de l'architecture

| Dette | Pourquoi elle est assumée | Signal de sortie |
|---|---|---|
| Mono-nœud SQLite | suffisant pour ENF03 et le pilote | 2e instance applicative ou besoin PostGIS |
| Worker in-process (pas de broker) | une file en base suffit pour quelques classifications par minute | > 100 tâches simultanées ou besoin de reprise multi-nœuds |
| Pas de cache HTTP sur les projections | 22 puis quelques centaines de dossiers = requêtes SQL indexées rapides | p95 > 500 ms (ENF01) |
| Pas de PWA/hors ligne | explicitement phase 2 dans le CDC (ENF14) | demande terrain |
| Pas de 2e facteur | Z-02 | contrat SMS |
| Pas de graphiques libres | les répartitions se lisent en barres CSS | besoin d'analyse temporelle |
