import { preparerBase, type Base } from "./base.ts";
import type { Signalement } from "@domaine/signalement/signalement.type.ts";

/**
 * Support de test partagé par les dépôts : une base en mémoire déjà peuplée du référentiel
 * minimal. Quatre tests en ont besoin ; le dupliquer à chaque fois rendrait les échecs illisibles.
 */
export function baseTest(): Base {
  const base = preparerBase({ chemin: ":memory:" });

  base.prepare("INSERT INTO commune VALUES ('cmp-lome','Grand Lomé',6.08,6.25,1.12,1.35,1)").run();
  base.prepare("INSERT INTO quartier VALUES ('qrt-be','cmp-lome','Bè',6.1255,1.2222,1)").run();
  base.prepare("INSERT INTO quartier VALUES ('qrt-tokoin','cmp-lome','Tokoin',6.1412,1.2126,1)").run();
  base.prepare("INSERT INTO categorie VALUES ('cat-1','Dépôt sauvage','',3,'',1)").run();
  base.prepare("INSERT INTO categorie VALUES ('cat-2','Caniveau bouché','',3,'',1)").run();
  base.prepare("INSERT INTO equipe VALUES ('eq-1','cmp-lome','Équipe centre','','Bè',1)").run();
  base.prepare("INSERT INTO equipe VALUES ('eq-2','cmp-lome','Équipe est','','Tokoin',1)").run();

  const utilisateur = base.prepare(
    `INSERT INTO utilisateur (
       id_utilisateur, nom, prenom, email, telephone, empreinte_mot_de_passe, role, id_equipe,
       actif, mot_de_passe_temporaire, date_consentement, date_creation
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`,
  );
  utilisateur.run("usr-cit-1", "Mensah", "Koffi", "koffi@example.tg", null, "empreinte-1", "CITOYEN", null);
  utilisateur.run("usr-cit-2", "Lawson", "Akouavi", "akouavi@example.tg", "+22890000002", "empreinte-2", "CITOYEN", null);
  utilisateur.run("usr-sup-1", "Amegboh", "Kossi", "superviseur@example.tg", null, "empreinte-3", "SUPERVISEUR", null);
  utilisateur.run("usr-agent-1", "Dogbe", "Yao", "agent1@example.tg", null, "empreinte-4", "AGENT", "eq-1");
  utilisateur.run("usr-adm-1", "Adjo", "Akouvi", "admin@example.tg", null, "empreinte-5", "ADMIN", null);

  return base;
}

export function signalementDeTest(surcharge: Partial<Signalement> = {}): Signalement {
  return {
    idSignalement: "sig-1",
    idAuteur: "usr-cit-1",
    idCategorie: "cat-1",
    idQuartier: "qrt-be",
    latitude: 6.1255,
    longitude: 1.2222,
    description: "Tas de déchets plastiques devant l'école primaire",
    statut: "NOUVEAU",
    niveauPriorite: "NORMALE",
    scorePriorite: 3,
    sansPhoto: false,
    nbConfirmations: 0,
    idCategorieIa: null,
    scoreIa: null,
    modeIa: "AUCUN",
    iaDesaccord: false,
    motifRejet: null,
    dateSignalement: "2026-11-10T08:00:00.000Z",
    dateValidation: null,
    dateAffectation: null,
    dateResolution: null,
    dateMiseAJour: "2026-11-10T08:00:00.000Z",
    ...surcharge,
  };
}
