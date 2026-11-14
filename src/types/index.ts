export type UserRole = 'VISITEUR' | 'CITOYEN' | 'AGENT' | 'SUPERVISEUR' | 'ADMIN';

export type SignalementStatut = 
  | 'NOUVEAU' 
  | 'VALIDE' 
  | 'EN_COURS' 
  | 'RESOLU' 
  | 'REJETE' 
  | 'ROUVERT';

export type PrioriteNiveau = 'BASSE' | 'NORMALE' | 'HAUTE' | 'URGENTE';

export type InterventionStatut = 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE';

export type MotifRejet = 
  | 'Doublon' 
  | 'Hors zone' 
  | 'Hors périmètre' 
  | 'Informations insuffisantes' 
  | 'Contenu inapproprié' 
  | 'Signalement abusif' 
  | 'Autre';

export interface Commune {
  id_commune: string;
  nom: string;
  lat_min: number;
  lat_max: number;
  lon_min: number;
  lon_max: number;
  actif: boolean;
}

export interface Quartier {
  id_quartier: string;
  id_commune: string;
  nom: string;
  centre_lat: number;
  centre_lon: number;
}

export interface Equipe {
  id_equipe: string;
  id_commune: string;
  nom: string;
  description: string;
  actif: boolean;
  zone: string;
}

export interface Categorie {
  id_categorie: string;
  nom: string;
  description: string;
  priorite_base: 1 | 2 | 3 | 4;
  actif: boolean;
  icone: string;
}

export interface Utilisateur {
  id_utilisateur: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  role: UserRole;
  id_equipe?: string;
  actif: boolean;
  mot_de_passe_temporaire?: boolean;
  date_consentement: string;
  date_creation: string;
  derniere_connexion?: string;
}

export interface Media {
  id_media: string;
  id_signalement: string;
  id_intervention?: string;
  type: 'SIGNALEMENT' | 'RESOLUTION';
  url: string;
  mime: string;
  taille_octets: number;
  masque: boolean;
  date_ajout: string;
}

export interface Confirmation {
  id_signalement: string;
  id_utilisateur: string;
  date_confirmation: string;
}

export interface HistoriqueStatut {
  id_historique: string;
  id_signalement: string;
  ancien_statut: SignalementStatut | 'INITIAL';
  nouveau_statut: SignalementStatut;
  id_auteur: string;
  auteur_nom: string;
  date_changement: string;
  commentaire?: string;
}

export interface Intervention {
  id_intervention: string;
  id_signalement: string;
  id_equipe: string;
  equipe_nom?: string;
  id_agent?: string;
  agent_nom?: string;
  id_affecte_par?: string;
  affecte_par_nom?: string;
  statut_intervention: InterventionStatut;
  date_affectation: string;
  date_debut?: string;
  date_fin?: string;
  commentaire?: string;
  motif_annulation?: string;
}

export interface Signalement {
  id_signalement: string;
  id_utilisateur: string;
  auteur_nom?: string; // masqué pour la vue publique
  auteur_contact?: string; // masqué pour la vue publique
  id_categorie: string;
  categorie_nom?: string;
  
  // Champs IA dédiés (EF37, RG16)
  id_categorie_ia?: string;
  categorie_ia_nom?: string;
  score_ia?: number;
  mode_ia: 'MODELE' | 'SIMULATION' | 'AUCUN';
  modele_version?: string;
  justification_ia?: string;
  ia_desaccord?: boolean; // vrai si superviseur a corrigé la suggestion

  id_quartier: string;
  quartier_nom?: string;
  latitude: number;
  longitude: number;
  precision_gps_m: number;
  position_manuelle: boolean;
  repere?: string;
  description: string;
  
  statut: SignalementStatut;
  niveau_priorite: PrioriteNiveau;
  score_priorite: number;
  motif_rejet?: MotifRejet;
  commentaire_rejet?: string;
  
  id_signalement_parent?: string; // pour les doublons liés
  nb_confirmations: number;
  sans_photo: boolean;
  
  id_valide_par?: string;
  valide_par_nom?: string;
  
  date_signalement: string;
  date_validation?: string;
  date_resolution?: string;
  date_mise_a_jour: string;

  // Relations incluses pour affichage
  medias: Media[];
  interventions: Intervention[];
  historique: HistoriqueStatut[];
}

export interface NotificationItem {
  id_notification: string;
  id_utilisateur: string;
  id_signalement: string;
  titre: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  canal: 'APPLICATION' | 'EMAIL';
  lu: boolean;
  date_creation: string;
  date_lecture?: string;
}

export interface KPIStats {
  totalSignalements: number;
  resolusCount: number;
  enCoursCount: number;
  validesCount: number;
  nouveauxCount: number;
  rejetesCount: number;
  rouvertsCount: number;
  
  // Formule Section 13: Résolus / (Validé + En cours + Résolu + Rouvert) * 100
  tauxResolution: number;
  
  // Moyennes en heures
  delaiMoyenTriHeures: number;
  delaiMoyenTraitementHeures: number;
  
  // Respect délais cibles (%)
  tauxRespectDelais: number;
  
  // Taux de rejet (%)
  tauxRejet: number;
  
  // Couverture géographique (% quartiers avec >= 1 signalement)
  couvertureGeographique: number;
  
  // Qualité IA: taux d'accord (%)
  qualiteIA: {
    accordCount: number;
    totalEvalues: number;
    tauxAccord: number;
    scoreMoyen: number;
  };
  
  // Répartitions
  parStatut: { statut: SignalementStatut; label: string; count: number; color: string }[];
  parCategorie: { id_categorie: string; nom: string; count: number; color: string }[];
  parQuartier: { id_quartier: string; nom: string; count: number }[];
  parPriorite: { priorite: PrioriteNiveau; count: number }[];
  parMotifRejet: { motif: MotifRejet; count: number }[];
}
