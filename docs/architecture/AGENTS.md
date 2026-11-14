# AGENTS.md — docs/architecture

Ce dossier porte les décisions. Il ne contient aucun code.

## Règles
- Un arbitrage non tranché se tranche ici (`BESOIN.md`, section 4, `Z-nn`), pas dans le code.
- `ARCHITECTURE.md` décrit l'état cible ; si le code s'en écarte, c'est le code qui a tort, sauf ADR contraire.
- `MIGRATION.md` porte l'ordre des phases et les portes. Modifier une porte = modifier un engagement de livraison.
- Toute règle écrite ici doit être vérifiable : nommer la commande, le test ou le fichier qui la prouve.
- Aucun chiffre d'inventaire (nombre de routes, de modules, de tests) : il dérive. Nommer le critère.

## Quand mettre à jour
| Événement | Fichier |
|---|---|
| Nouveau doute structurant | `BESOIN.md` → nouveau `Z-nn` avec arbitrage + condition de réversibilité |
| Décision technique prise ou changée | `adr/ADR-00n-*.md` (nouveau fichier si changement) |
| Frontière de couche modifiée | `ARCHITECTURE.md` §4 + `src/AGENTS.md` |
| Phase livrée | `MIGRATION.md` : porte cochée avec la preuve observée |

## Vérification
`bun run verif:arch` doit rester vert après toute modification des règles de frontière.