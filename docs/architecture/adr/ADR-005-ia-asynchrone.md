# ADR-005 — Classification IA asynchrone, après enregistrement, avec simulation étiquetée

**Statut** : Accepté — 14/11/2026
**Remplace** : `POST /api/ai/classify` appelé par le navigateur avant l'envoi du signalement.

## Contexte

Le prototype appelle Gemini depuis le formulaire, attend la réponse, présélectionne une catégorie si le score dépasse 0,80, puis envoie le signalement. Trois inconvénients mesurés : la latence d'un modèle de vision s'ajoute au parcours (objectif 3 écrans / 60 s, ENF11) ; sans clé, un tirage aléatoire parmi 3 catégories est présenté comme une analyse ; et l'appel n'est pas traçable (aucun enregistrement du mode utilisé, donc aucun indicateur de qualité IA fiable). Le CDC §8.2 prescrit un appel **asynchrone**.

## Décision

1. **L'enregistrement ne dépend jamais de l'IA.** `creer.cas` écrit le signalement avec la catégorie choisie par le citoyen et crée une tâche `classification_ia`.
2. **Worker in-process** (`infrastructure/travaux/worker.ts`) : file persistée en table `tache`, 3 tentatives, délai maximum 5 s par appel, reprise au démarrage.
3. **Écriture dans des champs dédiés** : `id_categorie_ia`, `score_ia`, `mode_ia`, `justification_ia`. Le choix du citoyen (`id_categorie`) n'est jamais écrasé (RG01 : la priorité et la décision ne dépendent pas de l'IA).
4. **Mode explicite** : `MODELE` ou `SIMULATION`. En simulation, la réponse porte `simulation_notice` et l'interface l'affiche (RG18). Une panne (CR13) laisse le signalement accepté.
5. **Traçabilité** : chaque classification écrit le modèle et la version utilisés ; l'indicateur de qualité IA compare catégorie finale et catégorie suggérée (`ia_desaccord`).

## Conséquences

**Bénéfices**
- Le parcours mobile reste sous 60 s même sans réseau correct.
- CR13 est satisfait par construction : l'indisponibilité de l'IA n'est plus un chemin d'erreur de la création.
- L'indicateur « qualité IA » devient mesurable, donc défendable devant un jury ou une mairie.

**Coûts / contraintes**
- La suggestion arrive après coup : le citoyen ne la voit pas pendant la saisie, et le formulaire perd l'effet de pré-remplissage.
- Une file et un worker à superviser (tâches bloquées, tentatives).
- Le worker tourne dans le processus applicatif : pas de reprise multi-nœuds (assumé, voir `ARCHITECTURE.md` §16).

**Réversibilité** : un aperçu synchrone facultatif (`POST /ia/apercu`, qui n'écrit rien et ne bloque jamais l'envoi) peut être ajouté sans changer cette décision.

## Alternatives évaluées

1. **Synchrone avant envoi (statu quo)** — rejeté : contraire au CDC, dégrade le parcours, et confond suggestion et décision.
2. **Synchrone après envoi (attendre la classification avant de répondre 201)** — rejeté : déplace la latence sans supprimer le couplage ; une panne IA devient une panne de création.
3. **Pas d'IA, catégorie choisie par liste** — rejeté : le CDC exige une classification assistée (EF35-EF37) et un mode simulation de secours.
4. **Modèle local embarqué** — rejeté : poids et coût d'entraînement incompatibles avec un pilote sur un seul VPS ; à reconsidérer si les photos de Lomé deviennent un jeu d'entraînement exploitable.

## Liens

`Z-04`, `Z-05`, `ADR-001`, `ARCHITECTURE.md` §10.