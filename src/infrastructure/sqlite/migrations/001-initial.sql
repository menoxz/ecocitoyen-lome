-- 001-initial : schéma de départ (§9 de ARCHITECTURE.md).
-- Les contraintes qui expriment une règle du cahier des charges sont portées par le schéma :
-- une règle que la base peut refuser ne doit pas dépendre de la vigilance du code applicatif.

CREATE TABLE commune (
  id_commune   TEXT PRIMARY KEY,
  nom          TEXT NOT NULL,
  lat_min      REAL NOT NULL,
  lat_max      REAL NOT NULL,
  lon_min      REAL NOT NULL,
  lon_max      REAL NOT NULL,
  actif        INTEGER NOT NULL DEFAULT 1 CHECK (actif IN (0, 1))
);

CREATE TABLE quartier (
  id_quartier TEXT PRIMARY KEY,
  id_commune  TEXT NOT NULL REFERENCES commune (id_commune),
  nom         TEXT NOT NULL,
  centre_lat  REAL NOT NULL CHECK (centre_lat BETWEEN -90 AND 90),
  centre_lon  REAL NOT NULL CHECK (centre_lon BETWEEN -180 AND 180),
  actif       INTEGER NOT NULL DEFAULT 1 CHECK (actif IN (0, 1))
);

CREATE TABLE categorie (
  id_categorie   TEXT PRIMARY KEY,
  nom            TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  priorite_base  INTEGER NOT NULL CHECK (priorite_base BETWEEN 1 AND 4),
  icone          TEXT NOT NULL DEFAULT '',
  actif          INTEGER NOT NULL DEFAULT 1 CHECK (actif IN (0, 1))
);

CREATE TABLE equipe (
  id_equipe   TEXT PRIMARY KEY,
  id_commune  TEXT NOT NULL REFERENCES commune (id_commune),
  nom         TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  zone        TEXT NOT NULL DEFAULT '',
  actif       INTEGER NOT NULL DEFAULT 1 CHECK (actif IN (0, 1))
);

CREATE TABLE parametre (
  cle    TEXT PRIMARY KEY,
  valeur TEXT NOT NULL
);

CREATE TABLE utilisateur (
  id_utilisateur         TEXT PRIMARY KEY,
  nom                    TEXT NOT NULL,
  prenom                 TEXT NOT NULL,
  email                  TEXT,
  telephone              TEXT,
  empreinte_mot_de_passe TEXT NOT NULL,
  role                   TEXT NOT NULL CHECK (role IN ('CITOYEN', 'AGENT', 'SUPERVISEUR', 'ADMIN')),
  id_equipe              TEXT REFERENCES equipe (id_equipe),
  actif                  INTEGER NOT NULL DEFAULT 1 CHECK (actif IN (0, 1)),
  mot_de_passe_temporaire INTEGER NOT NULL DEFAULT 0 CHECK (mot_de_passe_temporaire IN (0, 1)),
  date_consentement      TEXT NOT NULL,
  date_creation          TEXT NOT NULL,
  -- Au moins un identifiant, et unicité de chacun (§9.2).
  CHECK (email IS NOT NULL OR telephone IS NOT NULL)
);

CREATE UNIQUE INDEX un_email ON utilisateur (email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX un_telephone ON utilisateur (telephone) WHERE telephone IS NOT NULL;
CREATE INDEX ix_utilisateur_role ON utilisateur (role, actif);

CREATE TABLE session (
  jeton_hache TEXT PRIMARY KEY,
  id_utilisateur TEXT NOT NULL REFERENCES utilisateur (id_utilisateur),
  expire_le   TEXT NOT NULL,
  cree_le     TEXT NOT NULL
);

CREATE TABLE signalement (
  id_signalement   TEXT PRIMARY KEY,
  id_utilisateur   TEXT NOT NULL REFERENCES utilisateur (id_utilisateur),
  id_categorie     TEXT NOT NULL REFERENCES categorie (id_categorie),
  id_categorie_ia  TEXT REFERENCES categorie (id_categorie),
  id_quartier      TEXT NOT NULL REFERENCES quartier (id_quartier),
  latitude         REAL NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude        REAL NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  precision_gps_m  REAL NOT NULL DEFAULT 10 CHECK (precision_gps_m >= 0),
  position_manuelle INTEGER NOT NULL DEFAULT 0 CHECK (position_manuelle IN (0, 1)),
  repere           TEXT,
  description      TEXT NOT NULL CHECK (length(description) BETWEEN 10 AND 500),
  statut           TEXT NOT NULL CHECK (statut IN ('NOUVEAU', 'VALIDE', 'EN_COURS', 'RESOLU', 'REJETE', 'ROUVERT')),
  niveau_priorite  TEXT NOT NULL CHECK (niveau_priorite IN ('BASSE', 'NORMALE', 'HAUTE', 'URGENTE')),
  score_priorite   INTEGER NOT NULL CHECK (score_priorite >= 1),
  motif_rejet      TEXT CHECK (motif_rejet IN ('Doublon', 'Hors zone', 'Hors périmètre', 'Informations insuffisantes', 'Contenu inapproprié', 'Signalement abusif', 'Autre')),
  commentaire_rejet TEXT,
  id_signalement_parent TEXT REFERENCES signalement (id_signalement),
  sans_photo       INTEGER NOT NULL DEFAULT 0 CHECK (sans_photo IN (0, 1)),
  score_ia         REAL CHECK (score_ia IS NULL OR score_ia BETWEEN 0 AND 1),
  mode_ia          TEXT NOT NULL DEFAULT 'AUCUN' CHECK (mode_ia IN ('MODELE', 'SIMULATION', 'AUCUN')),
  justification_ia TEXT,
  ia_desaccord     INTEGER NOT NULL DEFAULT 0 CHECK (ia_desaccord IN (0, 1)),
  id_valide_par    TEXT REFERENCES utilisateur (id_utilisateur),
  date_signalement TEXT NOT NULL,
  date_validation  TEXT,
  date_affectation TEXT,
  date_resolution  TEXT,
  date_mise_a_jour TEXT NOT NULL,
  -- Un rejet sans motif est refusé par la base (§9.2, CR5).
  CHECK (statut <> 'REJETE' OR motif_rejet IS NOT NULL),
  -- Un dossier décidé porte sa date de décision (§9.2).
  CHECK (statut NOT IN ('VALIDE', 'EN_COURS', 'RESOLU', 'ROUVERT') OR date_validation IS NOT NULL)
);

CREATE INDEX ix_signalement_statut ON signalement (statut, date_signalement);
CREATE INDEX ix_signalement_quartier ON signalement (id_quartier);
CREATE INDEX ix_signalement_geo ON signalement (latitude, longitude);

CREATE TABLE media (
  id_media        TEXT PRIMARY KEY,
  id_signalement  TEXT NOT NULL REFERENCES signalement (id_signalement),
  id_intervention TEXT,
  type            TEXT NOT NULL CHECK (type IN ('SIGNALEMENT', 'RESOLUTION')),
  chemin          TEXT NOT NULL,
  mime            TEXT NOT NULL,
  taille_octets   INTEGER NOT NULL CHECK (taille_octets > 0),
  masque          INTEGER NOT NULL DEFAULT 0 CHECK (masque IN (0, 1)),
  date_ajout      TEXT NOT NULL
);

CREATE INDEX ix_media_signalement ON media (id_signalement, type);

CREATE TABLE confirmation (
  id_signalement TEXT NOT NULL REFERENCES signalement (id_signalement),
  id_utilisateur TEXT NOT NULL REFERENCES utilisateur (id_utilisateur),
  date_confirmation TEXT NOT NULL,
  -- Une seule confirmation par utilisateur et par signalement (RG05), garanti par la clé.
  PRIMARY KEY (id_signalement, id_utilisateur)
);

CREATE TABLE historique_statut (
  id_historique  TEXT PRIMARY KEY,
  id_signalement TEXT NOT NULL REFERENCES signalement (id_signalement),
  ancien_statut  TEXT,
  nouveau_statut TEXT NOT NULL,
  id_auteur      TEXT NOT NULL REFERENCES utilisateur (id_utilisateur),
  date_changement TEXT NOT NULL,
  commentaire    TEXT
);

CREATE INDEX ix_historique_signalement ON historique_statut (id_signalement, date_changement);

CREATE TABLE intervention (
  id_intervention     TEXT PRIMARY KEY,
  id_signalement      TEXT NOT NULL REFERENCES signalement (id_signalement),
  id_equipe           TEXT NOT NULL REFERENCES equipe (id_equipe),
  id_agent            TEXT REFERENCES utilisateur (id_utilisateur),
  id_affecte_par      TEXT NOT NULL REFERENCES utilisateur (id_utilisateur),
  statut_intervention TEXT NOT NULL CHECK (statut_intervention IN ('PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ANNULEE')),
  date_affectation    TEXT NOT NULL,
  date_debut          TEXT,
  date_fin            TEXT,
  commentaire         TEXT,
  motif_annulation    TEXT
);

-- Une seule intervention active par signalement (§5.2, §9.2).
CREATE UNIQUE INDEX un_intervention_active ON intervention (id_signalement)
  WHERE statut_intervention IN ('PLANIFIEE', 'EN_COURS');

CREATE INDEX ix_intervention_equipe ON intervention (id_equipe, statut_intervention);

CREATE TABLE notification (
  id_notification TEXT PRIMARY KEY,
  id_utilisateur  TEXT NOT NULL REFERENCES utilisateur (id_utilisateur),
  id_signalement  TEXT REFERENCES signalement (id_signalement),
  titre           TEXT NOT NULL,
  message         TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('INFO', 'SUCCESS', 'WARNING', 'ALERT')),
  canal           TEXT NOT NULL DEFAULT 'APPLICATION',
  lu              INTEGER NOT NULL DEFAULT 0 CHECK (lu IN (0, 1)),
  date_creation   TEXT NOT NULL,
  date_lecture    TEXT
);

CREATE INDEX ix_notification_destinataire ON notification (id_utilisateur, lu);

CREATE TABLE journal_audit (
  id_journal     TEXT PRIMARY KEY,
  acteur         TEXT NOT NULL,
  id_utilisateur TEXT REFERENCES utilisateur (id_utilisateur),
  action         TEXT NOT NULL,
  cible          TEXT,
  avant          TEXT,
  apres          TEXT,
  adresse_ip     TEXT,
  date_action    TEXT NOT NULL
);

CREATE INDEX ix_journal_date ON journal_audit (date_action);

CREATE TABLE tache (
  id_tache     TEXT PRIMARY KEY,
  type         TEXT NOT NULL,
  cible        TEXT NOT NULL,
  etat         TEXT NOT NULL CHECK (etat IN ('EN_ATTENTE', 'EN_COURS', 'TERMINEE', 'ECHOUEE')),
  tentatives   INTEGER NOT NULL DEFAULT 0,
  disponible_le TEXT NOT NULL,
  derniere_erreur TEXT
);

CREATE INDEX ix_tache_etat ON tache (etat, disponible_le);

CREATE TABLE limite_debit (
  cle          TEXT NOT NULL,
  fenetre_debut TEXT NOT NULL,
  compteur     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (cle, fenetre_debut)
);