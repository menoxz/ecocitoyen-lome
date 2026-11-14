#!/usr/bin/env node
/**
 * verifier-architecture.mjs — barrière mécanique des frontières de couches.
 *
 * Une règle de couche non outillée se dégrade en une session.
 * Ce script lit les imports réels et refuse :
 *   - un import interdit par la matrice de dépendances (src/AGENTS.md) ;
 *   - une dépendance externe non autorisée pour la couche ;
 *   - un interdit textuel (export default, any, Date.now dans le domaine, base64, état global).
 *
 * Périmètre : les 8 couches cibles de src/. Le legacy (src/components, src/types,
 * src/utils, src/data, src/App.tsx, src/main.tsx) est ignoré jusqu’à la phase P8.
 *
 * Sortie : exit 0 si aucune violation, exit 1 sinon (avec fichier:ligne).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, dirname, resolve, basename, sep } from 'node:path';

const RACINE = process.cwd();
const SRC = join(RACINE, 'src');

const COUCHES = [
  'config',
  'contrats',
  'domaine',
  'ports',
  'application',
  'infrastructure',
  'interface',
  'web',
];

/** Couches qu’une couche a le droit d’importer (matrice unique, cf. src/AGENTS.md). */
const MATRICE = {
  config: [],
  contrats: ['domaine'],
  domaine: [],
  ports: ['domaine'],
  application: ['domaine', 'ports'],
  infrastructure: ['ports', 'domaine', 'config'],
  interface: ['infrastructure', 'contrats', 'application', 'domaine', 'ports', 'config'],
  web: ['contrats'],
};

/** Seul fichier autorisé à câbler l’infrastructure (composition root). */
const COMPOSITION_ROOT = join('interface', 'http', 'serveur.ts');

/** Dépendances externes autorisées, par couche. Les modules node: ne sont autorisés que côté infra/interface. */
const EXTERNES = {
  config: ['zod'],
  contrats: ['zod'],
  domaine: [],
  ports: [],
  application: [],
  infrastructure: ['better-sqlite3', '@google/genai', 'dotenv'],
  interface: ['express', 'cookie-parser'],
  web: ['react', 'react-dom', 'leaflet', 'lucide-react', 'motion'],
};

const BUILTINS_AUTORISES = ['infrastructure', 'interface', 'config'];

/** Import autorisé dans toutes les couches : l’exécuteur de tests. */
const EXTERNES_TOUJOURS_AUTORISEES = ['bun:test'];

/** Interdits textuels : [couche(s) concernée(s) ou 'toutes', motif, message]. */
const INTERDITS_TEXTUELS = [
  ['toutes', /export\s+default\b/, 'export default interdit : export nommé uniquement'],
  ['toutes', /:\s*any\b|\bas\s+any\b|<any>/, 'any interdit : utiliser unknown + validation'],
  ['toutes', /\blet\s+currentUser\b/, 'état utilisateur global interdit : session par requête'],
  ['toutes', /\bconsole\.(log|debug|info)\(/, 'console interdit : journalisation structurée via le port Journal'],
  ['domaine|application', /\bDate\.now\(\)/, 'Date.now() interdit : injecter Horloge'],
  ['domaine|application', /\bnew Date\(/, 'new Date() interdit : injecter Horloge'],
  ['domaine|application', /\bMath\.random\(\)/, 'Math.random() interdit : injecter Identifiants'],
  ['domaine', /\basync\b/, 'le domaine est synchrone : un besoin d\'I/O est mal placé'],
  ['domaine', /from\s+['"]zod['"]/, 'zod interdit dans le domaine : la validation est en contrats/interface'],
  ['application|interface', /base64/i, 'base64 interdit hors stockage photos : les fichiers passent par un port'],
  ['domaine|application|ports', /from\s+['"]node:/, 'modules node interdits hors infrastructure/interface'],
];

const violations = [];
const ignorés = new Set();

function ajouter(fichier, ligne, regle, detail) {
  violations.push({
    fichier: relative(RACINE, fichier).split(sep).join('/'),
    ligne,
    regle,
    detail,
  });
}

function coucheDe(cheminAbsolu) {
  const rel = relative(SRC, cheminAbsolu).split(sep);
  if (rel[0] === '..') return null;
  return COUCHES.includes(rel[0]) ? rel[0] : null;
}

function fichiersDe(dossier) {
  const sortie = [];
  const visiter = (d) => {
    for (const entree of readdirSync(d, { withFileTypes: true })) {
      if (entree.name === 'node_modules' || entree.name.startsWith('.')) continue;
      const p = join(d, entree.name);
      if (entree.isDirectory()) visiter(p);
      else if (/\.(ts|tsx|mts|js|mjs)$/.test(entree.name)) sortie.push(p);
    }
  };
  if (statSync(dossier).isDirectory()) visiter(dossier);
  return sortie;
}

/** Associe un spécifieur d’import à une couche interne, ou à un paquet externe. */
function classer(specifieur, fichierSource) {
  if (specifieur.startsWith('.')) {
    const cible = resolve(dirname(fichierSource), specifieur);
    const couche = coucheDe(cible);
    return couche ? { type: 'interne', valeur: couche, cible } : { type: 'inconnu', valeur: specifieur };
  }
  if (specifieur.startsWith('@')) {
    const [portee, ...reste] = specifieur.split('/');
    const alias = portee.slice(1);
    if (COUCHES.includes(alias)) {
      return { type: 'interne', valeur: alias, cible: join(SRC, alias, ...reste) };
    }
  }
  if (specifieur.startsWith('node:')) return { type: 'node', valeur: specifieur };
  return { type: 'externe', valeur: specifieur.startsWith('@') ? specifieur.split('/').slice(0, 2).join('/') : specifieur.split('/')[0] };
}

function estFichierLegacy(cheminAbsolu) {
  const rel = relative(SRC, cheminAbsolu).split(sep);
  const legacyDossiers = ['components', 'types', 'utils', 'data'];
  const legacyFichiers = ['App.tsx', 'main.tsx', 'index.css', 'vite-env.d.ts'];
  if (legacyFichiers.includes(rel[0])) return true;
  return legacyDossiers.includes(rel[0]);
}

function verifierFichier(fichier) {
  const couche = coucheDe(fichier);
  if (!couche) return;
  const rel = relative(SRC, fichier).split(sep).join('/');

  if (basename(fichier) === 'index.ts' || basename(fichier) === 'index.tsx') {
    ajouter(fichier, 1, 'barrel', 'index.ts réexportant interdit : importer le chemin exact');
  }

  const contenu = readFileSync(fichier, 'utf8');
  const lignes = contenu.split(/\r?\n/);

  // Interdits textuels
  for (const [portee, motif, message] of INTERDITS_TEXTUELS) {
    const couchesCibles = portee === 'toutes' ? COUCHES : portee.split('|');
    if (!couchesCibles.includes(couche)) continue;
    lignes.forEach((texte, i) => {
      if (motif.test(texte)) ajouter(fichier, i + 1, 'interdit', message);
    });
  }

  // Imports
  const motifImport = /(?:from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"])/g;
  let m;
  while ((m = motifImport.exec(contenu)) !== null) {
    const specifieur = m[1] || m[2] || m[3];
    if (!specifieur) continue;
    const ligne = contenu.slice(0, m.index).split(/\r?\n/).length;
    const classe = classer(specifieur, fichier);

    if (classe.type === 'inconnu') {
      ajouter(fichier, ligne, 'import', `import hors périmètre ignoré : ${specifieur}`);
      ignorés.add(rel);
      continue;
    }

    if (classe.type === 'interne') {
      if (classe.valeur === couche) continue; // même couche : autorisé
      const autorisees = MATRICE[couche] ?? [];
      if (!autorisees.includes(classe.valeur)) {
        ajouter(fichier, ligne, 'matrice', `${couche} → ${classe.valeur} interdit (${specifieur})`);
        continue;
      }
      if (classe.valeur === 'infrastructure') {
        const relatifFichier = relative(SRC, fichier).split(sep).join('/');
        if (relatifFichier !== COMPOSITION_ROOT.split(sep).join('/')) {
          ajouter(fichier, ligne, 'composition-root', 'seul interface/http/serveur.ts importe infrastructure');
        }
      }
      continue;
    }

    if (classe.type === 'node') {
      if (!BUILTINS_AUTORISES.includes(couche)) {
        ajouter(fichier, ligne, 'externe', `module node interdit dans ${couche} (${specifieur})`);
      }
      continue;
    }

    if (classe.type === 'externe') {
      if (EXTERNES_TOUJOURS_AUTORISEES.includes(classe.valeur)) continue;
      const autorisees = EXTERNES[couche] ?? [];
      if (!autorisees.includes(classe.valeur)) {
        ajouter(fichier, ligne, 'externe', `${couche} ne peut pas dépendre de « ${classe.valeur} »`);
      }
    }
  }
}

function main() {
  let examines = 0;
  for (const couche of COUCHES) {
    const dossier = join(SRC, couche);
    let fichiers = [];
    try {
      fichiers = fichiersDe(dossier);
    } catch {
      continue; // couche pas encore créée : rien à vérifier
    }
    for (const f of fichiers) {
      if (estFichierLegacy(f)) continue;
      verifierFichier(f);
      examines += 1;
    }
  }

  const fichiersLegacy = ['App.tsx', 'main.tsx'].filter((f) => {
    try {
      statSync(join(SRC, f));
      return true;
    } catch {
      return false;
    }
  });

  if (violations.length === 0) {
    console.log(`verif:arch OK — ${examines} fichier(s) examiné(s), 0 violation.`);
    if (fichiersLegacy.length) {
      console.log(`legacy ignoré : src/${fichiersLegacy.join(', src/')} + src/{components,types,utils,data} (retrait en P8).`);
    }
    process.exit(0);
  }

  console.error(`verif:arch ÉCHEC — ${violations.length} violation(s) :\n`);
  const parFichier = new Map();
  for (const v of violations) {
    if (!parFichier.has(v.fichier)) parFichier.set(v.fichier, []);
    parFichier.get(v.fichier).push(v);
  }
  for (const [fichier, liste] of parFichier) {
    console.error(fichier);
    for (const v of liste) console.error(`  L${v.ligne} [${v.regle}] ${v.detail}`);
  }
  console.error('\nCorriger le code, pas le script. Règles : src/AGENTS.md ; décisions : docs/architecture/adr/.');
  process.exit(1);
}

main();
