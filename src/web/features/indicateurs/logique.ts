import type { SyntheseApi } from "../../api/client.ts";

/**
 * Mise en forme des indicateurs, sans DOM.
 *
 * Le point qui compte : `null` n'est pas `0`. Un taux non calculable s'affiche « non mesurable »,
 * et son motif figure dans `indisponibles`. Le prototype affichait un respect des délais figé à
 * 88 et un accord IA à 92 : ces chiffres-là ne revenaient d'aucune mesure.
 */
export const NON_MESURABLE = "non mesurable";

export function formaterPourcentage(valeur: number | null): string {
  if (valeur === null || !Number.isFinite(valeur)) {
    return NON_MESURABLE;
  }
  return `${valeur} %`;
}

export function formaterHeures(valeur: number | null): string {
  if (valeur === null || !Number.isFinite(valeur)) {
    return NON_MESURABLE;
  }
  const arrondi = Math.round(valeur * 10) / 10;
  return `${arrondi} h`;
}

export function formaterNombre(valeur: number | null): string {
  if (valeur === null || !Number.isFinite(valeur)) {
    return NON_MESURABLE;
  }
  return String(valeur);
}

const LIBELLES_JALON: Readonly<Record<string, string>> = {
  tri: "Tri (décision)",
  affectation: "Affectation à une équipe",
  resolution: "Résolution sur le terrain",
};

export function libelleJalon(jalon: string): string {
  return LIBELLES_JALON[jalon] ?? jalon;
}

const LIBELLES_STATUT: Readonly<Record<string, string>> = {
  NOUVEAU: "Nouveau",
  VALIDE: "Validé",
  EN_COURS: "En cours",
  RESOLU: "Résolu",
  REJETE: "Rejeté",
  ROUVERT: "Rouvert",
};

export function libelleStatutIndicateur(statut: string): string {
  return LIBELLES_STATUT[statut] ?? statut;
}

/** Volumes par statut, dans l'ordre de lecture du cycle de vie, sans statut omis. */
export function volumesOrdonnes(synthese: SyntheseApi): readonly { readonly statut: string; readonly nombre: number }[] {
  return ["NOUVEAU", "VALIDE", "EN_COURS", "RESOLU", "REJETE", "ROUVERT"].map((statut) => ({
    statut,
    nombre: synthese.volumes[statut] ?? 0,
  }));
}

/** Lignes de pilotage : un intitulé et sa valeur déjà mise en forme. */
export interface LigneIndicateur {
  readonly libelle: string;
  readonly valeur: string;
  readonly mesurable: boolean;
}

export function lignesPilotage(synthese: SyntheseApi): readonly LigneIndicateur[] {
  const ligne = (libelle: string, valeur: string): LigneIndicateur => ({
    libelle,
    valeur,
    mesurable: valeur !== NON_MESURABLE,
  });

  return [
    ligne("Taux de résolution", formaterPourcentage(synthese.tauxResolution)),
    ligne("Taux de rejet", formaterPourcentage(synthese.tauxRejet)),
    ligne("Délai moyen de tri", formaterHeures(synthese.delaiMoyenTriHeures)),
    ligne("Délai moyen de traitement", formaterHeures(synthese.delaiMoyenTraitementHeures)),
    ligne("Respect du délai de tri", formaterPourcentage(synthese.respectDelais.tri)),
    ligne("Respect du délai d'affectation", formaterPourcentage(synthese.respectDelais.affectation)),
    ligne("Respect du délai de résolution", formaterPourcentage(synthese.respectDelais.resolution)),
    ligne("Couverture géographique", formaterPourcentage(synthese.couvertureGeographique)),
    ligne("Accord IA sur la catégorie", formaterPourcentage(synthese.qualiteIa.tauxAccord)),
    ligne("Score IA moyen", formaterNombre(synthese.qualiteIa.scoreMoyen)),
  ];
}
