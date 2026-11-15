# Déploiement

Deux contraintes décident de la plateforme, avant tout choix de fournisseur :

1. **Modules natifs** — `better-sqlite3`, `argon2` et `sharp` sont compilés. Il faut un Node
   classique, avec chaîne de compilation : les plateformes serverless (Vercel, Netlify Functions)
   sont exclues.
2. **État sur disque** — la base SQLite et les photos vivent dans un volume. Un hébergement sans
   disque persistant repart d'une base vide à chaque redéploiement : acceptable pour une
   démonstration, disqualifiant pour un usage réel.

## Ce qui est fourni

| Fichier | Rôle |
|---|---|
| `Dockerfile` | image multi-stage : compilation des natifs + `vite build`, puis runtime Node allégé |
| `docker-compose.yml` | service + volume nommé `donnees` monté sur `/app/data` (base **et** photos) |
| `.dockerignore` | exclut `node_modules`, `dist`, `data`, `.env`, `tests`, `docs` |

L'image expose `PORT=3000` et déclare un `HEALTHCHECK` sur `/api/v1/sante`.

## Lancer en local

```bash
docker compose build
docker compose up -d
curl http://127.0.0.1:3000/api/v1/sante     # {"statut":"ok","version":"1"}
```

## Variables d'environnement

| Variable | Défaut (image) | Rôle |
|---|---|---|
| `PORT` | `3000` | port d'écoute |
| `NODE_ENV` | `production` | profil d'exécution |
| `MODE_DEMO` | `true` dans le compose | jeu de démonstration + bascule de profil ; **à passer à `false` en réel** |
| `DB_CHEMIN` | `/app/data/ecocitoyen.db` | base SQLite (dans le volume) |
| `DOSSIER_PHOTOS` | `/app/data/photos` | photos (dans le volume) |
| `DOSSIER_STATIQUE` | `/app/dist` | front compilé servi par Express |
| `APP_URL` | — | URL publique, utilisée dans les liens |
| `GEMINI_API_KEY` | absent | sans clé : classification en `SIMULATION`, étiquetée comme telle |

## Sur un VPS

```bash
git clone <dépôt> ecocitoyen && cd ecocitoyen
cp .env.example .env        # renseigner APP_URL, MODE_DEMO=false, éventuellement GEMINI_API_KEY
docker compose up -d --build
```

Puis un reverse proxy pour HTTPS. Exemple Caddy (`/etc/caddy/Caddyfile`) :

```
ecocitoyen.example.tg {
    reverse_proxy 127.0.0.1:3000
}
```

Sauvegarde : le volume suffit.

```bash
docker run --rm -v ecocitoyen_donnees:/data -v "$PWD":/sauvegarde alpine \
  tar czf /sauvegarde/ecocitoyen-$(date +%F).tar.gz -C /data .
```

## Render, offre gratuite (sans volume) — la cible retenue

Le descripteur `render.yaml` est prêt. Procédure exacte :

1. **Créer le dépôt distant** — il n'en existe aucun (`git remote -v` est vide), donc Render n'a
   rien à construire. Sur GitHub : nouveau dépôt vide, puis
   `git remote add origin git@github.com:<compte>/ecocitoyen-lome.git && git push -u origin main`.
2. **Créer le service** — Render → *New* → *Blueprint* → sélectionner le dépôt. Render lit
   `render.yaml`, construit le `Dockerfile` et expose `/api/v1/sante` comme sonde.
3. **Renseigner les variables secrètes** dans le tableau de bord : `APP_URL` (l'URL fournie par
   Render) et, si tu veux le vrai modèle, `GEMINI_API_KEY`. Sans clé, la classification reste en
   `SIMULATION`, étiquetée dans l'interface.
4. **Vérifier** : `curl https://<service>.onrender.com/api/v1/sante` doit répondre
   `{"statut":"ok","version":"1"}`.

### Ce que cette cible coûte en fonctionnalités

| Point | Conséquence |
|---|---|
| Pas de disque persistant | base et photos dans `/tmp` : **tout est perdu** à chaque redéploiement et à chaque réveil |
| Mise en veille | l'instance gratuite s'endort ; la première requête attend plusieurs dizaines de secondes |
| Mémoire limitée | `sharp`, `argon2` et `better-sqlite3` sont gourmands : risque d'arrêt sous forte charge |
| Jeu de démonstration | `MODE_DEMO=true` ; les comptes seedés ont un mot de passe de démonstration commun |

Vérifié localement, avec un conteneur lancé sans volume (`DB_CHEMIN=/tmp/...`,
`DOSSIER_PHOTOS=/tmp/photos`) : démarrage OK, `/api/v1/sante` répond 200, la base et les photos
s'écrivent dans `/tmp`.
## Sur un hébergeur gratuit

À réserver à la démonstration. Trois points à vérifier avant de choisir :

1. **Disque persistant** — sans volume, la base est perdue à chaque déploiement. Beaucoup d'offres
   gratuites n'en fournissent pas ; le conteneur démarrera alors sur un jeu vide.
2. **Mémoire** — `sharp` et `argon2` sont gourmands ; en dessous de 512 Mo, prévoir des plantages.
3. **Dépôt distant** — la plupart des offres déploient depuis un dépôt Git : il faut en créer un
   (`git remote add origin …` puis `git push`), ce que ce dépôt n'a pas encore.

Une fois ces points réglés, l'image se déploie telle quelle : les hébergeurs qui acceptent un
`Dockerfile` n'ont besoin d'aucune configuration supplémentaire.

## Ce qui n'est pas couvert

- Pas de HTTPS automatique dans l'image : c'est le rôle du reverse proxy.
- Pas de réplication : SQLite est mono-nœud. Une montée en charge demanderait un autre moteur.
- Pas de sauvegarde planifiée : la commande ci-dessus est à mettre dans un cron.

