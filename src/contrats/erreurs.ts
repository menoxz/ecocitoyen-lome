import { z } from 'zod';
import { CODES_ERREUR, type CodeErreur, type DetailsErreur } from '@domaine/erreurs.ts';

/** Forme unique de toute réponse d’erreur de l’API. */
export const reponseErreurSchema = z.object({
  code: z.enum(CODES_ERREUR),
  message: z.string().min(1),
  details: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
});

export type ReponseErreur = z.infer<typeof reponseErreurSchema>;

export function versReponseErreur(
  code: CodeErreur,
  message: string,
  details?: DetailsErreur,
): ReponseErreur {
  const reponse: ReponseErreur = { code, message };
  if (details && Object.keys(details).length > 0) {
    reponse.details = { ...details };
  }
  return reponse;
}