import { randomUUID } from "node:crypto";
import type { Identifiants } from "@ports/identifiants.port.ts";

/** Identifiants préfixés et non devinables : "sig-<uuid>", "hist-<uuid>". */
export function creerIdentifiantsUuid(): Identifiants {
  return {
    nouveau(prefixe) {
      return `${prefixe}-${randomUUID()}`;
    },
  };
}