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
  /** Vrai quand la position est le centre du quartier, pas un relevé GPS. */
  readonly position_manuelle?: boolean;
  readonly precision_gps_m?: number;
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

export interface CompteApi {
  readonly id_utilisateur: string;
  readonly email: string;
  readonly role: string;
}

export interface ClientApi {
  readonly base: string;
  /** Session courante, ou null si le visiteur n'est pas connecté. */
  moi(): Promise<Resultat<{ compte: CompteApi | null; role: string }>>;
  connexion(identifiant: string, motDePasse: string): Promise<Resultat<{ compte: CompteApi }>>;
  inscription(entree: { nom: string; prenom: string; email: string; motDePasse: string }): Promise<Resultat<{ compte: CompteApi }>>;
  categories(): Promise<Resultat<readonly CategorieApi[]>>;
  quartiers(): Promise<Resultat<readonly QuartierApi[]>>;
  creerSignalement(demande: DemandeSignalement): Promise<Resultat<{ signalement: SignalementApi; doublons: readonly DoublonApi[] }>>;
  envoyerPhoto(idSignalement: string, octets: Blob, typeMime: string): Promise<Resultat<{ media: { chemin: string } }>>;
  /** Dossiers visibles par l'acteur ; le serveur applique déjà le périmètre d'équipe et de statut. */
  listerInterventions(): Promise<Resultat<readonly SignalementApi[]>>;
  dossier(idSignalement: string): Promise<Resultat<SignalementApi>>;
  demarrer(idSignalement: string): Promise<Resultat<{ demarre: boolean; statut: string }>>;
  resoudre(
    idSignalement: string,
    entree: { commentaire: string; photo: { chemin: string; mime: string; taille_octets: number } },
  ): Promise<Resultat<SignalementApi>>;
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
    moi: () => appeler<{ compte: CompteApi | null; role: string }>("/auth/moi"),
    connexion: (identifiant, motDePasse) =>
      appeler<{ compte: CompteApi }>("/auth/connexion", json("POST", { identifiant, mot_de_passe: motDePasse })),
    inscription: (entree) =>
      appeler<{ compte: CompteApi }>(
        "/auth/inscription",
        json("POST", {
          nom: entree.nom,
          prenom: entree.prenom,
          email: entree.email,
          mot_de_passe: entree.motDePasse,
          consentement: true,
        }),
      ),
    categories: () => appeler<readonly CategorieApi[]>("/referentiels/categories"),
    quartiers: () => appeler<readonly QuartierApi[]>("/referentiels/quartiers"),
    creerSignalement: (demande) =>
      appeler<{ signalement: SignalementApi; doublons: readonly DoublonApi[] }>("/signalements", json("POST", demande)),
    listerInterventions: () => appeler<readonly SignalementApi[]>("/signalements?limite=100"),
    dossier: (idSignalement) => appeler<SignalementApi>(`/signalements/${idSignalement}`),
    demarrer: (idSignalement) => appeler<{ demarre: boolean; statut: string }>(`/signalements/${idSignalement}/demarrer`, { method: "POST" }),
    resoudre: (idSignalement, entree) =>
      appeler<SignalementApi>(`/signalements/${idSignalement}/resoudre`, json("POST", entree)),
    envoyerPhoto: (idSignalement, octets, typeMime) =>
      appeler<{ media: { chemin: string } }>(`/signalements/${idSignalement}/photos`, {
        method: "POST",
        headers: { "content-type": typeMime },
        body: octets,
      }),
  };
}