/**
 * Client HTTP unique de l''interface.
 *
 * Aucun composant n''appelle `fetch` directement : une seule façon de gérer la session (cookie
 * envoyé automatiquement), les erreurs typées du contrat (`{ code, message, details }`) et la
 * forme des charges utiles. C''est ce qui permet de changer de transport sans toucher aux écrans.
 */
export interface ErreurApi {
  readonly code: string;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export type Resultat<T> = { readonly ok: true; readonly valeur: T } | { readonly ok: false; readonly erreur: ErreurApi };

export interface CategorieApi {
  readonly id_categorie: string;
  readonly nom: string;
  readonly priorite_base: number;
}

export interface QuartierApi {
  readonly id_quartier: string;
  readonly nom: string;
  readonly centre_lat: number;
  readonly centre_lon: number;
}

export interface DemandeSignalement {
  readonly id_categorie: string;
  readonly description: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly repere?: string | null;
  readonly sans_photo: boolean;
  readonly nombre_photos: number;
}

export interface SignalementApi {
  readonly id_signalement: string;
  readonly statut: string;
  readonly niveau_priorite: string;
  readonly score_priorite: number;
  readonly id_quartier: string;
  readonly date_signalement: string;
  readonly sans_photo: boolean;
  readonly nb_confirmations: number;
}

export interface DoublonApi {
  readonly id_signalement: string;
  readonly distanceMetres: number;
}

export interface ClientApi {
  readonly base: string;
  categories(): Promise<Resultat<readonly CategorieApi[]>>;
  quartiers(): Promise<Resultat<readonly QuartierApi[]>>;
  creerSignalement(demande: DemandeSignalement): Promise<Resultat<{ signalement: SignalementApi; doublons: readonly DoublonApi[] }>>;
  envoyerPhoto(idSignalement: string, octets: Blob, typeMime: string): Promise<Resultat<{ media: { chemin: string } }>>;
}

const ERREUR_RESEAU: ErreurApi = {
  code: "RESEAU_INDISPONIBLE",
  message: "Le serveur ne répond pas. Vérifiez votre connexion puis réessayez.",
};

async function lire<T>(reponse: Response): Promise<Resultat<T>> {
  if (!reponse.ok) {
    try {
      const corps = (await reponse.json()) as { code?: string; message?: string; details?: Record<string, unknown> };
      return {
        ok: false,
        erreur: {
          code: corps.code ?? "ERREUR_INCONNUE",
          message: corps.message ?? "La demande a été refusée.",
          details: corps.details,
        },
      };
    } catch {
      return { ok: false, erreur: { code: "ERREUR_INCONNUE", message: `Réponse ${reponse.status} non exploitable.` } };
    }
  }
  return { ok: true, valeur: (await reponse.json()) as T };
}

export function creerClient(base: string): ClientApi {
  const appeler = async <T>(chemin: string, init?: RequestInit): Promise<Resultat<T>> => {
    try {
      const reponse = await fetch(`${base}${chemin}`, { credentials: "include", ...init });
      return lire<T>(reponse);
    } catch {
      return { ok: false, erreur: ERREUR_RESEAU };
    }
  };

  const json = (methode: string, corps: unknown): RequestInit => ({
    method: methode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(corps),
  });

  return {
    base,
    categories: () => appeler<readonly CategorieApi[]>("/referentiels/categories"),
    quartiers: () => appeler<readonly QuartierApi[]>("/referentiels/quartiers"),
    creerSignalement: (demande) =>
      appeler<{ signalement: SignalementApi; doublons: readonly DoublonApi[] }>("/signalements", json("POST", demande)),
    envoyerPhoto: (idSignalement, octets, typeMime) =>
      appeler<{ media: { chemin: string } }>(`/signalements/${idSignalement}/photos`, {
        method: "POST",
        headers: { "content-type": typeMime },
        body: octets,
      }),
  };
}