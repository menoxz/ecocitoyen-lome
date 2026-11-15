# Image de production d'EcoCitoyen Lomé.
#
# Trois contraintes ont dicté cette forme :
#   1. `better-sqlite3`, `argon2` et `sharp` sont des modules NATIFS : il faut une chaîne de
#      compilation Debian et un Node classique, pas un environnement serverless.
#   2. SQLite et les photos vivent sur le DISQUE : le conteneur doit monter un volume, sinon
#      chaque redéploiement efface les données.
#   3. Le serveur exécute du TypeScript et résout les alias `@application/...` : on garde `tsx`
#      au runtime plutôt que de produire une seconde compilation.
FROM node:22-bookworm AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
COPY scripts ./scripts
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Les binaires natifs compilés dans le stage précédent sont réutilisés tels quels (même base Debian).
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/src ./src

# Le volume porte la base et les photos : sans lui, rien ne survit à un redéploiement.
RUN mkdir -p /app/data/photos && chown -R node:node /app/data
USER node
EXPOSE 3000
ENV PORT=3000 DB_CHEMIN=/app/data/ecocitoyen.db DOSSIER_PHOTOS=/app/data/photos DOSSIER_STATIQUE=/app/dist
HEALTHCHECK --interval=30s --timeout=4s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/v1/sante').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "node_modules/tsx/dist/cli.mjs", "src/interface/http/serveur.ts"]
