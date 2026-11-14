import { z } from 'zod';

/**
 * Lecture et validation de l'environnement.
 *
 * Aucun accès direct à `process.env` hors de ce module. Une valeur absente ou invalide
 * échoue au démarrage avec le nom de la variable : un défaut silencieux sur un secret
 * produit une panne différée et inexplicable.
 */

const schemaSource = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_URL: z.string().min(1).default('http://localhost:3000'),
  MODE_DEMO: z.enum(['true', 'false']).default('false'),
  /** Absente ou vide ⇒ mode simulation déclaré, jamais une clé vide passée à l'API. */
  GEMINI_API_KEY: z.string().min(10, 'clé trop courte ou vide').optional(),
});

export type Environnement = Readonly<{
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  appUrl: string;
  modeDemo: boolean;
  geminiApiKey: string | undefined;
  modeIa: 'MODELE' | 'SIMULATION';
  avertissements: readonly string[];
}>;

export class ErreurConfiguration extends Error {
  readonly variables: readonly string[];

  constructor(variables: readonly string[], detail: string) {
    super(`Configuration invalide (${variables.join(', ')}) : ${detail}`);
    this.name = 'ErreurConfiguration';
    this.variables = Object.freeze([...variables]);
  }
}

/** Chargement pur : ne lit que la source fournie, ne touche à rien d'autre. */
export function chargerEnvironnement(source: Record<string, string | undefined>): Environnement {
  const resultat = schemaSource.safeParse(source);

  if (!resultat.success) {
    const variables = [...new Set(resultat.error.issues.map((issue) => String(issue.path[0] ?? '?')))];
    const detail = resultat.error.issues
      .map((issue) => `${String(issue.path[0] ?? '?')} : ${issue.message}`)
      .join(' ; ');
    throw new ErreurConfiguration(variables, detail);
  }

  const valeur = resultat.data;
  const modeDemo = valeur.MODE_DEMO === 'true';
  const avertissements: string[] = [];

  if (valeur.NODE_ENV === 'production' && modeDemo) {
    avertissements.push(
      'MODE_DEMO actif en production : bascule de profil et jeu de données fictif exposés.',
    );
  }
  if (!valeur.GEMINI_API_KEY) {
    avertissements.push('GEMINI_API_KEY absente : classification IA en mode SIMULATION.');
  }

  return Object.freeze({
    nodeEnv: valeur.NODE_ENV,
    port: valeur.PORT,
    appUrl: valeur.APP_URL,
    modeDemo,
    geminiApiKey: valeur.GEMINI_API_KEY,
    modeIa: valeur.GEMINI_API_KEY ? ('MODELE' as const) : ('SIMULATION' as const),
    avertissements: Object.freeze(avertissements),
  });
}

let cache: Environnement | undefined;

/** Accès unique, mémoïsé : le démarrage échoue tôt si l'environnement est invalide. */
export function environnement(): Environnement {
  if (!cache) {
    cache = chargerEnvironnement(process.env);
  }
  return cache;
}