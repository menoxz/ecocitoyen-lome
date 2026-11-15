/**
 * Octets d'une photo de démonstration.
 *
 * Ce module vit dans le stockage photos : c'est le seul endroit où des octets d'image en base64
 * ont le droit d'exister (règle `verif:arch`). L'orchestration, elle, reste en `interface`.
 */
export const OCTETS_PHOTO_DEMONSTRATION = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
