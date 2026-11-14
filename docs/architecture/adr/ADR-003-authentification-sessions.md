# ADR-003 — Authentification par session serveur, mode démonstration isolé

**Statut** : Accepté — 14/11/2026
**Remplace** : `POST /api/auth/login` sans mot de passe et `POST /api/auth/switch-user`.

## Contexte

Le prototype identifie l''utilisateur par un simple e-mail, sans mot de passe, et stocke l''utilisateur courant dans une variable globale du serveur (`let currentUser`). Conséquences mesurées : n''importe qui devient superviseur en une requête, et deux navigateurs partagent la même identité. Le CDC exige EF01-EF05, RB02-RB07, ENF06 (Argon2/bcrypt, jeton 30 min, HTTPS) et RG24 (5 échecs / 15 min). Le besoin de démonstration (basculer de rôle devant un jury) reste réel.

## Décision

- **Identifiant** : e-mail ou téléphone + mot de passe haché **Argon2id** (8 caractères minimum, ENF06).
- **Session serveur** : ligne en table `session` (jeton aléatoire haché, `expire_le` à 30 min glissant, révocable), transmise par cookie `httpOnly`, `SameSite=Lax`, `Secure` hors développement.
- **Identité résolue à chaque requête** par le middleware `session` ; aucun état d''utilisateur global.
- **Verrouillage** après 5 échecs en 15 min (RG24), compteurs persistés (`limite_debit`).
- **Mode démonstration** : `MODE_DEMO=true` active la bascule de profil et le jeu de données fictif, avec bandeau visible à l''écran. Hors de ce mode, la route de bascule n''est pas montée.
- **Anonymisation** (RG29/RG30) : remplacement de l''identité du compte, signalements conservés sans lien.

## Conséquences

**Bénéfices**
- RB06 devient démontrable : une requête sans cookie est refusée, un rôle insuffisant reçoit 403, quel que soit l''état du front.
- Deux navigateurs peuvent jouer deux rôles simultanément — condition pour tester le parcours nominal complet.
- La révocation est immédiate (session en base), ce qu''un JWT sans liste de révocation ne permet pas.

**Coûts / contraintes**
- Une ligne `session` à purger (tâche planifiée).
- Toute requête coûte une lecture de session : à garder indexée, avec un cache mémoire à court terme si besoin.
- La démonstration dépend explicitement d''un drapeau d''environnement : oublier `MODE_DEMO=false` en production est un risque, donc la valeur par défaut est `false` et un avertissement démarre si `NODE_ENV=production && MODE_DEMO=true`.

## Alternatives évaluées

1. **JWT stateless** — rejeté : révocation impossible sans liste noire, donc autant stocker une session ; et le jeton voyage de toute façon dans un cookie pour rester `httpOnly`.
2. **OTP SMS** — rejeté au pilote : coût par envoi, dépendance à un opérateur non contractualisé, complexité d''un second service. Réversible : le module `compte` peut ajouter un second facteur.
3. **Comptes de démonstration avec mot de passe partagé** — rejeté : ne prouve pas EF02/ENF06 et laisse croire que la sécurité est faite.
4. **Magic link e-mail** — rejeté au pilote : nécessite un service d''envoi fiable et une boîte accessible par chaque citoyen, non garantie.

## Liens

`Z-01`, `Z-02`, `ADR-001`, `ARCHITECTURE.md` §12.