import { useEffect, useState, type ReactNode } from "react";
import { UserPlus } from "lucide-react";
import type { ClientApi, CompteApi, EquipeApi, ErreurApi } from "../../api/client.ts";
import { ChampSelect } from "../../ui/ChampSelect.tsx";
import { ChampTexte } from "../../ui/ChampTexte.tsx";
import { Icone } from "../../ui/Icone.tsx";
import { ESPACEMENT, TAILLE_TEXTE } from "../../ui/jetons.ts";

/**
 * Création d'un compte interne (RB03).
 *
 * C'est le geste qui manquait : un agent municipal n'a pas à s'inscrire par le formulaire citoyen.
 * L'administrateur saisit l'identité, choisit le rôle et l'équipe ; le serveur renvoie le mot de
 * passe temporaire **une seule fois**, affiché juste après par l'écran qui monte ce formulaire.
 *
 * L'équipe n'est demandée que pour un agent : c'est elle qui détermine les dossiers visibles, et un
 * agent sans équipe aurait une file vide, ce qui passerait pour une panne.
 */
const ROLES_INTERNES = [
  { valeur: "AGENT", libelle: "Agent de terrain" },
  { valeur: "SUPERVISEUR", libelle: "Superviseur" },
  { valeur: "ADMIN", libelle: "Administrateur" },
] as const;

export interface ProprietesFormulaireCreationCompte {
  readonly client: ClientApi;
  readonly onCree: (compte: CompteApi, motDePasseTemporaire: string, libelle: string) => void;
}

export function FormulaireCreationCompte(proprietes: ProprietesFormulaireCreationCompte): ReactNode {
  const [ouvert, setOuvert] = useState(false);
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("AGENT");
  const [idEquipe, setIdEquipe] = useState("");
  const [equipes, setEquipes] = useState<readonly EquipeApi[]>([]);
  const [erreur, setErreur] = useState<ErreurApi | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    void proprietes.client.equipes().then((resultat) => {
      if (resultat.ok) {
        setEquipes(resultat.valeur);
        setIdEquipe((valeur) => (valeur === "" ? (resultat.valeur[0]?.id_equipe ?? "") : valeur));
      }
    });
  }, [proprietes.client]);

  if (!ouvert) {
    return (
      <button type="button" className="ui-bouton ui-bouton--primaire" onClick={() => setOuvert(true)}>
        <Icone icone={UserPlus} taille={18} />
        Créer un compte interne
      </button>
    );
  }

  const envoyer = (): void => {
    setEnvoi(true);
    setErreur(null);
    void proprietes.client
      .creerCompteInterne({
        nom,
        prenom,
        email,
        role,
        id_equipe: role === "AGENT" ? idEquipe || null : null,
      })
      .then((resultat) => {
        setEnvoi(false);
        if (!resultat.ok) {
          setErreur(resultat.erreur);
          return;
        }
        const { compte, mot_de_passe_temporaire } = resultat.valeur;
        setPrenom("");
        setNom("");
        setEmail("");
        setOuvert(false);
        proprietes.onCree(
          compte,
          mot_de_passe_temporaire,
          `${compte.prenom} ${compte.nom} créé avec le rôle ${compte.role}.`,
        );
      });
  };

  return (
    <section className="ui-carte-etapes" style={{ padding: ESPACEMENT.e3 }}>
      <h2 style={{ margin: 0, fontSize: TAILLE_TEXTE.md }}>Nouveau compte interne</h2>
      <p style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-texte-attenue)" }}>
        Le mot de passe temporaire s'affiche une seule fois, juste après la création.
      </p>

      <div className="ui-grille-formulaire">
        <ChampTexte id="creation-prenom" libelle="Prénom" valeur={prenom} onChange={setPrenom} requis />
        <ChampTexte id="creation-nom" libelle="Nom" valeur={nom} onChange={setNom} requis />
        <ChampTexte id="creation-email" libelle="Adresse email" valeur={email} onChange={setEmail} type="email" requis />
        <ChampSelect id="creation-role" libelle="Rôle" valeur={role} options={ROLES_INTERNES} onChange={setRole} />
        {role === "AGENT" ? (
          <ChampSelect
            id="creation-equipe"
            libelle="Équipe"
            valeur={idEquipe}
            options={equipes.map((equipe) => ({
              valeur: equipe.id_equipe,
              libelle: `${equipe.nom} — ${equipe.zone}`,
            }))}
            onChange={setIdEquipe}
          />
        ) : null}
      </div>

      {erreur ? (
        <p role="alert" style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-erreur)" }}>
          {erreur.message}
        </p>
      ) : null}

      <div style={{ display: "flex", gap: ESPACEMENT.e2 }}>
        <button type="button" className="ui-bouton ui-bouton--primaire" onClick={envoyer} disabled={envoi}>
          {envoi ? "Création…" : "Créer le compte"}
        </button>
        <button type="button" className="ui-bouton" onClick={() => setOuvert(false)}>
          Annuler
        </button>
      </div>
    </section>
  );
}
