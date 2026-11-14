# ADR-007 — Front SPA React découpé par vues, sans règle métier

**Statut** : Accepté — 14/11/2026
**Remplace** : `src/App.tsx` + `src/components/*` (8 fichiers, jusqu''à 42 916 octets), où des gardes de rôle et des transpositions de statut sont décidées côté client.

## Contexte

Le front actuel cumule trois rôles : affichage, décision d''affichage des actions, et parfois règle métier (calcul des transitions visibles, du délai de 7 jours, des compteurs). Il consomme des routes non versionnées et des types dupliqués. Contraintes : mobile-first, écrans ≥ 360 px, JS initial ≤ 1 Mo, page utile en 3 s sur 4G (ENF01, ENF02, ENF11). Le public est un citoyen pressé et un agent sur le terrain ; aucun besoin de référencement.

## Décision

- **SPA React 19 + Vite** conservée (aucune réécriture de framework).
- Découpage par **vues métier** : `features/{carte, signalements, dossier, tableau-de-bord, administration, recette}`, plus `ui/` (composants sans logique) et `api/` (client typé sur les contrats).
- **Aucune règle** dans `src/web` : les actions disponibles sont fournies par le serveur (`actions_disponibles` dans la projection du signalement). Cacher un bouton n''est jamais une sécurité (RB06) ; ici le bouton existe parce que le serveur a dit oui.
- **Chargement différé par vue** (`React.lazy`) : Leaflet et le tableau de bord ne pèsent pas sur l''écran d''accueil (ENF02).
- **État serveur** : un client typé + hooks par ressource ; pas de bibliothèque de cache globale au pilote.
- **Textes externalisés** dans `i18n/fr.ts` (dictionnaire plat, pas de framework, `Z-11`).
- La vue « recette » lit l''état réel des tests, elle n''affiche pas de statut écrit à la main.

## Conséquences

**Bénéfices**
- Un seul endroit décide (le serveur) : l''interface ne peut pas inventer une transition.
- Bundle initial réduit et maîtrisé ; carte chargée seulement à l''ouverture de la vue.
- Chaque vue est remplaçable ou supprimable indépendamment.

**Coûts / contraintes**
- Une projection serveur doit exposer `actions_disponibles` : travail d''API supplémentaire, mais qui supprime la duplication des règles.
- Pas de rendu serveur : le premier affichage dépend du JS (mitigé par un squelette HTML et un bundle < 1 Mo).
- Pas de cache de données sophistiqué : refetch après action, acceptable à cette échelle.

## Alternatives évaluées

1. **Next.js / SSR** — rejeté : aucun besoin de SEO ni de rendu serveur ; ajouterait un serveur Node supplémentaire et une frontière floue entre règles serveur et composants serveur.
2. **Vue ou Svelte** — rejeté : réécriture complète du front sans bénéfice fonctionnel mesurable.
3. **HTMX / rendu serveur de fragments** — rejeté : la carte Leaflet et l''assistant de signalement demandent un état client riche ; le coût de réécriture est supérieur au gain.
4. **Conserver le découpage actuel par type de composant** — rejeté : un composant de 42 916 octets qui porte à la fois affichage, validation et transitions n''est pas éditable ni testable.

## Liens

`Z-11`, `ADR-004`, `ADR-001`, `ARCHITECTURE.md` §6 et §7.