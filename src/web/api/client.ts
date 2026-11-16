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

export interface EquipeApi {
  readonly id_equipe: string;
  readonly nom: string;
  readonly zone: string;
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
  /** Champs de détail : absents d'une projection de liste, présents sur un dossier ouvert. */
  readonly id_categorie?: string;
  readonly description?: string;
  readonly quartier_nom?: string;
  readonly categorie_nom?: string;
  readonly motif_rejet?: string | null;
}

export interface DoublonApi {
  readonly id_signalement: string;
  readonly distanceMetres: number;
}

/** Une étape du dossier : la décision, sa date et son motif. L'auteur de la décision n'est pas exposé. */
export interface EtapeHistoriqueApi {
  readonly ancien_statut: string | null;
  readonly nouveau_statut: string;
  readonly date_changement: string;
  readonly commentaire: string | null;
}

/**
 * Synthèse des indicateurs, telle que le serveur la calcule.
 *
 * Les propriétés sont en camelCase : c'est l'objet du domaine sérialisé tel quel, pas une
 * projection renommée. `null` veut dire « non mesurable » et s'accompagne d'un motif dans
 * `indisponibles` — jamais d'une valeur de repli.
 */
export interface SyntheseApi {
  readonly volumes: Readonly<Record<string, number>>;
  readonly parCategorie: readonly { readonly idCategorie: string; readonly nom: string; readonly nombre: number }[];
  readonly parQuartier: readonly { readonly idQuartier: string; readonly nom: string; readonly nombre: number }[];
  readonly parPriorite: readonly { readonly priorite: string; readonly nombre: number }[];
  readonly tauxResolution: number | null;
  readonly tauxRejet: number | null;
  readonly delaiMoyenTriHeures: number | null;
  readonly delaiMoyenTraitementHeures: number | null;
  readonly respectDelais: Readonly<Record<"tri" | "affectation" | "resolution", number | null>>;
  readonly couvertureGeographique: number | null;
  readonly qualiteIa: {
    readonly tauxAccord: number | null;
    readonly scoreMoyen: number | null;
    readonly evalues: number;
  };
  readonly total: number;
  readonly indisponibles: readonly string[];
}

export interface CompteApi {
  readonly id_utilisateur: string;
  readonly email: string;
  readonly role: string;
  /** Champs présents sur la liste d'administration, absents d'une réponse de session minimale. */
  readonly nom?: string;
  readonly prenom?: string;
  readonly telephone?: string | null;
  readonly id_equipe?: string | null;
  readonly actif?: boolean;
  /** Vrai tant que la personne n'a pas remplacé le mot de passe remis par l'administrateur. */
  readonly mot_de_passe_temporaire?: boolean;
}

export interface ClientApi {
  readonly base: string;
  /** Session courante, ou null si le visiteur n'est pas connecté. */
  moi(): Promise<Resultat<{ compte: CompteApi | null; role: string }>>;
  connexion(identifiant: string, motDePasse: string): Promise<Resultat<{ compte: CompteApi }>>;
  inscription(entree: { nom: string; prenom: string; email: string; motDePasse: string }): Promise<Resultat<{ compte: CompteApi }>>;
  /** Ferme la session côté serveur ; le cookie `httpOnly` est effacé par la réponse. */
  deconnexion(): Promise<Resultat<{ deconnecte: boolean }>>;
  categories(): Promise<Resultat<readonly CategorieApi[]>>;
  quartiers(): Promise<Resultat<readonly QuartierApi[]>>;
  equipes(): Promise<Resultat<readonly EquipeApi[]>>;
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
  /** File de tri du superviseur : dossiers visibles par l'acteur, éventuellement d'un seul statut. */
  listerDossiers(statut?: string): Promise<Resultat<readonly SignalementApi[]>>;
  /** Valeurs de décision, servies par le domaine (jamais recopiées dans l'interface). */
  priorites(): Promise<Resultat<readonly string[]>>;
  motifsRejet(): Promise<Resultat<readonly string[]>>;
  /** Étapes du dossier, telles que le serveur les a enregistrées. */
  historique(idSignalement: string): Promise<Resultat<readonly EtapeHistoriqueApi[]>>;
  /** « Moi aussi » : le compte renvoyé est celui du serveur, jamais un incrément local. */
  confirmer(idSignalement: string): Promise<Resultat<{ confirme: boolean; nb_confirmations: number }>>;
  /** Synthèse des indicateurs ; `null` signifie « non mesurable », jamais zéro. */
  synthese(): Promise<Resultat<SyntheseApi>>;
  /** Administration : liste des comptes (droit `modifierCompte`, réservé à l'administrateur). */
  comptes(): Promise<Resultat<readonly CompteApi[]>>;
  /** Change le rôle ou l'activation ; le compte renvoyé est celui que le serveur a enregistré. */
  modifierCompte(
    idUtilisateur: string,
    entree: { role?: string; actif?: boolean },
  ): Promise<Resultat<CompteApi>>;
  /** Crée un compte interne ; le mot de passe temporaire n'est renvoyé qu'à cet instant. */
  creerCompteInterne(entree: {
    nom: string;
    prenom: string;
    email: string;
    role: string;
    id_equipe: string | null;
  }): Promise<Resultat<{ compte: CompteApi; mot_de_passe_temporaire: string }>>;
  /** Change son propre mot de passe ; l'ancien est exigé par le serveur. */
  changerMotDePasse(entree: { ancien: string; nouveau: string }): Promise<Resultat<CompteApi>>;
  valider(
    idSignalement: string,
    entree: { id_categorie?: string; niveau_priorite?: string; commentaire?: string },
  ): Promise<Resultat<SignalementApi>>;
  rejeter(
    idSignalement: string,
    entree: { motif_rejet: string; commentaire?: string },
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
    deconnexion: () => appeler<{ deconnecte: boolean }>("/auth/deconnexion", { method: "POST" }),
    categories: () => appeler<readonly CategorieApi[]>("/referentiels/categories"),
    quartiers: () => appeler<readonly QuartierApi[]>("/referentiels/quartiers"),
    equipes: () => appeler<readonly EquipeApi[]>("/referentiels/equipes"),
    creerSignalement: (demande) =>
      appeler<{ signalement: SignalementApi; doublons: readonly DoublonApi[] }>("/signalements", json("POST", demande)),
    listerInterventions: () => appeler<readonly SignalementApi[]>("/signalements?limite=100"),
    dossier: (idSignalement) => appeler<SignalementApi>(`/signalements/${idSignalement}`),
    demarrer: (idSignalement) => appeler<{ demarre: boolean; statut: string }>(`/signalements/${idSignalement}/demarrer`, { method: "POST" }),
    resoudre: (idSignalement, entree) =>
      appeler<SignalementApi>(`/signalements/${idSignalement}/resoudre`, json("POST", entree)),
    listerDossiers: (statut) =>
      appeler<readonly SignalementApi[]>(
        statut ? `/signalements?statut=${encodeURIComponent(statut)}&limite=100` : "/signalements?limite=100",
      ),
    priorites: () => appeler<readonly string[]>("/referentiels/priorites"),
    motifsRejet: () => appeler<readonly string[]>("/referentiels/motifs-rejet"),
    historique: (idSignalement) => appeler<readonly EtapeHistoriqueApi[]>(`/signalements/${idSignalement}/historique`),
    confirmer: (idSignalement) =>
      appeler<{ confirme: boolean; nb_confirmations: number }>(`/signalements/${idSignalement}/confirmer`, {
        method: "POST",
      }),
    synthese: () => appeler<SyntheseApi>("/indicateurs/synthese"),
    comptes: () => appeler<readonly CompteApi[]>("/comptes"),
    modifierCompte: (idUtilisateur, entree) =>
      appeler<CompteApi>(`/comptes/${idUtilisateur}`, json("PATCH", entree)),
    creerCompteInterne: (entree) =>
      appeler<{ compte: CompteApi; mot_de_passe_temporaire: string }>("/comptes", json("POST", entree)),
    changerMotDePasse: (entree) => appeler<CompteApi>("/auth/mot-de-passe", json("POST", entree)),
    valider: (idSignalement, entree) =>
      appeler<SignalementApi>(`/signalements/${idSignalement}/valider`, json("POST", entree)),
    rejeter: (idSignalement, entree) =>
      appeler<SignalementApi>(`/signalements/${idSignalement}/rejeter`, json("POST", entree)),
    envoyerPhoto: (idSignalement, octets, typeMime) =>
      appeler<{ media: { chemin: string } }>(`/signalements/${idSignalement}/photos`, {
        method: "POST",
        headers: { "content-type": typeMime },
        body: octets,
      }),
  };
}