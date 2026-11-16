import { assembler } from "../src/interface/http/serveur.ts";
import { verifierModificationCompte } from "../src/domaine/compte/administration.regle.ts";
import { ErreurMetier } from "../src/domaine/erreurs.ts";
import type { Role } from "../src/domaine/compte/role.type.ts";

/**
 * Donne un rôle d'exploitation à un compte existant.
 *
 * L'inscription publique crée toujours un `CITOYEN` (`inscrire.cas.ts`), et le changement de rôle
 * passe par `modifierCompte`, qui exige déjà le droit `modifierCompte` — donc un administrateur.
 * Sur une base neuve, aucun administrateur n'existe : c'est le problème de l'œuf et de la poule.
 * Ce script est la porte d'amorçage, hors HTTP : il applique la règle du domaine (verrou du dernier
 * administrateur compris), écrit dans le journal d'audit, et rien d'autre.
 *
 * Usage :
 *   bun scripts/promouvoir-compte.ts <email> <ROLE> [--base <chemin>]
 *
 * Exemple :
 *   bun scripts/promouvoir-compte.ts admin@ecocitoyen.tg ADMIN --base data/ecocitoyen.db
 */

const ROLES: readonly Role[] = ["CITOYEN", "AGENT", "SUPERVISEUR", "ADMIN"];

function lireArguments(argv: readonly string[]): { email: string; role: Role; base: string } {
  const positionnels = argv.filter((valeur) => !valeur.startsWith("--"));
  const indexBase = argv.indexOf("--base");
  const base = indexBase > -1 ? (argv[indexBase + 1] ?? "") : (process.env.DB_CHEMIN ?? "data/ecocitoyen.db");
  const email = (positionnels[0] ?? "").trim();
  const role = (positionnels[1] ?? "").trim().toUpperCase();

  if (email === "" || !ROLES.includes(role as Role)) {
    process.stderr.write(
      `Usage : bun scripts/promouvoir-compte.ts <email> <${ROLES.join("|")}> [--base <chemin>]\n`,
    );
    process.exit(2);
  }
  return { email, role: role as Role, base };
}

const { email, role, base } = lireArguments(process.argv.slice(2));
const { deps } = assembler(base, false);

const cible = deps.comptes.lister().find((compte) => compte.email === email);
if (!cible) {
  process.stderr.write(`Aucun compte avec l'adresse ${email} dans ${base}.\n`);
  process.exit(1);
}
if (cible.role === role) {
  process.stdout.write(`${email} est déjà ${role}. Rien à faire.\n`);
  process.exit(0);
}

try {
  verifierModificationCompte(cible, { role }, deps.comptes.compterAdministrateursActifs());
} catch (erreur) {
  if (erreur instanceof ErreurMetier) {
    process.stderr.write(`Refusé par la règle du domaine : ${erreur.code}\n`);
    process.exit(1);
  }
  throw erreur;
}

deps.comptes.enregistrer({ ...cible, role });
deps.journal.enregistrer({
  idJournal: deps.identifiants.nouveau("jrn"),
  acteur: "cli-exploitation",
  idUtilisateur: cible.idUtilisateur,
  action: "compte.promotion.exploitation",
  cible: cible.idUtilisateur,
  avant: cible.role,
  apres: role,
  adresseIp: null,
  dateAction: deps.horloge.maintenant(),
});

process.stdout.write(`${email} : ${cible.role} -> ${role} (journalisé)\n`);
