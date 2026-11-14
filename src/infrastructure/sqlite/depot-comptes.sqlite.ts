import type { DepotComptes } from "@ports/depot-comptes.port.ts";
import type { Compte, CompteAvecEmpreinte } from "@domaine/compte/compte.type.ts";
import type { Role } from "@domaine/compte/role.type.ts";
import type { Base } from "./base.ts";

/**
 * Dépôt SQLite des comptes.
 *
 * L''empreinte du mot de passe n''est lue que par `parIdentifiant` et `compteAvecEmpreinte`,
 * jamais par `parId` ni `lister` : la projection ordinaire ne peut pas la faire fuir par accident.
 * L''unicité de l''e-mail et du téléphone est un index partiel de la base, pas une vérification.
 */
interface LigneCompte {
  id_utilisateur: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  empreinte_mot_de_passe: string;
  role: Role;
  id_equipe: string | null;
  actif: number;
  mot_de_passe_temporaire: number;
  date_consentement: string;
  date_creation: string;
}

function versCompte(ligne: LigneCompte): Compte {
  return {
    idUtilisateur: ligne.id_utilisateur,
    nom: ligne.nom,
    prenom: ligne.prenom,
    email: ligne.email ?? "",
    telephone: ligne.telephone,
    role: ligne.role,
    idEquipe: ligne.id_equipe,
    actif: ligne.actif === 1,
    motDePasseTemporaire: ligne.mot_de_passe_temporaire === 1,
    dateConsentement: ligne.date_consentement,
    dateCreation: ligne.date_creation,
  };
}

const SELECT_COMPTE = `SELECT id_utilisateur, nom, prenom, email, telephone, empreinte_mot_de_passe,
  role, id_equipe, actif, mot_de_passe_temporaire, date_consentement, date_creation FROM utilisateur`;

export function creerDepotComptes(base: Base): DepotComptes {
  const inserer = base.prepare(`
    INSERT INTO utilisateur (
      id_utilisateur, nom, prenom, email, telephone, empreinte_mot_de_passe,
      role, id_equipe, actif, mot_de_passe_temporaire, date_consentement, date_creation
    ) VALUES (
      @id_utilisateur, @nom, @prenom, @email, @telephone, @empreinte_mot_de_passe,
      @role, @id_equipe, @actif, @mot_de_passe_temporaire, @date_consentement, @date_creation
    )`);

  const mettreAJour = base.prepare(`
    UPDATE utilisateur SET role = @role, id_equipe = @id_equipe, actif = @actif
    WHERE id_utilisateur = @id_utilisateur`);

  const parametres = (c: CompteAvecEmpreinte) => ({
    id_utilisateur: c.idUtilisateur,
    nom: c.nom,
    prenom: c.prenom,
    email: c.email.length > 0 ? c.email : null,
    telephone: c.telephone,
    empreinte_mot_de_passe: c.empreinteMotDePasse,
    role: c.role,
    id_equipe: c.idEquipe,
    actif: c.actif ? 1 : 0,
    mot_de_passe_temporaire: c.motDePasseTemporaire ? 1 : 0,
    date_consentement: c.dateConsentement,
    date_creation: c.dateCreation,
  });

  const lire = (idUtilisateur: string): LigneCompte | undefined =>
    base.prepare(`${SELECT_COMPTE} WHERE id_utilisateur = ?`).get(idUtilisateur) as LigneCompte | undefined;

  return {
    parId(idUtilisateur) {
      const ligne = lire(idUtilisateur);
      return ligne ? versCompte(ligne) : null;
    },

    parIdentifiant(identifiant) {
      const ligne = base
        .prepare(`${SELECT_COMPTE} WHERE email = ? OR telephone = ?`)
        .get(identifiant, identifiant) as LigneCompte | undefined;
      if (!ligne) return null;
      return { ...versCompte(ligne), empreinteMotDePasse: ligne.empreinte_mot_de_passe };
    },

    compteAvecEmpreinte(idUtilisateur) {
      const ligne = lire(idUtilisateur);
      if (!ligne) return null;
      return { ...versCompte(ligne), empreinteMotDePasse: ligne.empreinte_mot_de_passe };
    },

    creer(compte) {
      inserer.run(parametres(compte));
    },

    enregistrer(compte) {
      mettreAJour.run({
        id_utilisateur: compte.idUtilisateur,
        role: compte.role,
        id_equipe: compte.idEquipe,
        actif: compte.actif ? 1 : 0,
      });
    },

    changerEmpreinte(idUtilisateur, empreinte, temporaire) {
      base
        .prepare("UPDATE utilisateur SET empreinte_mot_de_passe = ?, mot_de_passe_temporaire = ? WHERE id_utilisateur = ?")
        .run(empreinte, temporaire ? 1 : 0, idUtilisateur);
    },

    lister() {
      const lignes = base.prepare(`${SELECT_COMPTE} ORDER BY role ASC, nom ASC`).all() as LigneCompte[];
      return lignes.map(versCompte);
    },

    compterAdministrateursActifs() {
      const ligne = base
        .prepare("SELECT COUNT(*) AS c FROM utilisateur WHERE role = 'ADMIN' AND actif = 1")
        .get() as { c: number };
      return ligne.c;
    },
  };
}