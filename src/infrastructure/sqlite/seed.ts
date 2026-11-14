import type { Base } from "./base.ts";
import type { Signalement, Statut } from "@domaine/signalement/signalement.type.ts";
import { creerDepotSignalements } from "./depot-signalements.sqlite.ts";
import { creerDepotComptes } from "./depot-comptes.sqlite.ts";
import { creerDepotReferentiel } from "./depot-referentiel.sqlite.ts";

/**
 * Jeu de démonstration (MODE_DEMO).
 *
 * Il remplace le fichier de données codé en dur du prototype : mêmes ordres de grandeur,
 * mais rangé dans les tables, donc sauvegardable, interrogeable et supprimable d'un geste.
 * Les empreintes sont des valeurs sentinelles non vérifiables : le hachage réel arrive avec
 * le module `compte` (phase P3). Aucun compte de démonstration n'est donc utilisable en production.
 */
const EMPREINTE_SEED = "SEED_NON_UTILISABLE";

export interface CompteursSeed {
  readonly communes: number;
  readonly quartiers: number;
  readonly categories: number;
  readonly equipes: number;
  readonly comptes: number;
  readonly signalements: number;
  readonly parametres: number;
}

const QUARTIERS: readonly (readonly [id: string, nom: string, lat: number, lon: number])[] = [
  ["qrt-be", "Bè", 6.1255, 1.2222],
  ["qrt-tokoin", "Tokoin", 6.1412, 1.2126],
  ["qrt-kodjoviakope", "Kodjoviakopé", 6.1247, 1.2489],
  ["qrt-nyekonakpoe", "Nyékonakpoé", 6.1301, 1.2194],
  ["qrt-adawlato", "Adawlato", 6.1289, 1.2139],
  ["qrt-amoutive", "Amoutivé", 6.1262, 1.2098],
  ["qrt-aflao-gakli", "Aflao-Gakli", 6.1131, 1.2345],
  ["qrt-adidogome", "Adidogomé", 6.1741, 1.1712],
  ["qrt-agoe", "Agoè-Nyivé", 6.2019, 1.2087],
  ["qrt-baguida", "Baguida", 6.1587, 1.3241],
  ["qrt-kpogan", "Kpogan", 6.1902, 1.2634],
  ["qrt-zossime", "Zossimé", 6.2183, 1.1901],
];

const CATEGORIES: readonly (readonly [id: string, nom: string, priorite: number])[] = [
  ["cat-1", "Dépôt sauvage d'ordures", 3],
  ["cat-2", "Caniveau bouché", 3],
  ["cat-3", "Déchets ménagers non collectés", 2],
  ["cat-4", "Déchets potentiellement dangereux", 4],
  ["cat-5", "Autres problèmes environnementaux", 1],
];

const EQUIPES: readonly (readonly [id: string, nom: string, zone: string])[] = [
  ["eq-1", "Équipe propreté Centre", "Bè, Adawlato, Amoutivé, Nyékonakpoé"],
  ["eq-2", "Équipe propreté Est", "Kodjoviakopé, Aflao-Gakli, Baguida"],
  ["eq-3", "Équipe propreté Nord", "Tokoin, Adidogomé, Agoè-Nyivé, Zossimé"],
  ["eq-4", "Équipe assainissement", "Caniveaux et drains, toute la commune"],
];

const COMPTES: readonly (readonly [id: string, prenom: string, nom: string, email: string, role: string, equipe: string | null])[] = [
  ["usr-adm-1", "Akouvi", "Adjo", "admin@ecocitoyen.tg", "ADMIN", null],
  ["usr-sup-1", "Kossi", "Amegboh", "superviseur@ecocitoyen.tg", "SUPERVISEUR", null],
  ["usr-agent-1", "Yao", "Dogbe", "agent.centre@ecocitoyen.tg", "AGENT", "eq-1"],
  ["usr-agent-2", "Afi", "Kpodo", "agent.est@ecocitoyen.tg", "AGENT", "eq-2"],
  ["usr-cit-1", "Koffi", "Mensah", "koffi.mensah@example.tg", "CITOYEN", null],
  ["usr-cit-2", "Akouavi", "Lawson", "akouavi.lawson@example.tg", "CITOYEN", null],
];

/** 22 signalements répartis sur les douze quartiers et les six statuts. */
const MODELES: readonly (readonly [
  categorie: string,
  quartier: string,
  statut: Statut,
  priorite: "BASSE" | "NORMALE" | "HAUTE" | "URGENTE",
  score: number,
  auteur: string,
  description: string,
])[] = [
  ["cat-1", "qrt-be", "RESOLU", "HAUTE", 4, "usr-cit-1", "Tas de déchets plastiques devant l école primaire de Bè, très fréquenté le matin."],
  ["cat-2", "qrt-tokoin", "RESOLU", "URGENTE", 5, "usr-cit-2", "Caniveau bouché rue des Palmiers, eau stagnante devant trois concessions."],
  ["cat-3", "qrt-kodjoviakope", "RESOLU", "NORMALE", 3, "usr-cit-1", "Bacs collectifs débordants depuis quatre jours près du marché de Kodjoviakopé."],
  ["cat-1", "qrt-adidogome", "RESOLU", "HAUTE", 4, "usr-cit-2", "Dépôt sauvage sur le terrain vague en face de la station, odeur forte le soir."],
  ["cat-4", "qrt-aflao-gakli", "RESOLU", "URGENTE", 5, "usr-cit-1", "Flacons chimiques abandonnés près du forage, risque pour les enfants du quartier."],
  ["cat-1", "qrt-agoe", "EN_COURS", "HAUTE", 4, "usr-cit-2", "Amas d ordures ménagères au carrefour, les riverains demandent un passage de benne."],
  ["cat-2", "qrt-nyekonakpoe", "EN_COURS", "URGENTE", 5, "usr-cit-1", "Caniveau obstrué par des sachets, l eau monte dès les premières pluies."],
  ["cat-3", "qrt-amoutive", "EN_COURS", "NORMALE", 3, "usr-cit-2", "Points de collecte saturés depuis une semaine, les sacs sont posés au sol."],
  ["cat-1", "qrt-baguida", "EN_COURS", "NORMALE", 3, "usr-cit-1", "Dépôt récurrent sur la plage, déchets ramenés par la mer et laissés sur place."],
  ["cat-5", "qrt-zossime", "EN_COURS", "BASSE", 2, "usr-cit-2", "Branchages et gravats laissés après des travaux de voirie, gêne la circulation."],
  ["cat-2", "qrt-kpogan", "EN_COURS", "HAUTE", 4, "usr-cit-1", "Drain principal bouché, stagnation devant le dispensaire du quartier."],
  ["cat-1", "qrt-tokoin", "VALIDE", "HAUTE", 4, "usr-cit-2", "Tas d ordures derrière le marché, accessible par la ruelle côté gare routière."],
  ["cat-3", "qrt-be", "VALIDE", "NORMALE", 3, "usr-cit-1", "Bennes non passées depuis six jours, les habitants stockent devant les portes."],
  ["cat-4", "qrt-adawlato", "VALIDE", "URGENTE", 5, "usr-cit-2", "Batteries et huiles usagées déposées devant un atelier, forte odeur de solvant."],
  ["cat-1", "qrt-kodjoviakope", "VALIDE", "NORMALE", 3, "usr-cit-1", "Dépôt sauvage sous le pont piéton, les déchets tombent dans le caniveau."],
  ["cat-5", "qrt-adidogome", "VALIDE", "BASSE", 2, "usr-cit-2", "Sacs de ciment éventrés sur la chaussée, poussière importante au passage des motos."],
  ["cat-1", "qrt-aflao-gakli", "NOUVEAU", "HAUTE", 4, "usr-cit-1", "Nouveau dépôt devant la pharmacie du quartier, apparu ce matin."],
  ["cat-2", "qrt-amoutive", "NOUVEAU", "NORMALE", 3, "usr-cit-2", "Grille d évacuation arrachée et obstruée, à remplacer avant la saison des pluies."],
  ["cat-3", "qrt-agoe", "NOUVEAU", "BASSE", 2, "usr-cit-1", "Bacs renversés par le vent, déchets éparpillés sur le trottoir."],
  ["cat-5", "qrt-baguida", "NOUVEAU", "NORMALE", 3, "usr-cit-2", "Restes de poissons laissés sur la plage par un vendeur, nuisance olfactive."],
  ["cat-4", "qrt-zossime", "REJETE", "HAUTE", 4, "usr-cit-1", "Signalement de déchets dangereux sur un site déjà traité la semaine dernière."],
  ["cat-2", "qrt-kpogan", "ROUVERT", "HAUTE", 4, "usr-cit-2", "Le caniveau signalé et déclaré traité laisse toujours passer l eau sur la chaussée."],
];

const PARAMETRES: readonly (readonly [cle: string, valeur: string])[] = [
  ["sla.URGENTE.tri", "12"],
  ["sla.URGENTE.affectation", "24"],
  ["sla.URGENTE.resolution", "72"],
  ["sla.HAUTE.tri", "48"],
  ["sla.HAUTE.affectation", "48"],
  ["sla.HAUTE.resolution", "168"],
  ["sla.NORMALE.tri", "48"],
  ["sla.NORMALE.affectation", "72"],
  ["sla.NORMALE.resolution", "336"],
  ["sla.BASSE.tri", "48"],
  ["sla.BASSE.affectation", "120"],
  ["sla.BASSE.resolution", "720"],
  ["doublon.rayonMetres", "30"],
  ["doublon.fenetreJours", "30"],
  ["priorite.rayonSiteSensibleM", "100"],
  ["priorite.corroborationMin", "3"],
  ["priorite.delaiSansDecisionHeures", "72"],
  ["contestation.jours", "7"],
];

function heure(dateIso: string, decalageHeures: number): string {
  return new Date(Date.parse(dateIso) + decalageHeures * 3_600_000).toISOString();
}

/** Charge le jeu de démonstration. Ne fait rien si une commune existe déjà (idempotent). */
export function seedDemonstration(base: Base, maintenantIso: string): CompteursSeed | null {
  const referentiel = creerDepotReferentiel(base);
  if (referentiel.communes().length > 0) {
    return null;
  }

  const comptes = creerDepotComptes(base);
  const signalements = creerDepotSignalements(base);

  const travail = base.transaction(() => {
    referentiel.ajouterCommune({
      idCommune: "cmp-lome",
      nom: "Grand Lomé",
      latMin: 6.08,
      latMax: 6.25,
      lonMin: 1.12,
      lonMax: 1.35,
      actif: true,
    });

    for (const [id, nom, lat, lon] of QUARTIERS) {
      referentiel.ajouterQuartier({
        idQuartier: id,
        idCommune: "cmp-lome",
        nom,
        centreLat: lat,
        centreLon: lon,
        actif: true,
      });
    }

    for (const [id, nom, priorite] of CATEGORIES) {
      referentiel.ajouterCategorie({
        idCategorie: id,
        nom,
        description: "",
        prioriteBase: priorite,
        icone: id,
        actif: true,
      });
    }

    for (const [id, nom, zone] of EQUIPES) {
      referentiel.ajouterEquipe({
        idEquipe: id,
        idCommune: "cmp-lome",
        nom,
        description: "",
        zone,
        actif: true,
      });
    }

    for (const [cle, valeur] of PARAMETRES) {
      referentiel.ecrireParametre(cle, valeur);
    }

    for (const [id, prenom, nom, email, role, equipe] of COMPTES) {
      comptes.creer({
        idUtilisateur: id,
        nom,
        prenom,
        email,
        telephone: null,
        role: role as "ADMIN" | "SUPERVISEUR" | "AGENT" | "CITOYEN",
        idEquipe: equipe,
        actif: true,
        motDePasseTemporaire: role !== "CITOYEN",
        empreinteMotDePasse: EMPREINTE_SEED,
        dateConsentement: heure(maintenantIso, -24 * 90),
        dateCreation: heure(maintenantIso, -24 * 90),
      });
    }

    MODELES.forEach((modele, index) => {
      const [idCategorie, idQuartier, statut, priorite, score, auteur, description] = modele;
      const idSignalement = `sig-seed-${String(index + 1).padStart(3, "0")}`;
      const dateSignalement = heure(maintenantIso, -(index + 1) * 8);
      const decide = statut !== "NOUVEAU" && statut !== "REJETE";
      const dateValidation = decide || statut === "REJETE" ? heure(dateSignalement, 6) : null;

      const dateAffectation =
        statut === "EN_COURS" || statut === "RESOLU" || statut === "ROUVERT"
          ? heure(dateSignalement, 20)
          : null;
      const dateResolution =
        statut === "RESOLU" || statut === "ROUVERT" ? heure(dateSignalement, 40) : null;

      const signalement: Signalement = {
        idSignalement,
        idAuteur: auteur,
        idCategorie,
        idQuartier,
        latitude: 6.12 + index * 0.004,
        longitude: 1.2 + index * 0.004,
        description,
        statut,
        niveauPriorite: priorite,
        scorePriorite: score,
        sansPhoto: false,
        nbConfirmations: 0,
        idCategorieIa: null,
        scoreIa: null,
        modeIa: "AUCUN",
        iaDesaccord: false,
        motifRejet: statut === "REJETE" ? "Doublon" : null,
        dateSignalement,
        dateValidation,
        dateAffectation,
        dateResolution,
        dateMiseAJour: dateSignalement,
      };

      signalements.creer(signalement, {
        idHistorique: `hist-${idSignalement}-0`,
        idSignalement,
        ancienStatut: null,
        nouveauStatut: "NOUVEAU",
        idAuteur: auteur,
        dateChangement: dateSignalement,
        commentaire: "Signalement créé (jeu de démonstration)",
      });

      const ajouterTransition = (rang: string, ancien: Statut, nouveau: Statut, date: string, commentaire: string): void =>
        signalements.ajouterHistorique({
          idHistorique: "hist-" + idSignalement + "-" + rang,
          idSignalement,
          ancienStatut: ancien,
          nouveauStatut: nouveau,
          idAuteur: "usr-sup-1",
          dateChangement: date,
          commentaire,
        });

      if (statut === "REJETE" && dateValidation) {
        ajouterTransition("1", "NOUVEAU", "REJETE", dateValidation, "Rejet pour doublon constaté sur place");
      }
      if (decide && dateValidation) {
        ajouterTransition("1", "NOUVEAU", "VALIDE", dateValidation, "Validé par le superviseur");
      }
      if ((statut === "EN_COURS" || statut === "RESOLU" || statut === "ROUVERT") && dateValidation) {
        ajouterTransition("2", "VALIDE", "EN_COURS", heure(dateValidation, 12), "Affectation à une équipe");
      }
      if ((statut === "RESOLU" || statut === "ROUVERT") && dateResolution) {
        ajouterTransition("3", "EN_COURS", "RESOLU", dateResolution, "Intervention terminée avec preuve photo");
      }
      if (statut === "ROUVERT" && dateResolution) {
        ajouterTransition("4", "RESOLU", "ROUVERT", heure(dateResolution, 24), "Résolution contestée par le citoyen");
      }

      if (statut === "EN_COURS" || statut === "RESOLU" || statut === "ROUVERT") {
        signalements.creerIntervention({
          idIntervention: `int-${idSignalement}`,
          idSignalement,
          idEquipe: index % 2 === 0 ? "eq-1" : "eq-2",
          idAgent: null,
          idAffectePar: "usr-sup-1",
          statutIntervention: statut === "EN_COURS" ? "EN_COURS" : "TERMINEE",
          dateAffectation: heure(dateSignalement, 20),
          dateDebut: heure(dateSignalement, 24),
          dateFin: statut === "RESOLU" || statut === "ROUVERT" ? heure(dateSignalement, 40) : null,
          commentaire: null,
        });
      }
    });

    signalements.ajouterConfirmation("sig-seed-001", "usr-cit-2", heure(maintenantIso, -30));
    signalements.ajouterConfirmation("sig-seed-007", "usr-cit-2", heure(maintenantIso, -20));
  });

  travail();

  return {
    communes: referentiel.communes().length,
    quartiers: referentiel.quartiers().length,
    categories: referentiel.categories().length,
    equipes: referentiel.equipes().length,
    comptes: comptes.lister().length,
    signalements: signalements.lister({ limite: 500 }).length,
    parametres: referentiel.parametres().length,
  };
}