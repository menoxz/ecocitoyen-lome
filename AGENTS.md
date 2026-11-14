# EcoCitoyen Lomé — règles du dépôt

PRIO : ce fichier > `docs/architecture/ARCHITECTURE.md` > `README.md`.
Ne pas recopier ici ce que le harnais injecte déjà : descriptions d''outils, d''agents, échecs récurrents, capacités dégradées. Ni l''inventaire — il dérive.

## Mission
Signaler, décider, prouver. Le serveur décide ; l''interface affiche ; l''historique garde la trace.

## Sources de vérité
- `docs/architecture/BESOIN.md` — besoin + arbitrages `Z-01..Z-15`
- `docs/architecture/ARCHITECTURE.md` — couches, modules, contrat HTTP, schéma
- `docs/architecture/MIGRATION.md` — phases P0-P8 et portes de sortie
- `docs/architecture/adr/` — une décision = un fichier, immuable
- `docs/Cahier_des_Charges_ECOCITOYEN_v2.docx` — exigence contractuelle

Code contredit document ⇒ le document gagne, corriger le code. Document contredit le CDC ⇒ STOP + ask, ne pas trancher seul.

## Commandes
| But | Commande | Attendu |
|---|---|---|
| types | `bun run typecheck` | exit 0 |
| frontières | `bun run verif:arch` | exit 0 |
| tests (dès P0) | `bun run test` | exit 0 |
| servir | `bun run dev` | 200 sur `/api/v1/sante` après P3 |
| bundle | `bun run build` | < 1 Mo de JS initial (ENF02) |

Une phase n''est franchie que si typecheck + verif:arch + test sortent 0.

## Interdits (durs)
1. Règle métier hors `src/domaine`.
2. Droit vérifié seulement dans `src/web` (RB06).
3. État utilisateur global côté serveur (`let currentUser`).
4. Photo en base64 dans un corps JSON.
5. Indicateur en constante ou valeur de repli inventée.
6. Simulation IA non étiquetée (`mode_ia=SIMULATION` + mention visible).
7. `Date.now()`, `new Date()`, `Math.random()` dans `domaine/` ou `application/`.
8. `export default`, `any`, `index.ts` réexportant (barrel).
9. Secret, mot de passe, jeton, coordonnée ou identité d''auteur dans un log ou un export non autorisé.
10. Supprimer ou affaiblir un test pour franchir une porte.

## Legacy (gelé)
`server.ts`, `src/App.tsx`, `src/components/`, `src/types/`, `src/utils/`, `src/data/`.
Correctif bloquant uniquement. Aucune fonctionnalité nouvelle. Remplacement par phases (`MIGRATION.md`). Ne jamais copier un motif du legacy vers `src/{domaine,application,ports,infrastructure,interface,web}`.

## Definition of Done d''une demande
1. La règle touchée porte un test nommé (autorisation **et** refus).
2. `bun run verif:arch` + `bun run typecheck` (+ `test` dès P0) verts.
3. Commit ciblé, message au format `type(scope): description`.
4. Décision changée ⇒ nouvel ADR, l''ancien n''est pas modifié (statut `Remplacé par`).

## Règles locales
Chaque dossier porte son `AGENTS.md` ; il gagne sur celui-ci dans son périmètre.
`docs/architecture/` · `docs/architecture/adr/` · `src/` · `src/config/` · `src/contrats/` · `src/domaine/` · `src/application/` · `src/ports/` · `src/infrastructure/` · `src/interface/` · `src/web/` · `tests/`