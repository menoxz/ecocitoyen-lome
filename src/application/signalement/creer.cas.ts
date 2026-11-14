import { ErreurMetier } from "@domaine/erreurs.ts";
import { aLeDroit } from "@domaine/compte/droits.regle.ts";
import { verifierDescription } from "@domaine/signalement/description.regle.ts";
import { PARAMETRES_DOUBLON_DEFAUT, trouverDoublons, type ParametresDoublon } from "@domaine/signalement/doublon.regle.ts";
import { PARAMETRES_PRIORITE_DEFAUT, calculerPriorite } from "@domaine/signalement/priorite.regle.ts";
import type { ModeIa, Signalement } from "@domaine/signalement/signalement.type.ts";
import { distanceMetres } from "@domaine/zone/distance.regle.ts";
import { estDansLaZone, type ZonePilote } from "@domaine/zone/zone.regle.ts";
import type { Acteur, Dependances } from "../dependances.type.ts";
import { journaliser } from "../compte/inscrire.cas.ts";

/** Quotas par utilisateur (RG23), configurables à terme par le référentiel. */
export const QUOTA_HEURE = 3;
export const QUOTA_JOUR = 10;

export interface CommandeCreation {
  readonly idCategorie: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly description: string;
  readonly repere: string | null;
  readonly sansPhoto: boolean;
  readonly nombrePhotos: number;
  readonly precisionGpsM: number;
  readonly positionManuelle: boolean;
  readonly idCategorieIa: string | null;
  readonly scoreIa: number | null;
  readonly modeIa: ModeIa;
  readonly justificationIa: string | null;
}

export interface ResultatCreation {
  readonly dossier: Signalement;
  readonly doublons: readonly { readonly idSignalement: string; readonly distanceMetres: number }[];
}

function parametresDoublon(deps: Dependances): ParametresDoublon {
  const rayon = Number(deps.referentiel.parametre("doublon.rayonMetres"));
  const fenetre = Number(deps.referentiel.parametre("doublon.fenetreJours"));
  return {
    rayonMetres: Number.isFinite(rayon) && rayon > 0 ? rayon : PARAMETRES_DOUBLON_DEFAUT.rayonMetres,
    fenetreJours: Number.isFinite(fenetre) && fenetre > 0 ? fenetre : PARAMETRES_DOUBLON_DEFAUT.fenetreJours,
  };
}

function zoneDeLaCommune(deps: Dependances): ZonePilote {
  const commune = deps.referentiel.communes()[0];
  if (!commune) {
    throw new ErreurMetier("ERREUR_INTERNE", { raison: "aucune commune configuree" });
  }
  return {
    nom: commune.nom,
    emprise: {
      latitudeMin: commune.latMin,
      latitudeMax: commune.latMax,
      longitudeMin: commune.lonMin,
      longitudeMax: commune.lonMax,
    },
    // Le polygone de la commune arrive en phase P7 ; le repli rectangulaire est explicite.
    polygone: null,
  };
}

/** Quota glissant : refus AVANT d'écrire, avec la fenêtre fournie par l'horloge. */
function verifierQuota(acteur: Acteur, maintenantIso: string, deps: Dependances): void {
  const heure = maintenantIso.slice(0, 13);
  const jour = maintenantIso.slice(0, 10);
  const cleHeure = `signalement:${acteur.idUtilisateur}:${heure}`;
  const cleJour = `signalement:${acteur.idUtilisateur}:${jour}`;

  if (deps.debit.lire(cleHeure, heure) >= QUOTA_HEURE || deps.debit.lire(cleJour, jour) >= QUOTA_JOUR) {
    throw new ErreurMetier("DEBIT_DEPASSE", { quotaHeure: QUOTA_HEURE, quotaJour: QUOTA_JOUR });
  }

  deps.debit.incrementer(cleHeure, heure);
  deps.debit.incrementer(cleJour, jour);
}

/**
 * Création d'un signalement (T0, EF09-EF12).
 *
 * Ordre volontaire : droits, forme, zone, photo, quota, doublons, priorité, écriture.
 * Un refus ne doit jamais consommer un quota ni laisser de ligne en base.
 */
export function creer(commande: CommandeCreation, acteur: Acteur, deps: Dependances): ResultatCreation {
  if (!aLeDroit(acteur.role, "creerSignalement")) {
    throw new ErreurMetier("DROIT_REFUSE", { action: "creerSignalement" });
  }

  const description = verifierDescription(commande.description);

  if (!commande.sansPhoto && commande.nombrePhotos === 0) {
    throw new ErreurMetier("PHOTO_MANQUANTE");
  }
  if (commande.nombrePhotos > 3) {
    throw new ErreurMetier("CONTRAT_INVALIDE", { champ: "photos", maximum: 3 });
  }

  const position = { latitude: commande.latitude, longitude: commande.longitude };
  const zone = zoneDeLaCommune(deps);
  if (!estDansLaZone(position, zone)) {
    throw new ErreurMetier("HORS_ZONE", { zone: zone.nom });
  }

  const categorie = deps.referentiel.categories().find((c) => c.idCategorie === commande.idCategorie);
  if (!categorie) {
    throw new ErreurMetier("CONTRAT_INVALIDE", { champ: "id_categorie" });
  }

  verifierQuota(acteur, deps.horloge.maintenant(), deps);

  const maintenant = deps.horloge.maintenant();
  const params = parametresDoublon(deps);
  const doublons = trouverDoublons(
    deps.signalements.lister({ limite: 500 }),
    { ...position, idCategorie: commande.idCategorie, maintenantIso: maintenant },
    params,
  );

  const quartier =
    deps.referentiel
      .quartiers()
      .map((q) => ({ quartier: q, distance: distanceMetres(position, { latitude: q.centreLat, longitude: q.centreLon }) }))
      .filter((entree) => entree.quartier.actif)
      .sort((a, b) => a.distance - b.distance)[0]?.quartier ?? null;

  if (!quartier) {
    throw new ErreurMetier("ERREUR_INTERNE", { raison: "aucun quartier actif" });
  }

  const priorite = calculerPriorite(
    {
      prioriteBaseCategorie: categorie.prioriteBase,
      distanceSiteSensibleM: null,
      signalementsProches: doublons.length,
      confirmations: 0,
      categorieCaniveau: categorie.idCategorie === "cat-2",
      heuresSansDecision: 0,
    },
    {
      ...PARAMETRES_PRIORITE_DEFAUT,
      saisonPluies: deps.referentiel.parametre("priorite.saisonPluies") === "true",
    },
  );

  const idSignalement = deps.identifiants.nouveau("sig");

  const dossier: Signalement = {
    idSignalement,
    idAuteur: acteur.idUtilisateur,
    idCategorie: categorie.idCategorie,
    idQuartier: quartier.idQuartier,
    latitude: commande.latitude,
    longitude: commande.longitude,
    description,
    statut: "NOUVEAU",
    niveauPriorite: priorite.niveau,
    scorePriorite: priorite.score,
    sansPhoto: commande.sansPhoto,
    nbConfirmations: 0,
    idCategorieIa: commande.idCategorieIa,
    scoreIa: commande.scoreIa,
    modeIa: commande.modeIa,
    iaDesaccord: false,
    motifRejet: null,
    dateSignalement: maintenant,
    dateValidation: null,
    dateAffectation: null,
    dateResolution: null,
    dateMiseAJour: maintenant,
  };

  deps.signalements.creer(dossier, {
    idHistorique: deps.identifiants.nouveau("hist"),
    idSignalement,
    ancienStatut: null,
    nouveauStatut: "NOUVEAU",
    idAuteur: acteur.idUtilisateur,
    dateChangement: maintenant,
    commentaire: commande.sansPhoto ? "Créé sans photo (mode dégradé)" : "Signalement créé",
  });

  journaliser(deps, acteur, "signalement.creation", idSignalement, null, "NOUVEAU");

  return {
    dossier,
    doublons: doublons.map((doublon) => ({
      idSignalement: doublon.idSignalement,
      distanceMetres: Math.round(
        distanceMetres(position, { latitude: doublon.latitude, longitude: doublon.longitude }),
      ),
    })),
  };
}