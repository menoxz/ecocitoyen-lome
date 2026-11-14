# AGENTS.md — src/infrastructure

## Rôle
Parler au monde réel : SQL, disque, fournisseur d'IA, horloge, identifiants. Traduire entre le vocabulaire métier et la technique.

## Règles
- Un adaptateur implémente **un** port, nommé `<port>-<techno>.ts` (`stockage-disque.ts`, `depot-signalements.sqlite.ts`).
- SQL explicite et paramétré. Aucune concaténation de valeur dans une requête. Une migration = un fichier `migrations/00N-*.sql`, jamais modifié après application.
- Toute colonne écrite a une contrainte si elle porte une règle (unicité, `NOT NULL`, index partiel). Une règle qui peut tenir dans le schéma ne se réécrit pas en TypeScript.
- Secrets et chemins lus via `config`, jamais `process.env` disséminé.
- Interdit : importer `application`, `interface`, `web` ; contenir une décision métier (un `if` sur un statut, un calcul de priorité).
- Un adaptateur ne notifie pas et ne journalise pas : l'application le fait.
- Simulation explicite : la classe `*‑simulation.ts` renvoie toujours `mode: 'SIMULATION'` et sa mention lisible ; elle ne doit jamais être confondue avec l'adaptateur réel.

## Transaction et idempotence
Toute écriture prend un `Horloge` injecté ; toute tâche rejouable (`classification_ia`) doit pouvoir s'exécuter deux fois sans effet de bord.

## Vérification
Un test par adaptateur sur une base temporaire ou un dossier temporaire : succès, contrainte violée, donnée absente. `bun run verif:arch`.