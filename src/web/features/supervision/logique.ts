import type { SignalementApi } from "../../api/client.ts";

/**
 * Logique du parcours superviseur, sans DOM.
 *
 * Le superviseur ouvre une file de tri : son travail utile est de **décider** — valider ou
 * rejeter — pas de relire ce que le citoyen a déjà écrit. Les dossiers en attente de décision
 * passent donc en premier, les plus urgents et les plus anciens d'abord (PARCOURS.md §5).
 */
const ORDRE_PRIORITE: Readonly<Record<string, number>> = { URGENTE: 0, HAUTE: 1, NORMALE: 2, BASSE: 3 };

/** Libellés d'affichage des priorités ; la valeur, elle, reste celle du serveur. */
const LIBELLES_PRIORITE: Readonly<Record<string, string>> = {
  BASSE: "Basse",
  NORMALE: "Normale",
  HAUTE: "Haute",
  URGENTE: "Urgente",
};

export function libellePriorite(valeur: string): string {
  return LIBELLES_PRIORITE[valeur] ?? valeur;
}

/** File de tri : uniquement les dossiers qui attendent une décision, dans l'ordre de traitement. */
export function dossiersATrier(dossiers: readonly SignalementApi[]): readonly SignalementApi[] {
  return dossiers
    .filter((dossier) => dossier.statut === "NOUVEAU")
    .slice()
    .sort((a, b) => {
      const priorite = (ORDRE_PRIORITE[a.niveau_priorite] ?? 9) - (ORDRE_PRIORITE[b.niveau_priorite] ?? 9);
      if (priorite !== 0) {
        return priorite;
      }
      return Date.parse(a.date_signalement) - Date.parse(b.date_signalement);
    });
}

export interface Decision {
  readonly ok: boolean;
  readonly raison?: string;
}

/**
 * Valider engage une priorité : sans choix explicite, le dossier repart avec celle qu'il portait,
 * et le superviseur n'a pas arbitré. On l'exige donc à l'écran.
 */
export function peutValider(priorite: string): Decision {
  if (priorite.trim().length === 0) {
    return { ok: false, raison: "Choisissez la priorité d'intervention avant de valider." };
  }
  return { ok: true };
}

/**
 * Un rejet sans motif n'est pas une décision : le citoyen ne saurait pas quoi corriger (T2).
 * « Autre » sans explication vaut absence de motif : il faut alors décrire en clair.
 */
export function peutRejeter(motif: string, commentaire: string): Decision {
  if (motif.trim().length === 0) {
    return { ok: false, raison: "Le motif de rejet est obligatoire." };
  }
  if (motif === "Autre" && commentaire.trim().length < 10) {
    return { ok: false, raison: "Précisez en 10 caractères au moins pourquoi le dossier est rejeté." };
  }
  return { ok: true };
}

/** Charge utile de validation : un champ vide est absent, jamais envoyé comme chaîne vide. */
export function construireValidation(
  priorite: string,
  commentaire: string,
  idCategorie?: string,
): { readonly id_categorie?: string; readonly niveau_priorite?: string; readonly commentaire?: string } {
  const propre = commentaire.trim();
  return {
    ...(idCategorie !== undefined && idCategorie.length > 0 ? { id_categorie: idCategorie } : {}),
    ...(priorite.trim().length > 0 ? { niveau_priorite: priorite.trim() } : {}),
    ...(propre.length > 0 ? { commentaire: propre } : {}),
  };
}

/** Charge utile de rejet : le motif est toujours transmis, le commentaire seulement s'il existe. */
export function construireRejet(
  motif: string,
  commentaire: string,
): { readonly motif_rejet: string; readonly commentaire?: string } {
  const propre = commentaire.trim();
  return { motif_rejet: motif.trim(), ...(propre.length > 0 ? { commentaire: propre } : {}) };
}
