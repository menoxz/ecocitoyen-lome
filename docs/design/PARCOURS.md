# EcoCitoyen Lomé — Parcours UX

**Statut** : document bloquant (`ADR-011`). Aucun écran n'est écrit avant validation de ce document
et de `DESIGN.md`. Chaque coût annoncé ici est une **cible**, à mesurer après implémentation ; un
écart se corrige ou se documente, il ne se tait pas.

Version 1.0 — 15/11/2026.

---

## 1. Principes

1. **Le parcours le plus fréquent est le plus court.** L'agent ouvre l'application pour clôturer une
   intervention, pas pour admirer un tableau de bord : sa liste est le premier écran, pas la page d'accueil.
2. **Un écran = un objectif.** Si un écran sert deux objectifs, il en faut deux.
3. **Le coût est écrit avant d'être construit.** Trois écrans et soixante secondes pour signaler
   (§2.3 du CDC) : un composant qui ajoute une étape est refusé.
4. **Aucun chemin sans sortie.** Tout état vide ou d'erreur propose l'action qui débloque.
5. **Le droit ne se négocie pas à l'écran.** Les actions affichées viennent de `actions_disponibles`
   fourni par le serveur ; un bouton absent n'est pas une sécurité, un bouton présent non plus.

## 2. Légende des coûts

| Terme | Définition |
|---|---|
| **Geste** | une interaction élémentaire : un appui, une saisie, une sélection |
| **Saisie** | un geste qui demande du texte ou une photo |
| **Écran** | un changement de vue complet |
| **Temps cible** | durée totale mesurée sur mobile 4G, première fois comprise |

## 3. Parcours 1 — Citoyen : signaler (le parcours critique)

**Objectif** : transformer « il y a des ordures devant chez moi » en dossier opposable, sans compte préalable compliqué, en moins de 60 secondes.

| # | Écran | Action | Gestes cumulés | Temps |
|---|---|---|---|---|
| 0 | Accueil | bouton « Signaler un problème » | 1 | 3 s |
| 1 | Signalement — étape 1 : la preuve | prendre ou choisir **une** photo | +2 | 20 s |
| 2 | Signalement — étape 2 : le lieu | position GPS automatique, correction possible au doigt | +1 (ou +3 si correction) | 12 s |
| 3 | Signalement — étape 3 : le problème | catégorie (5 boutons visibles, pas de liste déroulante), description facultative mais comptée | +1 à +3 | 15 s |
| 4 | Confirmation | récapitulatif, « Envoyer » | +1 | 5 s |
| 5 | Reçu | statut Nouveau + numéro de dossier + « Suivre » | 0 | 5 s |

**Cible** : 3 écrans utiles (preuve, lieu, problème), 6 à 8 gestes, 60 s.
**Hors périmètre assumé** : pas de pré-sélection de catégorie par l'IA (`Z-04`) ; la suggestion arrive
après l'envoi et ne rallonge pas le parcours.

**États de chemin**
- Appareil photo indisponible (mode dégradé, RG08) : l'étape 1 devient « je déclare sans photo », avec une mention explicite du contrôle humain.
- Position refusée : saisie manuelle du repère + quartier, avec un message qui dit pourquoi la position aide.
- Doublon détecté (RG04) : proposition « Moi aussi » au lieu de créer, avec la distance et l'âge du dossier existant.
- Hors zone (CR11) : refus immédiat à l'étape 2, avec la commune couverte, avant toute saisie supplémentaire.
- Quota atteint (RG23) : message au moment de l'envoi, indiquant l'heure de réouverture.
- Réseau coupé : la photo et la saisie sont conservées localement, l'envoi reprend au retour.

## 4. Parcours 2 — Citoyen : suivre et contester

| # | Écran | Action | Gestes | Temps |
|---|---|---|---|---|
| 0 | Mes signalements | liste triée par date, statut et priorité visibles | 1 | 4 s |
| 1 | Dossier | historique en clair (« Validé le 14/11 par le service »), photo « après » si résolu | 1 | 6 s |
| 2 | Contester (dans les 7 jours) | commentaire obligatoire, envoi | +3 | 30 s |

**États de chemin** : délai dépassé ⇒ le bouton « Contester » est remplacé par la raison, pas par un bouton grisé muet. Résolution contestée ⇒ statut Rouvert expliqué en une phrase.

## 5. Parcours 3 — Visiteur : comprendre avant de s'engager

Carte publique + compteurs par quartier, sans compte. Un seul geste : cliquer un marqueur.
**Sortie** : « Signaler » (inscription) et « Voir les statistiques publiques ». Aucun dossier Nouveau
ni Rejeté visible : le serveur ne les envoie pas.

## 6. Parcours 4 — Agent : la journée de terrain (le plus fréquent)

**Objectif** : clôturer une intervention sur place, avec preuve, en deux gestes.

| # | Écran | Action | Gestes | Temps |
|---|---|---|---|---|
| 0 | Mes interventions | liste des dossiers de mon équipe, triés par priorité puis ancienneté | 0 (écran d'ouverture) | 2 s |
| 1 | Dossier | lecture, bouton « Démarrer » si planifié | 1 | 5 s |
| 2 | Clôture | photo « après » (appareil photo direct) + commentaire | +3 | 25 s |
| 3 | Reçu | confirmation + dossier suivant proposé | 0 | 2 s |

**Cible** : 2 gestes pour démarrer puis clôturer, une seule photo obligatoire, aucun champ administratif.
**États** : dossier d'une autre équipe ⇒ invisible dans la liste (le serveur refuse de toute façon, CR7).
Photo manquante ⇒ refus immédiat avec la raison (CR8). Hors ligne ⇒ saisie conservée, envoi différé.

## 7. Parcours 5 — Superviseur : trier la file (quotidien)

| # | Écran | Action | Gestes | Temps |
|---|---|---|---|---|
| 0 | File de tri | dossiers Nouveau, triés par priorité suggérée décroissante | 0 | 2 s |
| 1 | Dossier | photo, lieu, catégorie suggérée par l'IA **et** catégorie proposée par le citoyen, score de priorité avec sa décomposition | 1 | 10 s |
| 2 | Décision | « Valider » (catégorie + priorité pré-remplies) ou « Rejeter » (motif obligatoire parmi 7) | +1 (+2 si rejet) | 8 s |

**Cible** : 3 gestes pour valider, 4 pour rejeter. La file se vide sans ouvrir de menu.
**États** : validation impossible ⇒ le motif du refus est affiché tel quel (`TRANSITION_INTERDITE`,
`DROIT_REFUSE`). IA en simulation ⇒ bandeau visible et catégorie suggérée présentée comme une
proposition, jamais comme un fait.

## 8. Parcours 6 — Superviseur : affecter et surveiller les délais

| # | Écran | Action | Gestes |
|---|---|---|---|
| 0 | Dossiers validés | liste avec délai restant (tri / affectation / résolution) | 0 |
| 1 | Affectation | choix d'équipe (4 boutons), confirmation | 2 |
| 2 | Pilotage | 8 indicateurs, chacun avec sa période et sa formule | 1 |

**États** : délai dépassé ⇒ signalé visuellement **et** en texte (« 6 h de retard »), jamais la couleur seule. Indicateur non mesurable ⇒ « non mesurable » + motif, jamais 0.

## 9. Parcours 7 — Administrateur : gouverner sans casser

| Écran | Objectif | Gestes clés |
|---|---|---|
| Comptes internes | créer un agent/superviseur (mot de passe temporaire, changement forcé), désactiver, changer de rôle | 3 |
| Référentiels | quartiers, catégories (priorité de base), équipes | 2 |
| Paramètres | 12 délais cibles, rayons de doublon, seuil de corroboration, fenêtre de contestation | 2 |
| Journal d'audit | qui a décidé quoi, quand, avec filtre par action | 2 |

**États** : dernier administrateur actif ⇒ désactivation et changement de rôle refusés avec la raison (RB07).

## 10. États de chemin transverses

| Situation | Règle de conception |
|---|---|
| Premier usage | aucun tutoriel ; une phrase d'aide contextuelle au plus |
| Retour | l'état (filtres, position de liste) est conservé |
| Vide | une phrase qui explique pourquoi c'est vide + l'action qui sort de l'état |
| Erreur serveur | message du serveur en clair + geste de reprise ; jamais « une erreur est survenue » |
| Lent | squelette de la taille du contenu final, pas de spinner plein écran |
| Session expirée | retour à l'écran demandé après reconnexion, saisie conservée |
| Démonstration | bandeau permanent + sélecteur de rôle, montés uniquement si `MODE_DEMO` |

## 11. Écrans et composants assemblés

| Écran | Route | Composants (cf. `DESIGN.md` §3) |
|---|---|---|
| Carte publique | `/` | 28, 29, 16, 15, 14, 20 |
| Signaler — étape 1/2/3 | `/signaler` | 27, 8, 3, 5, 7, 1, 19 |
| Mes signalements | `/mes-signalements` | 13, 12, 9, 10, 24, 26 |
| Dossier | `/signalements/:id` | 12, 9, 10, 11, 22, 18, 1, 19, 28 |
| Mes interventions (agent) | `/interventions` | 13, 12, 9, 10, 24 |
| File de tri (superviseur) | `/tri` | 14, 13, 12, 9, 10, 16, 1, 18 |
| Pilotage | `/indicateurs` | 20, 21, 22, 24, 26 |
| Administration | `/administration` | 22, 1, 5, 19, 1 |
| Notifications | volet global | 23, 16, 24 |
| Recette (démo) | `/recette` | 22, 9, 19 |

Deux écrans partagent le même objectif ? Ils fusionnent. Un écran qui n'apparaît dans aucun parcours
n'est pas construit.

## 12. Mesures et vérification

| Cible | Comment on la vérifie |
|---|---|
| Signaler en ≤ 3 écrans et ≤ 60 s | chronométrage du parcours sur mobile réel, consigné ici |
| Clôture agent en ≤ 2 gestes + 1 photo | comptage des interactions du test de bout en bout |
| Validation superviseur en ≤ 3 gestes | comptage |
| Bundle initial < 1 Mo (ENF02) | `bun run build`, taille du chunk d'entrée |
| 360 px sans défilement horizontal | mesure navigateur à 360 × 640 |
| Contrastes et cibles tactiles | `node scripts/verifier-contrastes.mjs` + revue des 44 px |
| Aucune règle métier dans `src/web` | `bun run verif:arch` |

**Règle** : les valeurs de la colonne « gestes » sont des cibles ; après implémentation, la colonne est
complétée par la mesure réelle. Un écart de plus de 50 % se traite ou se documente dans un ADR.

## 13. Ce que ces parcours ne couvrent pas

- Hors ligne complet avec synchronisation différée (phase 2, PWA).
- Notifications e-mail et push : seules les notifications in-app existent au MVP.
- Multi-communes : un seul périmètre, Grand Lomé.
- Gestion des tournées et des moyens de collecte : hors périmètre du besoin.
