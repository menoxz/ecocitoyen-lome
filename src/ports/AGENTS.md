# AGENTS.md — src/ports

## Rôle
Déclarer ce dont l''application a besoin du monde extérieur. Interfaces seules : aucune implémentation, aucun import de bibliothèque.

## Règles
- Nom : `<capacite>.port.ts`, interface nommée par le besoin (`DepotSignalements`, `ClassificateurIA`, `Horloge`). Pas de suffixe technique dans le nom de l''interface.
- Signature en vocabulaire métier : `parId(id: IdentifiantSignalement): Promise<Signalement | null>`, jamais `query(sql)`.
- Un port n''existe que s''il a **deux implémentations prévues** (réel + test, ou disque + objet). Sinon, c''est une abstraction gratuite : ne pas la créer.
- Les erreurs d''infrastructure ne fuient pas : le port traduit (`null`, `ErreurMetier`, ou une erreur typée du port).
- Pagination et filtres explicites (`{ limite, curseur, filtres }`), jamais un `any[]` non borné.
- Interdit : importer `infrastructure`, `interface`, `application` ; importer `fs`, `http`, `sqlite`.

## Vérification
`bun run verif:arch` ; toute implémentation de port est accompagnée d''un double en mémoire dans `tests/` (sinon le test de l''application est impossible).