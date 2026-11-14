# EcoCitoyen Lomé — Reformulation du besoin et arbitrages

Version 1.0 — 14/11/2026. Source : `docs/Cahier_des_Charges_ECOCITOYEN_v2.docx` + lecture complète du code au 14/11/2026.

---

## 1. Le besoin, en une phrase

> Un habitant de Lomé constate un dépôt sauvage, un caniveau bouché ou des déchets dangereux : il doit pouvoir le prouver et le localiser en moins d'une minute depuis son téléphone, et obtenir une réponse traçable — qui a décidé, pourquoi, quand, avec quelle preuve du nettoyage.

Et son corollaire, qui est la vraie difficulté :

> Le service municipal doit pouvoir **décider vite sur une pile de signalements non fiables**, prouver à un tiers que ses décisions sont conformes à ses propres règles, et mesurer sa performance sans recomposer les chiffres à la main.

## 2. Ce que le besoin n'est pas

| Attendu tentant | Pourquoi ce n'est pas le besoin |
|---|---|
| Un tableau de bord de statistiques | Le tableau de bord est un moyen de contrôle, pas la finalité. Un KPI sans donnée fiable est un mensonge. |
| Un classifieur d'images | L'IA ne décide rien : elle propose une catégorie et un score. RG01 : la priorité ne dépend pas de l'IA. |
| Un réseau social de propreté | Pas de commentaires, pas de fil, pas de like. Seule interaction citoyenne : « Moi aussi » et contester une résolution. |
| Une application de collecte | Elle ne planifie pas les tournées, ne gère pas les camions, ne pèse pas les tonnages. Un signalement = un problème ponctuel localisé. |
| Un produit multi-villes | Zone pilote = Grand Lomé. Hors zone = refus explicite, pas un mode dégradé. |

## 3. Qui décide de quoi (chaîne de responsabilité)

```
Citoyen ── signale ──▶ SIGNALEMENT (Nouveau)
                           │  décision : valider / rejeter  ← Superviseur
                           ▼
                        VALIDE ── affecte ──▶ INTERVENTION ──▶ Agent d'équipe
                           ▲                                      │
                           │                                  photo « après »
                           └──── annulation ◀─────────── EN COURS ─┘
                                                          │ résout
                                                          ▼
                                                        RESOLU ── conteste (7 j) ──▶ ROUVERT
```

Trois invariants que toute l'architecture sert :
1. **Aucune transition sans acteur identifié ni trace.** Le serveur refuse, l'interface n'est qu'un affichage.
2. **Aucune décision ne se perd.** L'historique est append-only ; les KPI en dérivent.
3. **Aucune action interdite ne passe par un bouton caché.** RB06.

## 4. Zones d'ombre — arbitrages

Chaque arbitrage est pris avec l'information disponible, daté, et réversible (mention de l'arbitrage inverse). Numéro stable `Z-nn` réutilisé dans les ADR.

### Z-01 — Prototype de hackathon ou produit pilote réel ?
**Arbitré : produit pilote réel, avec un mode démonstration explicite.**
Le CDC décrit une recette, des données personnelles réelles, une loi togolaise (RG31), une sauvegarde (ENF05) : ce n'est pas un exercice. Mais la démonstration doit rester possible sans infrastructure : `MODE_DEMO=true` charge le jeu fictif, affiche un bandeau et ouvre la bascule de profil. Hors de ce mode, aucune bascule de rôle n'existe.
**Ratifié le 14/11/2026 par le commanditaire** : produit pilote réel, mode démonstration conservé. Une demande inverse rouvrirait ADR-003.

### Z-02 — Comment un citoyen s'authentifie-t-il ?
**Arbitré : identifiant (e-mail ou téléphone) + mot de passe, session serveur en base, cookie `httpOnly`. Pas d'OTP SMS.**
Raisons : un OTP SMS coûte de l'argent par envoi et dépend d'un opérateur togolais non contractualisé ; le mot de passe + verrouillage après 5 échecs (RG24) suffit au pilote ; le téléphone reste un identifiant, pas un facteur.
*Réversible si* : un contrat SMS apparaît → ajouter un second facteur OTP sur le même module `compte`, sans toucher au reste.

### Z-03 — Où vivent les données ?
**Arbitré : SQLite en pilote, PostgreSQL en cible ; une seule couche de dépôts.**
Le volume réel du CDC est 10 000 signalements (ENF03) sur une seule commune : un fichier SQLite tenu par `better-sqlite3` répond en moins d'une milliseconde, se sauvegarde par copie de fichier (ENF05) et ne demande aucun serveur à administrer. PostgreSQL + PostGIS ne deviendra nécessaire que pour des requêtes de zones ou plusieurs communes.
*Réversible si* : second nœud applicatif ou besoin PostGIS → nouvelle implémentation de `DepotSignalements`, aucune règle métier touchée (ADR-002).

### Z-04 — L'IA propose-t-elle avant l'envoi ?
**Arbitré : après l'envoi, en asynchrone serveur.**
Le CDC est explicite (§8.2 : « appelé de façon asynchrone ») et l'objectif est « 3 écrans, 60 secondes ». Attendre un modèle de vision sur un téléphone en 4G casse cet objectif et le mode dégradé. Le citoyen choisit donc sa catégorie — il est le seul à voir le tas d'ordures — et l'IA propose ensuite, dans des champs séparés (`id_categorie_ia`, `score_ia`), que le superviseur utilise ou ignore.
Conséquence assumée : l'IA ne pré-sélectionne plus la catégorie dans le formulaire. C'est une perte de « waouh » en démonstration, gagnée en robustesse et en conformité.
**Ratifié le 14/11/2026 par le commanditaire** : la perte de pré-sélection est acceptée. Un aperçu facultatif reste possible sans revenir sur la décision.

### Z-05 — Qui garantit les chiffres du tableau de bord ?
**Arbitré : le module `indicateurs`, à partir de l'historique, avec les formules du CDC écrites une seule fois.**
Le code actuel affiche un respect des délais **figé à 88** et un taux d'accord IA de repli à 92 : ce ne sont pas des mesures. Un indicateur non calculable doit s'afficher « non mesurable » et expliquer pourquoi, jamais une valeur inventée.
*Réversible : non* — afficher un faux chiffre à une mairie est une faute, pas un choix.

### Z-06 — Les délais cibles : une ou trois valeurs ?
**Arbitré : trois jalons par priorité (tri, affectation, résolution), stockés en base et versionnés.**
Le CDC §5.3 donne trois délais par niveau ; le code actuel n'en porte qu'un (`delayMax`) et se trompe (Urgente = 72 h alors que la résolution cible est 72 h mais le tri 12 h). Trois jalons rendent l'indicateur « respect des délais » calculable par étape.
Table de démarrage (paramétrable, valeurs CDC) :

| Priorité | Tri | Affectation | Résolution |
|---|---|---|---|
| Urgente | 12 h | 24 h | 72 h |
| Haute | 48 h | 48 h | 7 j |
| Normale | 48 h | 72 h | 14 j |
| Basse | 48 h | 5 j | 30 j |

### Z-07 — La priorité est-elle un calcul courant ou un fait daté ?
**Arbitré : calculé à la création, recalculé à la confirmation et à la fusion, puis figé ; surclassement superviseur tracé.**
Un score qui se recalcule tout seul rend impossible de dire *pourquoi* un dossier était urgent hier. Chaque évolution du score écrit une ligne d'historique.
*Réversible* : un recalcul rétroactif reste possible en rejouant `history`, il n'est simplement pas fait à la lecture.

### Z-08 — Doublons : quelle règle fait foi ?
**Arbitré : RG04 du CDC — même catégorie, moins de 30 m, moins de 30 jours, trois valeurs en configuration.**
Le code cherche à 50 m, toutes catégories, sans limite d'âge : il propose de confirmer un caniveau bouché parce qu'un tas d'ordures est à 40 m. Trois filtres, un seul module (`domaine/signalement/doublon`).

### Z-09 — Où sont les photos ?
**Arbitré : fichiers sur disque, chemins en base, URLs servies par l'application ; validation du type réel côté serveur.**
Une photo en base64 dans un JSON gonfle la charge utile d'un tiers, ne se sauvegarde pas séparément et interdit tout cache HTTP (ENF02, ENF08). Le client compresse pour économiser la bande passante ; le serveur re-vérifie et re-nettoie les métadonnées, parce qu'un client ne se croit pas.
*Réversible si* : volume supérieur à quelques milliers de photos → même port `StockagePhotos`, implémentation S3/Hetzner (ADR-006).

### Z-10 — Annexe de zone : rectangle ou polygone ?
**Arbitré : polygone GeoJSON de la commune, avec repli rectangle si le fichier est absent.**
Le rectangle actuel (`lat 6.08–6.25`, `lon 1.12–1.35`) contient la mer, une partie du Ghana et des quartiers hors commune. Accepter un signalement dans la mer puis le rejeter à la main coûte plus cher que 30 lignes de point-dans-polygone.

### Z-11 — La langue : i18n maintenant ?
**Arbitré : dictionnaire TypeScript unique (`src/web/i18n/fr.ts`), aucun framework i18n.**
ENF12 demande des textes externalisés pour une traduction ultérieure, pas une traduction. Un dictionnaire plat suffit ; `react-i18next` serait une dépendance pour une langue.

### Z-12 — Faut-il découper en services ?
**Arbitré : non. Monolithe modulaire, un processus, frontières vérifiées par script.** Voir ADR-001 et la comparaison d'approches.

### Z-13 — Qui a le droit d'exporter ?
**Arbitré : superviseur et administrateur ; l'export est journalisé avec son filtre.**
L'export complet est aujourd'hui ouvert à tous, y compris à un visiteur, et contient l'identité des auteurs par jointure implicite. Un export est une fuite potentielle : il se contrôle et se trace.

### Z-14 — Le journal d'audit : quoi dedans ?
**Arbitré : toute action qui change une décision ou un droit — transitions de statut, changement de priorité, masquage de photo, changement de rôle/activation de compte, export, connexion, réinitialisation.**
Pas de chaînage cryptographique (complexité injustifiée en pilote) ; conservation 12 mois puis purge (ENF09).

### Z-15 — Que faire du code actuel ?
**Arbitré : gel puis migration strate par strate ; suppression à la fin, jamais de réécriture en un seul geste.** Voir `MIGRATION.md`. `server.ts` et `src/components/*` restent la référence fonctionnelle tant qu'ils tournent.

## 5. Contraintes non négociables

| Contrainte | Origine | Conséquence architecturale |
|---|---|---|
| Contrôle des droits côté serveur | RB06, EF03 | Aucune règle de droit dans le front ; middleware + cas d'usage |
| Machine à états fermée (T0-T9) | §5.1 | Un seul module de transitions, refus explicite des autres |
| Traçabilité des actions sensibles | RB08, ENF09 | Journal append-only écrit par les cas d'usage, pas par les routes |
| Zone pilote Grand Lomé | §1.4, CR11 | Contrôle de zone dans le domaine, avant écriture |
| Mobile-first, 3 écrans, 60 s | §2.3, ENF11 | Le formulaire ne dépend d'aucun appel bloquant (Z-04) |
| Poids ≤ 1 Mo de JS | ENF02 | Découpage par vue, pas d'import de Leaflet sur l'accueil |
| Données personnelles minimisées | RG27-RG31 | Identité de l'auteur hors des projections publiques, pas filtrée à l'affichage |
| Recette prouvable | §11.2 | CR1-CR14 exécutés par des tests, pas affichés en dur |
