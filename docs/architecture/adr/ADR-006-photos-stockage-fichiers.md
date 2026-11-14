# ADR-006 — Photos stockées en fichiers, validées côté serveur

**Statut** : Accepté — 14/11/2026
**Remplace** : photos transmises en base64 dans le corps JSON et conservées en mémoire.

## Contexte

Le prototype envoie 1 à 3 photos en `data:` base64 dans un JSON de 15 Mo maximum, les garde en mémoire et les re-sert telles quelles. Conséquences : la charge utile d''une création atteint plusieurs mégaoctets (ENF02), rien n''est sauvegardé séparément (ENF05), aucune mise en cache HTTP n''est possible, et le serveur ne vérifie ni le type réel, ni les métadonnées (ENF08). Un client peut donc déposer du HTML étiqueté `.jpg` et le faire servir depuis le domaine de la mairie.

## Décision

- **Fichiers sur disque** : `data/photos/AAAA/MM/<uuid>.<ext>`, nom aléatoire, extension déduite du type détecté.
- **Validation serveur obligatoire** : signature binaire (magic bytes) limitée à JPEG/PNG/WebP, taille ≤ 5 Mo, dimensions maximales ; rejet explicite sinon (CR12).
- **Métadonnées retirées côté serveur** (ré-encodage ou suppression EXIF), sans faire confiance au client qui prétend l''avoir fait.
- **URL publique** `GET /medias/:id/fichier`, servie avec `Content-Type` imposé, `Content-Disposition: inline`, `X-Content-Type-Options: nosniff`, et dossier **hors** de toute racine exécutable/statique.
- **Le client compresse** (canvas, ≤ 1 Mo) pour la bande passante, mais son résultat n''est qu''une optimisation.
- **Port `StockagePhotos`** : implémentation disque au pilote, implémentation objet (S3/Hetzner) en cible sans changer le domaine.

## Conséquences

**Bénéfices**
- Corps de requête de quelques kilo-octets pour une création, réponse rapide en 4G.
- Sauvegarde indépendante de la base ; la base reste légère et copiable.
- Cache HTTP et en-têtes de sécurité maîtrisés, chemin d''exécution impossible.

**Coûts / contraintes**
- Deux choses à sauvegarder (base + fichiers) et donc une restauration à tester ensemble.
- Nettoyage des orphelins à prévoir (tâche) ; pas de transaction ACID entre disque et base.
- Un stockage objet deviendra préférable au-delà de quelques milliers de photos (réversibilité par le port).

## Alternatives évaluées

1. **Base64 en base (statu quo)** — rejeté : gonfle les échanges et la base, interdit le cache, ne prouve ni type ni innocuité.
2. **Stockage objet dès le pilote** — rejeté : dépendance réseau et facturation pour un volume initial de quelques dizaines de photos ; le port rend la bascule triviale plus tard.
3. **Dossier statique `public/uploads`** — rejeté : sert les fichiers sans contrôle de type ni d''en-têtes, et expose le dossier au bundler.

## Liens

`Z-09`, `ADR-002`, `ARCHITECTURE.md` §12.