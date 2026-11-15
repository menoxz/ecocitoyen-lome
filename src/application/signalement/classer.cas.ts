import type { CategorieCandidate } from "@ports/classificateur-ia.port.ts";
import type { Signalement } from "@domaine/signalement/signalement.type.ts";
import type { Dependances } from "../dependances.type.ts";
import { chargerDossier } from "./commun.ts";

export interface BilanClassement {
  readonly traitees: number;
  readonly echouees: number;
  readonly ignorees: number;
}

const RETARD_APRES_ECHEC_MINUTES = 5;

/**
 * Traitement des classifications en attente.
 *
 * Appelé par une route interne (administrateur) ou par le planificateur : le cas d'usage ne
 * décide pas de son déclenchement, ce qui le rend testable sans attente ni minuteur.
 *
 * Une tâche ne classe jamais deux fois le même dossier : la file la retire avant traitement.
 * Une panne du modèle fait échouer la tâche, jamais le signalement (CR13).
 */
export async function traiterClassifications(deps: Dependances, limite = 5): Promise<BilanClassement> {
  const maintenant = deps.horloge.maintenant();
  const taches = deps.travaux.prendre(limite, maintenant);
  const candidates: readonly CategorieCandidate[] = deps.referentiel
    .categories()
    .filter((categorie) => categorie.actif)
    .map((categorie) => ({ idCategorie: categorie.idCategorie, nom: categorie.nom }));

  let traitees = 0;
  let echouees = 0;
  let ignorees = 0;

  for (const tache of taches) {
    if (tache.type !== "classification_ia") {
      deps.travaux.terminer(tache.idTache);
      ignorees += 1;
      continue;
    }

    const dossier: Signalement | null = deps.signalements.parId(tache.cible);
    const photo = deps.signalements
      .mediasDe(tache.cible)
      .find((media) => media.type === "SIGNALEMENT" && !media.masque);

    if (!dossier || !photo) {
      // Rien à classer : un dossier sans photo est exclu de l'IA (RG08). La tâche est close.
      deps.travaux.terminer(tache.idTache);
      ignorees += 1;
      continue;
    }

    const octets = await deps.stockagePhotos.lire(photo.chemin);
    if (!octets) {
      deps.travaux.echouer(
        tache.idTache,
        "photo introuvable sur le disque",
        deps.horloge.decalerMinutes(maintenant, RETARD_APRES_ECHEC_MINUTES),
      );
      echouees += 1;
      continue;
    }

    try {
      const resultat = await deps.classificateur.classifier(octets, photo.mime, candidates);
      deps.signalements.enregistrer({
        ...dossier,
        idCategorieIa: resultat.idCategorie,
        scoreIa: resultat.score,
        modeIa: resultat.mode,
        dateMiseAJour: deps.horloge.maintenant(),
      });
      deps.travaux.terminer(tache.idTache);
      traitees += 1;
    } catch (erreur) {
      const message = erreur instanceof Error ? erreur.message : "échec inconnu";
      deps.travaux.echouer(
        tache.idTache,
        message,
        deps.horloge.decalerMinutes(maintenant, RETARD_APRES_ECHEC_MINUTES),
      );
      echouees += 1;
    }
  }

  return { traitees, echouees, ignorees };
}