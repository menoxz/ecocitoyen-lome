# ADR-008 — Indicateurs calculés depuis l''historique, jamais constants

**Statut** : Accepté — 14/11/2026
**Remplace** : `tauxRespectDelais = 88` et les valeurs de repli `tauxAccord = 92`, `scoreMoyen = 0.90`.

## Contexte

Trois des huit indicateurs du tableau de bord ne sont pas mesurés : le respect des délais est une constante, et deux indicateurs IA ont une valeur inventée quand la donnée manque. Or ces chiffres servent à piloter un service municipal et à démontrer la valeur du dispositif. Par ailleurs, les dates `date_validation` et `date_resolution` sont aujourd''hui écrites directement sur le signalement, alors que la source de vérité devrait être l''historique des transitions — sans quoi un rejeu ou une correction désynchronise les délais.

## Décision

- `historique_statut` est la **source unique** des dates de décision ; `date_validation`/`date_resolution` en sont des projections recalculables.
- Les formules du §13 du CDC sont écrites **une seule fois**, dans `domaine/indicateurs/formules.regle.ts`, sans accès base ni HTTP.
- Les délais cibles viennent de la table `parametre` (trois jalons × quatre priorités, valeurs CDC en amorçage, `Z-06`).
- Quand la donnée manque : `null` + `motif_indisponible`, jamais une valeur de remplacement.
- Un test compare la sortie au calcul manuel d''un jeu de référence couvrant les quatre priorités et les trois jalons (CR14).
- Table d''agrégats matérialisée : hors périmètre pilote, à introduire si le calcul dépasse ENF01 (p95 > 500 ms).

## Conséquences

**Bénéfices**
- Chaque chiffre affiché est défendable : on peut montrer le calcul et les dossiers qui le composent.
- Une correction de date (révision d''un rejet) recalcule les indicateurs sans script de réparation.
- Les formules deviennent testables, donc modifiables sans crainte.

**Coûts / contraintes**
- Agrégation à la lecture : coût en O(dossiers) par appel. Acceptable à 10 000 lignes ; au-delà, agrégats.
- Discipline sur l''écriture de l''historique : toute transition doit passer par le module de transitions, sinon une date manque.
- L''interface doit savoir afficher « non mesurable » sans que cela passe pour une panne.

## Alternatives évaluées

1. **Agrégats matérialisés mis à jour à chaque transition** — rejeté au pilote : complexité de cohérence (recalcul, rejeu) pour un volume que la lecture absorbe.
2. **Calculs dans chaque écran** — rejeté : c''est la situation actuelle, elle produit des définitions divergentes (le front et le serveur ne comptent pas la même population).
3. **Garder des valeurs de repli « réalistes »** — rejeté : un chiffre faux dans un tableau de bord municipal est une faute, pas une commodité de démonstration.

## Liens

`Z-05`, `Z-06`, `ADR-002`, `ARCHITECTURE.md` §11.