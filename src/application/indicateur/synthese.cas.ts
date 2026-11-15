import {
  DELAIS_CIBLES_DEFAUT,
  couvertureGeographique,
  delaiMoyenTraitementHeures,
  delaiMoyenTriHeures,
  respectDelais,
  tauxAccordIa,
  tauxRejet,
  tauxResolution,
  type DelaisCibles,
  type DelaisParPriorite,
  type DossierIndicateur,
} from "@domaine/indicateurs/formules.regle.ts";
import { aLeDroit } from "@domaine/compte/droits.regle.ts";
import { ErreurMetier } from "@domaine/erreurs.ts";
import type { Priorite, Statut } from "@domaine/signalement/signalement.type.ts";
import type { Acteur, Dependances } from "../dependances.type.ts";

/**
 * Synthèse des indicateurs (§13).
 *
 * Aucune valeur de repli : un indicateur non calculable vaut `null` et son motif est listé dans
 * `indisponibles`. C'est la correction directe du prototype, qui affichait un respect des délais
 * figé à 88 et un taux d'accord IA à 92 par défaut.
 */
export interface SyntheseIndicateurs {
  readonly volumes: Readonly<Record<Statut, number>>;
  readonly parCategorie: readonly { readonly idCategorie: string; readonly nom: string; readonly nombre: number }[];
  readonly parQuartier: readonly { readonly idQuartier: string; readonly nom: string; readonly nombre: number }[];
  readonly parPriorite: readonly { readonly priorite: Priorite; readonly nombre: number }[];
  readonly tauxResolution: number | null;
  readonly tauxRejet: number | null;
  readonly delaiMoyenTriHeures: number | null;
  readonly delaiMoyenTraitementHeures: number | null;
  readonly respectDelais: Readonly<Record<"tri" | "affectation" | "resolution", number | null>>;
  readonly couvertureGeographique: number | null;
  readonly qualiteIa: { readonly tauxAccord: number | null; readonly scoreMoyen: number | null; readonly evalues: number };
  readonly total: number;
  readonly indisponibles: readonly string[];
}

/** Délais cibles lus depuis le référentiel, avec repli explicite sur les valeurs du CDC. */
function delaisDepuisParametres(deps: Dependances): DelaisParPriorite {
  const lire = (priorite: Priorite, jalon: keyof DelaisCibles): number => {
    const brut = Number(deps.referentiel.parametre(`sla.${priorite}.${jalon}`));
    return Number.isFinite(brut) && brut > 0 ? brut : DELAIS_CIBLES_DEFAUT[priorite][jalon];
  };

  const parPriorite = (priorite: Priorite): DelaisCibles => ({
    tri: lire(priorite, "tri"),
    affectation: lire(priorite, "affectation"),
    resolution: lire(priorite, "resolution"),
  });

  return {
    URGENTE: parPriorite("URGENTE"),
    HAUTE: parPriorite("HAUTE"),
    NORMALE: parPriorite("NORMALE"),
    BASSE: parPriorite("BASSE"),
  };
}

function versDossierIndicateur(dossier: {
  readonly statut: Statut;
  readonly niveauPriorite: Priorite;
  readonly idQuartier: string;
  readonly dateSignalement: string;
  readonly dateValidation: string | null;
  readonly dateAffectation: string | null;
  readonly dateResolution: string | null;
}): DossierIndicateur {
  return {
    statut: dossier.statut,
    priorite: dossier.niveauPriorite,
    idQuartier: dossier.idQuartier,
    dateSignalement: dossier.dateSignalement,
    dateValidation: dossier.dateValidation,
    dateAffectation: dossier.dateAffectation,
    dateResolution: dossier.dateResolution,
  };
}

export function synthese(acteur: Acteur, deps: Dependances): SyntheseIndicateurs {
  if (!aLeDroit(acteur.role, "voirIndicateurs")) {
    throw new ErreurMetier("DROIT_REFUSE", { action: "voirIndicateurs" });
  }

  const dossiers = deps.signalements.lister({ limite: 500 });
  const indicateurs = dossiers.map(versDossierIndicateur);
  const quartiers = deps.referentiel.quartiers();
  const categories = deps.referentiel.categories();
  const indisponibles: string[] = [];

  const tauxRes = tauxResolution(indicateurs);
  if (tauxRes === null) {
    indisponibles.push("taux_resolution : aucun dossier validé sur la période");
  }

  const tauxRej = tauxRejet(indicateurs);
  const tri = delaiMoyenTriHeures(indicateurs);
  const traitement = delaiMoyenTraitementHeures(indicateurs);
  if (tri === null) {
    indisponibles.push("delai_tri : aucun dossier décidé");
  }
  if (traitement === null) {
    indisponibles.push("delai_traitement : aucun dossier résolu");
  }

  const delais = respectDelais(indicateurs, delaisDepuisParametres(deps));
  for (const jalon of ["tri", "affectation", "resolution"] as const) {
    if (delais[jalon] === null) {
      indisponibles.push(`respect_${jalon} : aucun dossier mesurable pour ce jalon`);
    }
  }

  const couverture = couvertureGeographique(
    dossiers.map((dossier) => dossier.idQuartier),
    quartiers.filter((quartier) => quartier.actif).map((quartier) => quartier.idQuartier),
  );

  const evaluations = dossiers
    .filter((dossier) => dossier.modeIa !== "AUCUN")
    .map((dossier) => ({ categorieFinale: dossier.idCategorie, categorieIa: dossier.idCategorieIa }));
  const accord = tauxAccordIa(evaluations);
  const scores = dossiers
    .map((dossier) => dossier.scoreIa)
    .filter((score): score is number => score !== null && Number.isFinite(score));
  const scoreMoyen =
    scores.length > 0 ? Math.round((scores.reduce((acc, score) => acc + score, 0) / scores.length) * 100) / 100 : null;

  if (accord === null) {
    indisponibles.push("qualite_ia : aucun dossier classé par l'IA sur la période");
  }

  const compter = (valeur: string, champ: "categorie" | "quartier"): number =>
    dossiers.filter((dossier) =>
      champ === "categorie" ? dossier.idCategorie === valeur : dossier.idQuartier === valeur,
    ).length;

  return {
    volumes: deps.signalements.compterParStatut(),
    parCategorie: categories.map((categorie) => ({
      idCategorie: categorie.idCategorie,
      nom: categorie.nom,
      nombre: compter(categorie.idCategorie, "categorie"),
    })),
    parQuartier: quartiers.map((quartier) => ({
      idQuartier: quartier.idQuartier,
      nom: quartier.nom,
      nombre: compter(quartier.idQuartier, "quartier"),
    })),
    parPriorite: (["URGENTE", "HAUTE", "NORMALE", "BASSE"] as const).map((priorite) => ({
      priorite,
      nombre: dossiers.filter((dossier) => dossier.niveauPriorite === priorite).length,
    })),
    tauxResolution: tauxRes,
    tauxRejet: tauxRej,
    delaiMoyenTriHeures: tri,
    delaiMoyenTraitementHeures: traitement,
    respectDelais: delais,
    couvertureGeographique: couverture,
    qualiteIa: { tauxAccord: accord, scoreMoyen, evalues: evaluations.length },
    total: dossiers.length,
    indisponibles,
  };
}