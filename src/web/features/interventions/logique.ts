import type { SignalementApi } from "../../api/client.ts";

/**
 * Logique du parcours agent, sans DOM.
 *
 * PARCOURS.md §6 : l'agent ouvre l'application pour clôturer une intervention. Sa liste est donc
 * le premier écran, triée par urgence réelle (priorité puis ancienneté), et non par date de
 * création comme une file administrative.
 */
const ORDRE_PRIORITE: Readonly<Record<string, number>> = { URGENTE: 0, HAUTE: 1, NORMALE: 2, BASSE: 3 };

/** Fichier réellement choisi par l'agent : la preuve est un octet-stream, pas une déclaration. */
export interface PhotoPreuve {
  readonly octets: Blob;
  readonly nom: string;
  readonly typeMime: string;
}

/** Dossiers qui demandent une action de terrain : en cours d'intervention. */
export function dossiersActionnables(dossiers: readonly SignalementApi[]): readonly SignalementApi[] {
  return dossiers
    .filter((dossier) => dossier.statut === "EN_COURS")
    .slice()
    .sort((a, b) => {
      const priorite = (ORDRE_PRIORITE[a.niveau_priorite] ?? 9) - (ORDRE_PRIORITE[b.niveau_priorite] ?? 9);
      if (priorite !== 0) {
        return priorite;
      }
      return Date.parse(a.date_signalement) - Date.parse(b.date_signalement);
    });
}

/** Le démarrage n'est proposé qu'une fois : après, le bouton devient « Clôturer ». */
export function actionPossible(dossier: SignalementApi, demarree: boolean): "demarrer" | "cloturer" | "aucune" {
  if (dossier.statut !== "EN_COURS") {
    return "aucune";
  }
  return demarree ? "cloturer" : "demarrer";
}

/**
 * La preuve photo est obligatoire (CR8) : le formulaire ne peut pas être soumis sans fichier.
 * Un simple booléen « j'ai joint la photo » ne prouve rien — c'est ce que le prototype faisait.
 */
export function peutCloturer(
  commentaire: string,
  photo: PhotoPreuve | null,
): { readonly ok: boolean; readonly raison?: string } {
  if (!photo) {
    return { ok: false, raison: "La photographie du site nettoyé est obligatoire pour clôturer." };
  }
  if (photo.octets.size <= 0) {
    return { ok: false, raison: "Le fichier choisi est vide : reprenez la photographie." };
  }
  if (!photo.typeMime.startsWith("image/")) {
    return { ok: false, raison: "Le fichier doit être une image (JPEG, PNG ou WebP)." };
  }
  if (commentaire.trim().length < 10) {
    return { ok: false, raison: "Décrivez le travail réalisé en 10 caractères au moins." };
  }
  return { ok: true };
}

/** Média renvoyé par le serveur après l'envoi de la photo (chemin, type, taille). */
export interface MediaEnregistre {
  readonly chemin: string;
  readonly mime: string;
  readonly tailleOctets: number;
}

/**
 * Construit la charge de clôture à partir du média réellement enregistré.
 *
 * Le chemin vient du serveur, jamais du client : un chemin forgé ferait croire à une preuve
 * inexistante, et le dossier serait clos sans photo sur le disque.
 */
export function construireEntreeCloture(
  commentaire: string,
  media: MediaEnregistre | null,
): { readonly commentaire: string; readonly photo: { chemin: string; mime: string; taille_octets: number } } {
  if (!media || media.chemin.trim().length === 0) {
    throw new Error("preuve absente : la clôture exige une photo enregistrée par le serveur");
  }
  return {
    commentaire: commentaire.trim(),
    photo: {
      chemin: media.chemin,
      mime: media.mime,
      taille_octets: media.tailleOctets,
    },
  };
}
