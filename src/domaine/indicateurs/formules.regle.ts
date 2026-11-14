import type { Priorite, Statut } from '@domaine/signalement/signalement.type.ts';

/**
 * Indicateurs de pilotage (§13).
 *
 * Une formule vit ici, une seule fois, et se calcule depuis l’historique des transitions.
 * Donnée insuffisante ⇒ `null` : jamais de valeur de remplacement. Un tableau de bord municipal
 * qui affiche un chiffre inventé est un mensonge, pas une commodité de démonstration.
 */
export interface DossierIndicateur {
  readonly statut: Statut;
  readonly priorite: Priorite;
  readonly idQuartier: string;
  readonly dateSignalement: string;
  readonly dateValidation: string | null;
  readonly dateAffectation: string | null;
  readonly dateResolution: string | null;
}

/** Délais cibles en heures, par priorité (§5.3). */
export interface DelaisCibles {
  readonly tri: number;
  readonly affectation: number;
  readonly resolution: number;
}

export type DelaisParPriorite = Readonly<Record<Priorite, DelaisCibles>>;

export const DELAIS_CIBLES_DEFAUT: DelaisParPriorite = {
  URGENTE: { tri: 12, affectation: 24, resolution: 72 },
  HAUTE: { tri: 48, affectation: 48, resolution: 168 },
  NORMALE: { tri: 48, affectation: 72, resolution: 336 },
  BASSE: { tri: 48, affectation: 120, resolution: 720 },
};

type Jalon = keyof DelaisCibles;

const MS_PAR_HEURE = 3_600_000;

function heuresEntre(debut: string, fin: string): number | null {
  const a = Date.parse(debut);
  const b = Date.parse(fin);
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return null;
  }
  return (b - a) / MS_PAR_HEURE;
}

function moyenne(valeurs: readonly number[]): number | null {
  if (valeurs.length === 0) {
    return null;
  }
  const total = valeurs.reduce((acc, valeur) => acc + valeur, 0);
  return Math.round((total / valeurs.length) * 10) / 10;
}

function pourcentage(numerateur: number, denominateur: number): number | null {
  if (denominateur === 0) {
    return null;
  }
  return Math.round((numerateur / denominateur) * 100);
}

const STATUTS_DECIDES: readonly Statut[] = ['VALIDE', 'EN_COURS', 'RESOLU', 'ROUVERT'];

/** Durée mesurée pour un jalon, ou `null` si le jalon ne s’applique pas à ce dossier. */
function dureeJalon(dossier: DossierIndicateur, jalon: Jalon): number | null {
  if (jalon === 'tri') {
    return dossier.dateValidation ? heuresEntre(dossier.dateSignalement, dossier.dateValidation) : null;
  }
  if (jalon === 'affectation') {
    return dossier.dateValidation && dossier.dateAffectation
      ? heuresEntre(dossier.dateValidation, dossier.dateAffectation)
      : null;
  }
  return dossier.dateValidation && dossier.dateResolution
    ? heuresEntre(dossier.dateValidation, dossier.dateResolution)
    : null;
}

/** Résolus ÷ (Validé + En cours + Résolu + Rouvert) × 100. */
export function tauxResolution(dossiers: readonly DossierIndicateur[]): number | null {
  const resolus = dossiers.filter((d) => d.statut === 'RESOLU').length;
  const population = dossiers.filter((d) => STATUTS_DECIDES.includes(d.statut)).length;
  return pourcentage(resolus, population);
}

/** Rejetés ÷ décidés × 100, les rejets comptant parmi les décidés. */
export function tauxRejet(dossiers: readonly DossierIndicateur[]): number | null {
  const rejetes = dossiers.filter((d) => d.statut === 'REJETE').length;
  const decides = dossiers.filter((d) => d.statut === 'REJETE' || STATUTS_DECIDES.includes(d.statut)).length;
  return pourcentage(rejetes, decides);
}

/** Moyenne de (date_validation − date_signalement), en heures, sur les dossiers décidés. */
export function delaiMoyenTriHeures(dossiers: readonly DossierIndicateur[]): number | null {
  const valeurs: number[] = [];
  for (const dossier of dossiers) {
    const duree = dureeJalon(dossier, 'tri');
    if (duree !== null && duree >= 0) {
      valeurs.push(duree);
    }
  }
  return moyenne(valeurs);
}

/** Moyenne de (date_resolution − date_validation), en heures, sur les dossiers résolus. */
export function delaiMoyenTraitementHeures(dossiers: readonly DossierIndicateur[]): number | null {
  const valeurs: number[] = [];
  for (const dossier of dossiers) {
    const duree = dureeJalon(dossier, 'resolution');
    if (duree !== null && duree >= 0) {
      valeurs.push(duree);
    }
  }
  return moyenne(valeurs);
}

/** Part des dossiers respectant chaque jalon, comparée au délai cible de leur priorité. */
export function respectDelais(
  dossiers: readonly DossierIndicateur[],
  delais: DelaisParPriorite = DELAIS_CIBLES_DEFAUT,
): Readonly<Record<Jalon, number | null>> {
  const mesurer = (jalon: Jalon): number | null => {
    const mesures: { dossier: DossierIndicateur; duree: number }[] = [];
    for (const dossier of dossiers) {
      const duree = dureeJalon(dossier, jalon);
      if (duree !== null && duree >= 0) {
        mesures.push({ dossier, duree });
      }
    }
    if (mesures.length === 0) {
      return null;
    }
    const respectes = mesures.filter(({ dossier, duree }) => duree <= delais[dossier.priorite][jalon]).length;
    return pourcentage(respectes, mesures.length);
  };

  return { tri: mesurer('tri'), affectation: mesurer('affectation'), resolution: mesurer('resolution') };
}

/** Quartiers couverts ÷ quartiers actifs × 100. */
export function couvertureGeographique(
  idQuartiers: readonly string[],
  quartiersActifs: readonly string[],
): number | null {
  if (quartiersActifs.length === 0) {
    return null;
  }
  const couverts = new Set(idQuartiers);
  const atteints = quartiersActifs.filter((id) => couverts.has(id)).length;
  return pourcentage(atteints, quartiersActifs.length);
}

/** Qualité de l’IA : accord catégorie finale / catégorie suggérée (EF37). */
export function tauxAccordIa(
  evaluations: readonly { readonly categorieFinale: string; readonly categorieIa: string | null }[],
): number | null {
  const evaluees = evaluations.filter((e) => e.categorieIa !== null);
  if (evaluees.length === 0) {
    return null;
  }
  const accords = evaluees.filter((e) => e.categorieFinale === e.categorieIa).length;
  return pourcentage(accords, evaluees.length);
}