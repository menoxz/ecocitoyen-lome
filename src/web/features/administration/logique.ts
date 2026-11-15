import type { CompteApi } from "../../api/client.ts";

/**
 * Logique d'administration des comptes, sans DOM.
 *
 * L'écran ne décide pas qui peut administrer : la matrice de droits (§3.3) est côté serveur, et
 * un refus arrive en 403. Ici on ordonne et on nomme, rien d'autre.
 */
const LIBELLES_ROLE: Readonly<Record<string, string>> = {
  VISITEUR: "Visiteur",
  CITOYEN: "Citoyen",
  AGENT: "Agent",
  SUPERVISEUR: "Superviseur",
  ADMIN: "Administrateur",
};

export function libelleRole(role: string): string {
  return LIBELLES_ROLE[role] ?? role;
}

/** Ordre de lecture : les administrateurs d'abord, puis les internes, puis les citoyens. */
const ORDRE_ROLE: Readonly<Record<string, number>> = {
  ADMIN: 0,
  SUPERVISEUR: 1,
  AGENT: 2,
  CITOYEN: 3,
  VISITEUR: 4,
};

export function comptesTries(comptes: readonly CompteApi[]): readonly CompteApi[] {
  return comptes.slice().sort((a, b) => {
    const rang = (ORDRE_ROLE[a.role] ?? 9) - (ORDRE_ROLE[b.role] ?? 9);
    if (rang !== 0) {
      return rang;
    }
    return a.email.localeCompare(b.email);
  });
}

/** Nom affichable : le prénom et le nom quand ils existent, sinon l'adresse. */
export function nomAffichable(compte: CompteApi): string {
  const complet = [compte.prenom, compte.nom].filter((partie) => typeof partie === "string" && partie.length > 0).join(" ");
  return complet.length > 0 ? complet : compte.email;
}

/** Charge utile d'activation : on envoie la valeur voulue, jamais un « basculer » implicite. */
export function basculerActivation(compte: CompteApi): { readonly actif: boolean } {
  return { actif: compte.actif !== true };
}
