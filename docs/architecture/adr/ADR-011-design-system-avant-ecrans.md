# ADR-011 — Design system et parcours UX définis avant tout écran

**Statut** : Accepté — 14/11/2026
**Portée** : phase P7 (front). S''applique à tout écran produit ensuite.

## Contexte

Le prototype a construit ses huit écrans avant toute règle de style et tout parcours écrit :
`ReportDetailModal` pèse 42 916 octets et mélange affichage, transitions, gardes de rôle et
calcul de délais. Résultat mesurable : quatre grilles de couleur différentes pour un même statut
(`STATUS_CONFIG` dans `utils/helpers.ts`, `statusColors` dans `server.ts`, classes écrites à la main
dans les composants, couleurs codées dans les KPI), des libellés qui divergent (« Nouveau » vs
« En attente »), et des parcours découverts à l''écriture plutôt que décidés.

Le cahier des charges impose trois contraintes qui rendent l''improvisation coûteuse : mobile-first
à partir de 360 px (ENF11), cibles tactiles de 44 px et contrastes WCAG AA (ENF12), signalement en
trois écrans et 60 secondes (§2.3). Aucune de ces trois contraintes ne se rattrape après coup.

## Décision

**Aucun écran n''est écrit avant que les deux livrables suivants existent et soient validés.**

### 1. Design system (`docs/design/DESIGN.md`)
- **Jetons** : couleurs (statuts, priorités, sémantique succès/alerte/erreur), typographie (échelle,
  graisses), espacements (base 4 px), rayons, ombres, durées d''animation, points de rupture.
- **Un style obligatoire par composant** : chaque composant de `src/web/ui/` porte, dans son
  en-tête, la liste de ses états obligatoires (repos, survol, focus clavier, actif, désactivé,
  chargement, erreur, vide) et ses contraintes d''accessibilité (rôle ARIA, taille tactile,
  contraste). Un composant sans tous ses états est incomplet, pas « à finir ».
- **Règle de source unique** : une couleur de statut existe à un seul endroit
  (`src/web/ui/jetons.ts`), dérivée du vocabulaire du domaine. Aucune couleur écrite dans un
  composant, aucun `STATUS_CONFIG` dupliqué côté serveur.
- **Interdiction** : pas de valeur magique (`#10b981`, `p-3`, `text-lg`) dans un composant ; tout
  passe par un jeton nommé.

### 2. Parcours UX (`docs/design/PARCOURS.md`)
Pour chaque profil (visiteur, citoyen, agent, superviseur, administrateur) :
- le parcours métier de bout en bout, étape par étape, avec l''objectif de chaque étape ;
- le **coût en gestes** : nombre de clics, nombre d''écrans, temps cible — le signalement tient en
  trois écrans et 60 s (§2.3), la validation d''un dossier en trois gestes, la clôture d''une
  intervention en deux ;
- l''ordre des actions par **fréquence d''usage réel** (l''action quotidienne en un clic, l''action
  rarement utilisée repliée, l''action inutile absente) ;
- les états de chemin : premier usage, retour, erreur, hors ligne, dossier vide ;
- les écrans, listés avec leur rôle unique et les composants du design system qu''ils assemblent.

### 3. Ordre de production imposé
`jetons` → `ui/` (composants avec tous leurs états) → `parcours écrit et relu` → `écrans` →
`mesure` (bundle < 1 Mo, 360 px, contraste, 44 px).

## Conséquences

**Bénéfices**
- Les six vues se construisent par assemblage : un correctif de style touche un jeton, pas huit
  fichiers.
- Les parcours se contestent sur le papier (coût en gestes) avant d''être codés, donc avant d''être
  défendus devant une mairie.
- L''accessibilité et le mobile-first sont des contraintes de conception, pas une relecture finale.

**Coûts / contraintes**
- Deux livrables d''écriture avant la première ligne d''interface : environ une demi-journée, non
  compressible sans repayer plus tard.
- Le design system doit être maintenu : un composant ajouté sans ses états est refusé en revue.
- Un jeton mal nommé coûte un renommage global (assumé : c''est le prix d''une source unique).

## Alternatives évaluées

1. **Écrire les écrans d''abord, extraire un design system ensuite** — rejeté : c''est exactement ce
   que le prototype a fait, avec quatre sources de couleur et un composant de 42 916 octets.
2. **Utiliser une bibliothèque de composants prête (shadcn/Tailwind UI) sans jetons propres** —
   rejeté : apporte des composants mais pas la correspondance statut métier → style, et installe
   des valeurs magiques dans le code applicatif.
3. **Design system seul, sans parcours écrit** — rejeté : un style cohérent ne dit rien de l''ordre
   des gestes ; c''est le parcours qui tient les 60 secondes et les trois écrans.

## Liens

`Z-11`, `ADR-007` (front sans règle métier), `ENF11`, `ENF12`, `MIGRATION.md` phase P7.