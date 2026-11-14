# AGENTS.md — src/application

## Rôle
Orchestrer un cas d'usage complet. Ni règles, ni SQL, ni HTTP.

## Forme imposée
Un fichier = une action = `<action>.cas.ts` :
```ts
export async function executer(commande: Commande, deps: Dependances): Promise<Resultat>
```
Déroulé fixe, dans cet ordre :
1. charger l'agrégat par un port (`deps.signalements.parId`);
2. appeler la règle du domaine (jamais la réécrire ici) ;
3. persister dans **une** transaction ;
4. notifier (port `Notificateur`) ;
5. journaliser l'action sensible (port `Journal`) ;
6. retourner le résultat projeté.

## Interdits
- Importer `express`, `react`, `sqlite`, `fs`, `fetch`, `zod` (la validation est dans `contrats`, côté `interface`).
- Contenir une condition métier (`if (statut === 'VALIDE' && role === ...)`) : elle appartient au domaine. Ici on enchaîne, on ne décide pas.
- Écrire dans le journal sans acteur identifié : `acteur` est un paramètre obligatoire.
- Notifier avant de persister : l'ordre 3 → 4 → 5 est une garantie, pas un style.
- Un cas d'usage qui appelle un autre cas d'usage (enchaîner deux actions se décide dans une seule).

## Dépendances
Reçues en paramètre (`Dependances` typée par les ports). Aucun import de `infrastructure` : les implémentations arrivent par la composition root.

## Vérification
Un test par cas d'usage avec des ports en mémoire : succès, refus métier, et « rien n'est écrit quand la règle refuse ».