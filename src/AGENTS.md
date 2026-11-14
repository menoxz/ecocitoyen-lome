# AGENTS.md — src

Ne pas recopier ici ce que le harnais injecte déjà. Ni l''inventaire des dossiers — il dérive.

## Sens des dépendances (seule règle qui compte)
```
config    ─ aucune dépendance interne
contrats  ─ domaine, zod
domaine   ─ RIEN (aucune I/O, aucune lib)
ports     ─ domaine
application ─ domaine, ports
infrastructure ─ ports, domaine, config
interface ─ contrats, application, domaine, ports, config
web       ─ contrats
```
- Seul `src/interface/http/serveur.ts` importe `infrastructure` (composition root).
- Un import interdit ⇒ `bun run verif:arch` échoue. Ne pas contourner par un chemin relatif.

## Forme des fichiers
- Un fichier = une responsabilité. Nom : `sujet.role.ts` avec `role` ∈ `type | regle | cas | port | depot | routes | contrat | test`.
- ≤ 150 lignes, fonction ≤ 30 lignes, ≤ 4 paramètres. Au-delà : deux responsabilités.
- Export nommé uniquement. Pas de `export default`, pas de `any`, pas de barrel `index.ts`.
- Une erreur métier = `ErreurMetier(code)` de `contrats/erreurs.ts`. Jamais `throw new Error('phrase')`.
- Temps, hasard, identifiants : injectés (`Horloge`, `Identifiants`). Jamais `Date.now()` / `Math.random()` hors `infrastructure`.
- Tests colocalisés `*.test.ts` à côté de la règle testée.

## Recette d''ajout d''une fonctionnalité
1. La règle est-elle déjà dans `domaine/` ? Sinon l''écrire là, avec son test, avant tout le reste.
2. Cas d''usage dans `application/<module>/<action>.cas.ts` : charger → décider → persister → notifier → journaliser.
3. Contrat dans `contrats/<ressource>.contrat.ts` (entrée validée, sortie typée, codes d''erreur).
4. Route dans `interface/http/routes/` : contrat → RBAC → cas d''usage → projection. Zéro règle.
5. Adaptateur dans `infrastructure/` si un nouveau besoin extérieur apparaît ; interface dans `ports/` d''abord.
6. Front dans `web/features/<vue>/` : afficher, appeler, rien décider.

## Vérification
`bun run verif:arch` (frontières + interdits textuels) puis `bun run typecheck`.