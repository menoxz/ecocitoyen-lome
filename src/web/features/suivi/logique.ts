import type { EtapeHistoriqueApi } from "../../api/client.ts";

/**
 * Logique du suivi citoyen, sans DOM.
 *
 * Le citoyen ne relit pas un journal technique : il veut savoir ce que le service a décidé, quand,
 * et pourquoi. Les libellés de statut sont ceux du vocabulaire du dossier, jamais des codes bruts.
 */
const LIBELLES_STATUT: Readonly<Record<string, string>> = {
  NOUVEAU: "Nouveau",
  VALIDE: "Validé",
  EN_COURS: "En cours",
  RESOLU: "Résolu",
  REJETE: "Rejeté",
  ROUVERT: "Rouvert",
};

export function libelleStatut(valeur: string): string {
  return LIBELLES_STATUT[valeur] ?? valeur;
}

/** Identifiant lu dans un fragment `#/dossier/<id>` ; null si l'adresse ne désigne aucun dossier. */
export function idDuFragment(fragment: string): string | null {
  const propre = fragment.replace(/^#\/?/, "").split("?")[0];
  const morceaux = propre.split("/").filter((morceau) => morceau.length > 0);
  if (morceaux.length < 2 || morceaux[0].toLowerCase() !== "dossier") {
    return null;
  }
  return morceaux[1];
}

export interface EtapeLisible {
  readonly titre: string;
  readonly detail: string;
  readonly date: string;
}

/**
 * Étapes lisibles, dans l'ordre où le service les a enregistrées.
 *
 * La première étape n'a pas d'état précédent : c'est la création. Un commentaire absent n'est pas
 * remplacé par un texte inventé — la ligne n'existe simplement pas.
 */
export function etapesLisibles(etapes: readonly EtapeHistoriqueApi[]): readonly EtapeLisible[] {
  return etapes.map((etape) => ({
    titre:
      etape.ancien_statut === null
        ? `Dossier créé (${libelleStatut(etape.nouveau_statut)})`
        : `${libelleStatut(etape.ancien_statut)} → ${libelleStatut(etape.nouveau_statut)}`,
    detail: etape.commentaire ?? "",
    date: etape.date_changement,
  }));
}
