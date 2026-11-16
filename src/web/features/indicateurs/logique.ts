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

/** Lignes de pilotage : un intitulé, sa valeur déjà mise en forme, et ce qu elle mesure. */
export interface LigneIndicateur {
  readonly libelle: string;
  readonly valeur: string;
  readonly mesurable: boolean;
  /** Ce que l indicateur mesure, en une phrase : c'est le détail ouvert au clic. */
  readonly definition: string;
}

export function lignesPilotage(synthese: SyntheseApi): readonly LigneIndicateur[] {
  const ligne = (libelle: string, valeur: string, definition: string): LigneIndicateur => ({
    libelle,
    valeur,
    mesurable: valeur !== NON_MESURABLE,
    definition,
  });

  return [
    ligne("Taux de résolution", formaterPourcentage(synthese.tauxResolution), "Dossiers résolus rapportés aux dossiers traités sur la période."),
    ligne("Taux de rejet", formaterPourcentage(synthese.tauxRejet), "Dossiers rejetés rapportés aux dossiers traités sur la période."),
    ligne("Délai moyen de tri", formaterHeures(synthese.delaiMoyenTriHeures), "Temps moyen écoulé entre le signalement et la décision de tri."),
    ligne("Délai moyen de traitement", formaterHeures(synthese.delaiMoyenTraitementHeures), "Temps moyen écoulé entre la validation et la résolution sur le terrain."),
    ligne("Respect du délai de tri", formaterPourcentage(synthese.respectDelais.tri), "Part des dossiers triés dans le délai cible, parmi ceux dont l'échéance est connue."),
    ligne("Respect du délai d'affectation", formaterPourcentage(synthese.respectDelais.affectation), "Part des dossiers affectés dans le délai cible."),
    ligne("Respect du délai de résolution", formaterPourcentage(synthese.respectDelais.resolution), "Part des dossiers résolus dans le délai cible."),
    ligne("Couverture géographique", formaterPourcentage(synthese.couvertureGeographique), "Part des quartiers couverts par au moins un dossier sur la période."),
    ligne("Accord IA sur la catégorie", formaterPourcentage(synthese.qualiteIa.tauxAccord), "Part des classifications automatiques confirmées sans correction par un agent."),
    ligne("Score IA moyen", formaterNombre(synthese.qualiteIa.scoreMoyen), "Score de confiance moyen des classifications automatiques sur la période."),
  ];
}


