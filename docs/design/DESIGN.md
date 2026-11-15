# EcoCitoyen Lomé — Design system

**Statut** : document bloquant (`ADR-011`). Aucun écran de `src/web` n'est écrit avant que ce document
et `PARCOURS.md` soient validés. Toute valeur affichée dans l'interface vient d'ici.

Version 1.0 — 15/11/2026. Preuve reproductible des contrastes : `node scripts/verifier-contrastes.mjs`.

---

## 1. Principes

1. **Une donnée, un style, un endroit.** Une couleur de statut existe une seule fois
   (`src/web/ui/jetons.ts`), dérivée du vocabulaire du domaine (`STATUTS`, `PRIORITES`, `MOTIFS_REJET`).
   Le legacy portait quatre sources de couleur pour un même statut : c'est l'erreur à ne pas refaire.
2. **Lisibilité avant affordance.** Un libellé suffit quand il informe ; une bordure, une ombre ou une
   icône ne s'ajoutent que si elles portent une information. Une action rare n'est pas affichée au repos.
3. **L'ordre des actions suit la fréquence d'usage réelle**, pas la disponibilité technique. L'action
   quotidienne est en un geste ; l'action rare est repliée ; l'action inutile n'existe pas.
4. **Le serveur décide, l'écran montre.** Aucun composant ne calcule une transition, un délai ou un
   indicateur : il affiche `actions_disponibles` et les valeurs reçues (RB06).
5. **Rien qui ne mesure pas.** Un indicateur absent s'affiche « non mesurable » avec son motif, jamais
   `0`, jamais une valeur plausible.
6. **Mobile d'abord, à 360 px.** Aucun écran ne se conçoit à 1440 px puis ne se compresse.

## 2. Jetons

### 2.1 Couleurs de base

| Jeton | Valeur | Usage |
|---|---|---|
| `--surface` | `#ffffff` | fond principal |
| `--surface-alt` | `#f6f7f9` | fond de section, en-tête de tableau |
| `--surface-sombre` | `#111827` | fond du mode contraste renforcé (impression, extérieur) |
| `--texte` | `#111827` | texte principal |
| `--texte-attenue` | `#4b5563` | métadonnées, aides, horodatages |
| `--bordure` | `#d1d5db` | séparateurs, contours de champ |
| `--primaire` | `#0f766e` | action principale, focus |
| `--primaire-survol` | `#115e59` | survol de l'action principale |
| `--succes` | `#15803d` | confirmation |
| `--alerte` | `#b45309` | avertissement |
| `--erreur` | `#b91c1c` | erreur, action destructive |
| `--info` | `#1d4ed8` | information neutre |

### 2.2 Correspondance métier — statuts (6)

Une seule source : `STATUTS` du domaine. Aucun libellé ni couleur de statut n'est écrit dans un composant.

| Statut | Sens pour l'usager | Texte | Fond | Contraste mesuré |
|---|---|---|---|---|
| `NOUVEAU` | reçu, en attente de tri | `#1d4ed8` | `#eff6ff` | 6.16 |
| `VALIDE` | pris en charge par le service | `#6d28d9` | `#f5f3ff` | 6.48 |
| `EN_COURS` | intervention en cours | `#b45309` | `#fffbeb` | 4.84 |
| `RESOLU` | traité, preuve disponible | `#15803d` | `#f0fdf4` | 4.79 |
| `REJETE` | écarté, motif affiché | `#b91c1c` | `#fef2f2` | 5.91 |
| `ROUVERT` | résolution contestée | `#c2410c` | `#fff7ed` | 4.88 |

`NOUVEAU` et `REJETE` ne sont jamais visibles d'un visiteur ni d'un autre citoyen (§5.1) : l'écran ne
filtre pas, le serveur ne les envoie pas.

### 2.3 Correspondance métier — priorités (4)

| Priorité | Texte | Fond | Contraste mesuré | Signification de terrain |
|---|---|---|---|---|
| `BASSE` | `#374151` | `#f3f4f6` | 9.37 | nuisance sans risque |
| `NORMALE` | `#0369a1` | `#e0f2fe` | 5.17 | traitement courant |
| `HAUTE` | `#92400e` | `#fef3c7` | 6.37 | site sensible ou corroboration |
| `URGENTE` | `#991b1b` | `#fee2e2` | 6.8 | risque sanitaire, délai 72 h |

### 2.4 Typographie

| Jeton | Taille / interligne | Graisse | Usage |
|---|---|---|---|
| `--texte-xs` | 12 px / 16 px | 500 | métadonnées, badge |
| `--texte-sm` | 14 px / 20 px | 400 | corps dense, tableaux |
| `--texte-md` | 16 px / 24 px | 400 | corps par défaut, champs |
| `--texte-lg` | 20 px / 28 px | 600 | titre de section |
| `--texte-xl` | 24 px / 32 px | 700 | titre d'écran |
| `--texte-2xl` | 32 px / 40 px | 700 | chiffre d'indicateur |

Police système uniquement (`system-ui`, `-apple-system`, `Segoe UI`, `Roboto`) : zéro police
téléchargée, donc zéro saut de rendu sur réseau lent (ENF01).

### 2.5 Espacements, rayons, ombres, durées

| Famille | Jetons |
|---|---|
| Espacement (base 4 px) | `--e-1` 4 · `--e-2` 8 · `--e-3` 12 · `--e-4` 16 · `--e-6` 24 · `--e-8` 32 · `--e-12` 48 |
| Rayon | `--r-sm` 4 px · `--r-md` 8 px · `--r-pilule` 9999 px |
| Ombre | `--o-1` `0 1px 2px rgb(0 0 0 / .06)` · `--o-2` `0 4px 12px rgb(0 0 0 / .10)` |
| Durée | `--d-rapide` 120 ms · `--d-normal` 200 ms (aucune animation au-delà, `prefers-reduced-motion` respecté) |
| Point de rupture | `--rupture-sm` 640 px · `--rupture-md` 900 px · `--rupture-lg` 1200 px |

### 2.6 Tailles tactiles et focus

| Contrainte | Valeur | Origine |
|---|---|---|
| Cible tactile minimale | 44 × 44 px, y compris pour une icône seule | ENF12 |
| Bordure de focus | 2 px `--primaire`, décalage 2 px, jamais supprimée | accessibilité clavier |
| Espacement minimal entre deux cibles | 8 px | évite le mauvais doigt sur mobile |
| Corps de texte minimal | 16 px dans un champ (évite le zoom iOS) | ENF11 |

## 3. Composants — style obligatoire

**Règle** : un composant sans tous ses états est incomplet, pas « à finir ». La revue refuse un
composant dont une case de ce tableau est vide ou non justifiée.

Légende des états : **R** repos · **H** survol · **F** focus clavier · **A** actif/appuyé ·
**D** désactivé · **L** chargement · **E** erreur · **V** vide (aucune donnée).

| # | Composant (`src/web/ui/`) | R | H | F | A | D | L | E | V | Notes d'état obligatoires |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `Bouton` | ● | ● | ● | ● | ● | ● | — | — | en `L` : libellé conservé, largeur figée, `aria-busy` |
| 2 | `BoutonIcone` | ● | ● | ● | ● | ● | ● | — | — | 44 px ; libellé accessible obligatoire |
| 3 | `ChampTexte` | ● | ● | ● | — | ● | — | ● | — | message d'erreur lié par `aria-describedby` |
| 4 | `ChampZoneTexte` | ● | ● | ● | — | ● | — | ● | — | compteur 10–500, jamais bloquant avant l'envoi |
| 5 | `ChampSelect` | ● | ● | ● | ● | ● | — | ● | ● | en `V` : option « Sélectionner… » non validable |
| 6 | `ChampTelEmail` | ● | ● | ● | — | ● | — | ● | — | clavier adapté, autocomplétion |
| 7 | `CaseConsentement` | ● | ● | ● | ● | ● | — | ● | — | texte de consentement toujours visible (RG27) |
| 8 | `ZoneDepotPhoto` | ● | ● | ● | ● | ● | ● | ● | ● | 1 à 3 photos ; `V` = invite appareil photo ; `E` = fichier refusé avec le motif du serveur |
| 9 | `BadgeStatut` | ● | — | — | — | — | — | — | — | couleur issue du jeton de statut uniquement |
| 10 | `BadgePriorite` | ● | — | — | — | — | — | — | — | affiche aussi le score de priorité suggéré |
| 11 | `BadgeMotif` | ● | — | — | — | — | — | — | — | 7 motifs du domaine, jamais un texte libre |
| 12 | `CarteSignalement` | ● | ● | ● | ● | — | ● | — | — | photo, statut, priorité, quartier, âge relatif, `nb_confirmations` |
| 13 | `Liste` / `LigneListe` | ● | ● | ● | ● | — | ● | — | ● | `V` = `EtatVide` avec l'action de sortie |
| 14 | `OngletsFiltres` | ● | ● | ● | ● | ● | — | — | ● | 7 onglets (6 statuts + tous) avec compteurs |
| 15 | `BarreRecherche` | ● | ● | ● | — | ● | ● | — | — | effacement accessible |
| 16 | `Modale` | ● | — | ● | — | — | — | — | — | focus piégé, `Échap` ferme, retour du focus à l'ouvreur |
| 17 | `TiroirMobile` | ● | ● | ● | — | — | — | — | — | même contrat que `Modale` |
| 18 | `BandeauInfo` | ● | — | — | — | — | — | — | — | porte la mention « Classification simulée » (RG18) |
| 19 | `Alerte` | ● | — | — | — | — | — | ● | — | toujours liée à une action ou à un champ |
| 20 | `IndicateurKPI` | ● | — | — | — | — | ● | — | ● | `V` = « non mesurable » + motif, jamais 0 |
| 21 | `BarreRepartition` | ● | ● | ● | — | — | ● | — | ● | valeur numérique écrite à côté de la barre |
| 22 | `Tableau` | ● | ● | ● | — | — | ● | — | ● | en-têtes triables, tri annoncé |
| 23 | `NotificationItem` | ● | ● | ● | ● | — | — | — | ● | non-lue distinguée par plus que la couleur |
| 24 | `EtatVide` | ● | — | — | — | — | — | — | ● | une phrase qui explique, une action qui sort |
| 25 | `EtatErreur` | ● | — | — | — | — | — | ● | — | message du serveur + geste de reprise |
| 26 | `EtatChargement` | — | — | — | — | — | ● | — | — | squelette de la même taille que le contenu |
| 27 | `FilParcours` | ● | — | — | — | — | — | — | — | 3 étapes nommées, étape courante annoncée |
| 28 | `Carte` (Leaflet) | ● | ● | ● | ● | — | ● | ● | ● | `E` = fond de carte indisponible, `V` = aucun signalement dans la vue |
| 29 | `MarqueurStatut` | ● | ● | ● | ● | — | — | — | — | couleur du statut, forme différente par priorité (pas la couleur seule) |
| 30 | `SelecteurRoleDemo` | ● | ● | ● | ● | ● | — | — | — | monté uniquement si `MODE_DEMO`, bandeau visible |

### 3.1 Fiches des composants structurants

**`Bouton`** — variantes : `primaire` (une seule par écran), `secondaire`, `texte`, `danger`
(confirmation obligatoire). Tailles : `sm` 36 px, `md` 44 px (défaut), `lg` 52 px (action de parcours).
En `D` : opacité 0.5 + `aria-disabled`, jamais retiré du DOM (le clavier doit pouvoir l'atteindre).
En `L` : libellé inchangé, indicateur à droite, `aria-busy="true"`, double-clic impossible.

**`ChampTexte`** — label au-dessus, jamais en placeholder. Aide en dessous, erreur à la place de l'aide
en `--erreur`. `E` ne s'affiche qu'après interaction ou envoi, jamais à l'ouverture. Champ de recherche :
`type="search"`, effacement accessible.

**`BadgeStatut`** — pastille + libellé en français, jamais la couleur seule (daltonisme). Libellés :
« Nouveau », « Validé », « En cours », « Résolu », « Rejeté », « Rouvert ».

**`ZoneDepotPhoto`** — 3 emplacements au maximum, 5 Mo par photo, types JPEG/PNG/WebP annoncés à
l'utilisateur. La compression se fait côté client, l'erreur affichée est le message du serveur
(`PHOTO_INVALIDE`, motif compris). Mode dégradé : l'utilisateur peut déclarer « sans photo », et
l'écran l'indique explicitement (RG08).

**`CarteSignalement`** — ordre de lecture imposé : photo, statut, priorité, description tronquée à
deux lignes, quartier, âge relatif. L'identité de l'auteur n'apparaît jamais ici (RG28).

**`IndicateurKPI`** — un chiffre, une unité, une période, et la formule en info-bulle. Si la valeur est
`null` : « non mesurable », le motif en dessous, aucune barre tracée.

### 3.2 Disposition des listes et pagination

Une page suit la hiérarchie de découverte : donnée globale, puis liste, puis état de chaque objet,
puis détail. Ce chapitre fixe comment la liste s''occupe l''écran.

**Colonne ou grille — la règle dépend de la densité de l''objet, jamais du goût :**

| Objet | Disposition | Seuil |
|---|---|---|
| Carte riche (photo, description, puces, action) | une colonne, pleine largeur | < 900 px |
| Carte riche de la file de service (espace agent) | grille de 2 colonnes | ≥ 900 px |
| Objet court (intitulé + valeur + état) | une colonne | < 1100 px |
| Objet court | grille de 2 colonnes | ≥ 1100 px |

En dessous de 1100 px, tout repasse en une colonne : la largeur de lecture prime sur la densité.
La classe `ui-grille-objets` porte cette règle ; un écran ne réécrit pas de `grid-template` local.

**Pagination :**

- 8 objets par page pour les listes de service (`TAILLE_PAGE`).
- Le compteur « 9–16 sur 23 » est obligatoire : sans lui, le lecteur ne sait pas où il est.
- Numéros de page en boutons de 44 px minimum ; la fenêtre montre au plus 5 numéros.
- Une page hors bornes est ramenée dans la liste : jamais une page vide après un filtre.
- Une recherche ou un changement de facette ramène à la page 1.

**Détail :**

- Le détail d''un objet s''ouvre dans une **modale**, jamais dans un dépliant sous la ligne :
  il prend le focus, la liste reste intacte derrière, et la fermeture ramène à l''objet d''origine.
- Une modale porte toujours un titre, une fermeture par bouton et par Échap.
- Sur mobile, la modale occupe la largeur disponible (`pleineLargeur`) et défile à l''intérieur.
## 4. Accessibilité et mobile — contraintes de conception

| Contrainte | Règle | Vérification |
|---|---|---|
| Contraste texte | ≥ 4.5:1 (≥ 3:1 pour un élément non textuel porteur de sens) | `node scripts/verifier-contrastes.mjs` |
| Cible tactile | ≥ 44 × 44 px, ≥ 8 px d'écart | revue + mesure au navigateur |
| Clavier | ordre de tabulation = ordre de lecture, focus visible partout, `Échap` ferme une modale | revue au clavier |
| Lecteur d'écran | libellé explicite sur chaque action ; statut annoncé en texte ; erreurs liées au champ | revue |
| Mouvement | `prefers-reduced-motion` respecté ; aucune animation > 200 ms | revue |
| Largeur | utilisable de 360 px à 1440 px ; aucune information portée par la couleur seule | mesure |
| Zoom | lisible à 200 % sans perte de contenu ni défilement horizontal | mesure |

## 5. Interdits

1. Une valeur littérale dans un composant (`#10b981`, `padding: 12px`, `font-size: 18px`) : tout passe par un jeton.
2. Une couleur de statut ou de priorité écrite hors de `jetons.ts`.
3. Un second dictionnaire de libellés : les textes vivent dans `src/web/i18n/fr.ts`.
4. Un calcul métier dans un composant (transition, délai, indicateur, score).
5. Un composant sans état `D` quand l'action peut être indisponible, ou sans `V` quand la donnée peut manquer.
6. Une icône seule sans libellé accessible.
7. Une information portée uniquement par la couleur (statut, priorité, erreur).
8. Un masquage d'action comme contrôle de droit : le serveur refuse (RB06).

## 6. Ordre de production imposé

`jetons.ts` → `ui/` (composants complets, chaque état de la matrice §3) → parcours (`PARCOURS.md`) →
écrans → mesures (bundle initial < 1 Mo, 360 px, contrastes, 44 px).

Un composant ajouté après coup repasse par ce document : pas de style « local à un écran ».

## 7. Gouvernance

| Événement | Geste |
|---|---|
| Nouveau statut, priorité ou motif dans le domaine | nouvelle ligne dans le tableau §2.2/§2.3 + jeton + test de contraste |
| Nouveau composant | ligne dans la matrice §3 avec ses huit états, ou il n'entre pas |
| Modification d'une couleur | relancer `verifier-contrastes.mjs`, ratio consigné dans le tableau |
| Contrainte non tenable | nouvel ADR ; ce document n'est pas amendé en silence |


