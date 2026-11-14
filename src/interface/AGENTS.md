# AGENTS.md — src/interface

## Rôle
Traduire HTTP ⇄ cas d'usage. C'est le seul endroit qui parle HTTP et le seul qui choisit un statut.

## Forme d'une route
```ts
app.post('/signalements/:id/valider',
  contrat(validerSchema), session(), rbac('valider'),
  async (req, res) => { const r = await valider.executer(...); res.json(projeter(r)); });
```
Ordre imposé : contrat → session → RBAC → limite de débit → cas d'usage → projection → erreurs.
- Contrat : valide le corps/query/params avec le schéma de `contrats/`. Un refus de forme est un 400 avec `code` (`CONTRAT_INVALIDE`), jamais une phrase libre.
- Session : résout l'acteur à chaque requête. Aucune variable globale d'utilisateur.
- RBAC : déclaratif (`rbac('valider')`), adossé à la matrice unique du domaine. La route n'énumère pas de rôles.
- Erreurs : un seul middleware traduit `ErreurMetier` → statut via la table des codes. Aucun `try/catch` local qui réinvente un statut.

## Interdits
- Contenir une règle métier, un calcul de priorité, une condition de transition.
- Accéder à la base ou au disque directement.
- Importer `infrastructure` ailleurs que dans `serveur.ts` (composition root).
- Renvoyer une entité brute contenant l'identité de l'auteur sur une route publique ou citoyenne : passer par `presentation/`.

## Sécurité (portée par cette couche)
Cookie `httpOnly` + `SameSite=Lax` + `Secure` hors dev ; verrouillage après échecs ; limite de débit par acteur ; en-têtes `nosniff`, `frame-ancestors`, CORS restreint ; jamais de secret ni de coordonnée dans une réponse d'erreur.

## Vérification
`tests/api` : un test par route (nominal + refus), un test par ligne de la matrice de droits, un test qui prouve qu'une route protégée sans cookie renvoie 401.