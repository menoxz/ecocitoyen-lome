import { useState, type ReactNode } from "react";
import { Bouton } from "../../ui/Bouton.tsx";
import { ChampTexte } from "../../ui/ChampTexte.tsx";
import { EtatErreur } from "../../ui/EtatErreur.tsx";
import { ESPACEMENT, TAILLE_TEXTE } from "../../ui/jetons.ts";
import type { ClientApi } from "../../api/client.ts";

/**
 * Entrée dans le parcours : identification obligatoire.
 *
 * Constaté au navigateur : sans session, le parcours laissait saisir trois étapes puis refusait
 * l'envoi par « Une session valide est requise ». Une identification demandée **avant** la saisie
 * évite de perdre le travail de l'usager ; elle est aussi la condition pour le notifier ensuite.
 *
 * Deux modes, un seul formulaire : connexion (2 champs) et création de compte (3 champs + consentement).
 * Le consentement n'est pas une case décorative : il conditionne l'inscription côté serveur (RG27).
 */
export interface ProprietesFormulaireSession {
  readonly client: ClientApi;
  readonly onSession: (compte: { readonly id_utilisateur: string }) => void;
  /**
   * Ce que la session permet de faire. Un agent qui ouvre sa file de tri lisait « Se connecter
   * pour signaler » : le titre doit dire l'action de l'écran, pas celle du parcours citoyen.
   */
  readonly titre?: string;
  readonly explication?: string;
}

export function FormulaireSession(proprietes: ProprietesFormulaireSession): ReactNode {
  const [mode, setMode] = useState<"connexion" | "inscription">("connexion");
  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [prenom, setPrenom] = useState("");
  const [consentement, setConsentement] = useState(false);
  const [erreur, setErreur] = useState<{ message: string; code?: string } | null>(null);
  const [enCours, setEnCours] = useState(false);

  const valider = async (): Promise<void> => {
    setErreur(null);
    if (identifiant.trim().length === 0 || motDePasse.length === 0) {
      setErreur({ message: "Renseignez votre adresse e-mail et votre mot de passe.", code: "CHAMP_MANQUANT" });
      return;
    }
    if (mode === "inscription" && !consentement) {
      setErreur({ message: "Votre accord est nécessaire pour créer le compte.", code: "CONSENTEMENT_REQUIS" });
      return;
    }

    setEnCours(true);
    try {
      const resultat =
        mode === "connexion"
          ? await proprietes.client.connexion(identifiant.trim(), motDePasse)
          : await proprietes.client.inscription({
              nom: prenom.trim().length > 0 ? prenom.trim() : "Citoyen",
              prenom: prenom.trim().length > 0 ? prenom.trim() : "Citoyen",
              email: identifiant.trim(),
              motDePasse,
            });

      if (!resultat.ok) {
        setErreur(resultat.erreur);
        return;
      }
      proprietes.onSession({ id_utilisateur: resultat.valeur.compte.id_utilisateur });
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className="ui-session">
      <section className="ui-session-carte">
        <div style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e2 }}>
          <h2 className="ui-session-titre">
            {mode === "inscription"
              ? "Créer un compte citoyen"
              : (proprietes.titre ?? "Se connecter pour signaler")}
          </h2>
          <p className="ui-session-detail">
            {proprietes.explication ?? "Votre compte sert à vous notifier chaque décision du service. Aucune donnée n'est publiée."}
          </p>
        </div>

      <ChampTexte
        id="identifiant"
        libelle="Adresse e-mail"
        type="email"
        valeur={identifiant}
        onChange={setIdentifiant}
        autoComplete="email"
        requis
      />

      {mode === "inscription" ? (
        <ChampTexte
          id="prenom"
          libelle="Prénom"
          valeur={prenom}
          onChange={setPrenom}
          autoComplete="given-name"
          aide="Utilisé par le service pour vous répondre."
        />
      ) : null}

      <ChampTexte
        id="mot-de-passe"
        libelle="Mot de passe"
        secret
        valeur={motDePasse}
        onChange={setMotDePasse}
        autoComplete={mode === "connexion" ? "current-password" : "new-password"}
        aide={mode === "inscription" ? "8 caractères minimum." : undefined}
        requis
      />

      {mode === "inscription" ? (
        <label style={{ display: "flex", gap: ESPACEMENT.e2, fontSize: TAILLE_TEXTE.sm, color: "inherit" }}>
          <input
            type="checkbox"
            checked={consentement}
            onChange={(evenement) => setConsentement(evenement.currentTarget.checked)}
            style={{ width: 20, height: 20 }}
          />
          <span>J'accepte que ma position et mes photos soient utilisées pour traiter mon signalement.</span>
        </label>
      ) : null}

      {erreur ? <EtatErreur message={erreur.message} code={erreur.code} /> : null}

      <div className="ui-session-actions">
        <Bouton variante="primaire" pleineLargeur enChargement={enCours} onClick={() => void valider()}>
          {mode === "connexion" ? "Se connecter" : "Créer mon compte"}
        </Bouton>
        <Bouton
          variante="texte"
          pleineLargeur
          onClick={() => setMode(mode === "connexion" ? "inscription" : "connexion")}
        >
          {mode === "connexion" ? "Je n ai pas de compte" : "J ai déjà un compte"}
        </Bouton>
      </div>
      </section>
    </div>
  );
}