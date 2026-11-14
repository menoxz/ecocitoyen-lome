import argon2 from "argon2";
import { createHash, randomBytes } from "node:crypto";
import type { EmpreinteJeton, Hachage } from "@ports/hachage.port.ts";

/**
 * Hachage Argon2id (ENF06).
 *
 * Coût choisi pour tenir en moins de 50 ms sur le VPS du pilote : 19 Mio de mémoire et 2 passes
 * vérifiés à 15 ms de hachage / 29 ms de vérification sur les deux runtimes du projet.
 * `argon2.verify` lit les paramètres dans l''empreinte : augmenter le coût n''invalide pas
 * les empreintes existantes.
 */
export const COUT_ARGON2 = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function creerHachageArgon2(): Hachage {
  return {
    async hacher(motDePasse) {
      return argon2.hash(motDePasse, { type: argon2.argon2id, ...COUT_ARGON2 });
    },

    async verifier(empreinte, motDePasse) {
      try {
        return await argon2.verify(empreinte, motDePasse);
      } catch {
        return false;
      }
    },
  };
}

/**
 * Jetons de session : valeur aléatoire de 256 bits, stockée uniquement sous forme d''empreinte
 * SHA-256. Un vol de base ne donne donc pas de session utilisable.
 */
export function creerEmpreinteJeton(): EmpreinteJeton {
  return {
    calculer(jeton) {
      return createHash("sha256").update(jeton).digest("hex");
    },

    generer() {
      return randomBytes(32).toString("base64url");
    },
  };
}