import { useState, type ReactNode } from "react";
import { KeyRound } from "lucide-react";
import type { ClientApi, ErreurApi } from "../../api/client.ts";
import { ChampTexte } from "../../ui/ChampTexte.tsx";
import { Icone } from "../../ui/Icone.tsx";
import { ESPACEMENT, TAILLE_TEXTE } from "../../ui/jetons.ts";

/**
 * Changement de son propre mot de passe.
 *
 * Affiché à la place de l'écran de travail quand `mot_de_passe_temporaire` est vrai : un agent
 * invité ne doit pas garder le secret que l'administrateur connaît.
 *
 * Trois corrections viennent d'être observées à l'usage : un second champ de confirmation (une
 * faute de frappe sur un téléphone enfermait l'agent hors de son compte), un message de réussite
 * explicite (le formulaire disparaissait sans rien dire), et la propagation du nouvel'état de
 * session à l'en-tête.
 */
export interface ProprietesFormulaireMotDePasse {
  readonly client: ClientApi;
  readonly temporaire: boolean;
  readonly onChange: () => void;
}

export function FormulaireMotDePasse(proprietes: ProprietesFormulaireMotDePasse): ReactNode {
  const [ancien, setAncien] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreur, setErreur] = useState<ErreurApi | { message: string; code?: string } | null>(null);
  const [reussi, setReussi] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  const envoyer = (): void => {
    setErreur(null);
    if (nouveau !== confirmation) {
      setErreur({ message: "Les deux saisies du nouveau mot de passe diffèrent.", code: "CONFIRMATION_DIFFERENTE" });
      return;
    }
    setEnvoi(true);
    void proprietes.client.changerMotDePasse({ ancien, nouveau }).then((resultat) => {
      setEnvoi(false);
      if (!resultat.ok) {
        setErreur(resultat.erreur);
        return;
      }
      setReussi(true);
      setAncien("");
      setNouveau("");
      setConfirmation("");
      window.dispatchEvent(new Event("eco:session"));
      proprietes.onChange();
    });
  };

  return (
    <section className="ui-carte-etapes" style={{ padding: ESPACEMENT.e3 }}>
      <h2 style={{ margin: 0, fontSize: TAILLE_TEXTE.md, display: "flex", alignItems: "center", gap: 8 }}>
        <Icone icone={KeyRound} taille={20} />
        {proprietes.temporaire ? "Choisissez votre mot de passe" : "Changer de mot de passe"}
      </h2>
      <p style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-texte-attenue)" }}>
        {proprietes.temporaire
          ? "Votre compte a été créé par un administrateur. Remplacez le mot de passe temporaire qu'il vous a remis avant de continuer."
          : "Huit caractères minimum. L'ancien mot de passe est exigé."}
      </p>

      {reussi ? (
        <p role="status" style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-succes)" }}>
          Mot de passe enregistré. Vous pouvez maintenant travailler normalement.
        </p>
      ) : null}

      <div className="ui-grille-formulaire">
        <ChampTexte
          id="mot-de-passe-ancien"
          libelle="Mot de passe actuel"
          valeur={ancien}
          onChange={setAncien}
          secret
          requis
          autoComplete="current-password"
        />
        <ChampTexte
          id="mot-de-passe-nouveau"
          libelle="Nouveau mot de passe"
          valeur={nouveau}
          onChange={setNouveau}
          secret
          requis
          aide="8 caractères minimum."
          autoComplete="new-password"
        />
        <ChampTexte
          id="mot-de-passe-confirmation"
          libelle="Confirmer le nouveau mot de passe"
          valeur={confirmation}
          onChange={setConfirmation}
          secret
          requis
          erreur={confirmation.length > 0 && confirmation !== nouveau ? "La saisie diffère du nouveau mot de passe." : null}
          autoComplete="new-password"
        />
      </div>

      {erreur ? (
        <p role="alert" style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-erreur)" }}>
          {erreur.message}
        </p>
      ) : null}

      <button type="button" className="ui-bouton ui-bouton--primaire" onClick={envoyer} disabled={envoi}>
        {envoi ? "Enregistrement…" : "Enregistrer le mot de passe"}
      </button>
    </section>
  );
}
