# AGENTS.md — ADR

Une décision = un fichier. Format :

```
# ADR-00n — Titre à l'impératif
Statut : Accepté | Remplacé par ADR-00m | Déprécié — date
Contexte : forces, contraintes, mesure du problème
Décision : voix active, concret, ce qui est choisi
Conséquences : bénéfices + coûts assumés
Alternatives : 2 à 4, pourquoi rejetées
Liens : Z-nn, autres ADR, sections d'ARCHITECTURE.md
```

## Règles
- Un ADR accepté ne se modifie plus. Un changement ⇒ nouveau fichier + `Statut : Remplacé par ADR-00m` sur l'ancien.
- Numérotation continue, jamais de réutilisation de numéro.
- Interdit : un ADR sans alternatives ; un ADR sans conséquence négative ; un ADR qui décrit un souhait au lieu d'un choix.
- Une décision d'organisation (qui décide) ne remplace pas une décision technique : deux fichiers.
- Pas de tableau de comparaison sans critère mesurable (coût, latence, complexité, compétence, verrou).

## Vérification
`grep -c "^## Alternatives" docs/architecture/adr/*.md` = un par fichier ADR.