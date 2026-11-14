# AGENTS.md — src/config

## Rôle
Lire l''environnement, le valider, échouer au démarrage. Rien d''autre.

## Règles
- Un seul fichier exporté par préoccupation : `environnement.ts`. Tout accès à `process.env` du dépôt passe par lui (sauf `infrastructure/` pour un chemin technique local).
- Validation zod : valeur absente ou invalide ⇒ `throw` immédiat, message qui nomme la variable. Jamais de défaut silencieux pour un secret (`GEMINI_API_KEY` absent ⇒ mode simulation déclaré, pas de clé vide).
- Exporte un objet **gelé** (`Object.freeze`), typé, jamais `process.env` brut.
- Valeurs par défaut sûres : `MODE_DEMO=false`, `NODE_ENV=development`, `PORT=3000`.
- Interdit : importer `application`, `interface`, `infrastructure`, `web`, `domaine`. Aucune logique métier (pas de seuil de priorité, pas de rayon de doublon : ils vivent dans `parametre`, en base).
- Avertir au démarrage, sur la sortie standard, si `NODE_ENV=production` et `MODE_DEMO=true`.

## Vérification
`bun run verif:arch` ; un test `environnement.test.ts` couvre : variable manquante ⇒ erreur nommée, valeur valide ⇒ objet gelé.