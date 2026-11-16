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
 * invité ne doit pas garder le secret que l'administrateur connaît. L'ancien est demandé, et le
 * serveur le vérifie — l'interface ne fait que transmettre. Les deux champs sont `secret`, donc
 * rendus en `password` avec la bascule afficher/masquer du composant.
 */
export interface ProprietesFormulaireMotDePasse {
  readonly client: ClientApi;
  readonly temporaire: boolean;
  readonly onChange: () => void;
}

export function FormulaireMotDePasse(proprietes: ProprietesFormulaireMotDePasse): ReactNode {
  const [ancien, setAncien] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [erreur, setErreur] = useState<ErreurApi | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const envoyer = (): void => {
    setEnvoi(true);
    setErreur(null);
    void proprietes.client.changerMotDePasse({ ancien, nouveau }).then((resultat) => {
      setEnvoi(false);
      if (!resultat.ok) {
        setErreur(resultat.erreur);
        return;
      }
      setAncien("");
      setNouveau("");
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
