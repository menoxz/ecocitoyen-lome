# AGENTS.md — docs/design

Ce dossier porte la conception visuelle et les parcours. Il ne contient aucun code.

## Statut
`DESIGN.md` et `PARCOURS.md` sont **bloquants** (`ADR-011`) : aucun écran de `src/web` n'est écrit
avant leur validation. Un écran produit sans eux est un défaut, pas un raccourci.

## Règles
- Un composant nouveau ⇒ une ligne dans la matrice §3 de `DESIGN.md` avec ses **huit états**
  (repos, survol, focus, actif, désactivé, chargement, erreur, vide) ou il n'entre pas dans `ui/`.
- Une couleur de statut, de priorité ou de motif ⇒ jeton dans `src/web/ui/jetons.ts` **et** ligne dans
  le tableau §2 ; jamais une valeur écrite dans un composant.
- Une cible de parcours (« 3 écrans », « 2 gestes ») est écrite avant l'écran, puis **mesurée** :
  la colonne est complétée par la mesure réelle. Un écart de plus de 50 % ⇒ correctif ou ADR.
- Un écran qui n'apparaît dans aucun parcours de `PARCOURS.md` n'est pas construit.
- Toute affirmation d'accessibilité se prouve par une commande (`node scripts/verifier-contrastes.mjs`)
  ou une mesure navigateur, jamais par une intention.
- Modification d'une couleur ⇒ relancer la vérification et consigner le ratio. Contrainte intenable ⇒
  nouvel ADR, pas d'amendement silencieux.
- Aucun inventaire de nombres dans ce dossier (30 composants, 8 indicateurs) : il dérive. Nommer le critère.

## Vérification
```
node scripts/verifier-contrastes.mjs      # 0 échec attendu
bun run verif:arch                        # aucun import interdit dans src/web
bun run build                             # JS initial < 1 Mo (ENF02)
```
