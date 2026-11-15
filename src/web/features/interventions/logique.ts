import type { SignalementApi } from "../../api/client.ts";

/**
 * Logique du parcours agent, sans DOM.
 *
 * PARCOURS.md §6 : l'agent ouvre l'application pour clôturer une intervention. Sa liste est donc
 * le premier écran, triée par urgence réelle (priorité puis ancienneté), et non par date de
 * création comme une file administrative.
 */
const ORDRE_PRIORITE: Readonly<Record<string, number>> = { URGENTE: 0, HAUTE: 1, NORMALE: 2, BASSE: 3 };

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

/** La preuve photo est obligatoire (CR8) : le formulaire ne peut pas être soumis sans fichier. */
export function peutCloturer(commentaire: string, aPhoto: boolean): { readonly ok: boolean; readonly raison?: string } {
  if (!aPhoto) {
    return { ok: false, raison: "La photographie du site nettoyé est obligatoire pour clôturer." };
  }
  if (commentaire.trim().length < 10) {
    return { ok: false, raison: "Décrivez le travail réalisé en 10 caractères au moins." };
  }
  return { ok: true };
}