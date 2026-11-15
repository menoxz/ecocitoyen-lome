import type { ReactNode } from "react";
import { Bouton } from "../../ui/Bouton.tsx";
import { COULEURS, ESPACEMENT, TAILLE_TEXTE } from "../../ui/jetons.ts";

/**
 * Reçu de signalement (quatrième vue du parcours 1).
 *
 * Extrait dans son propre composant pour être vérifiable isolément : un accusé de réception qui
 * n'affiche pas le numéro de dossier ne sert à rien, et cela ne se voit pas en relisant le code
 * de l'assistant.
 *
 * Aucune promesse de délai n'est écrite : le délai dépend de la priorité calculée par le serveur,
 * et une promesse en dur serait un engagement non tenu.
 */
export interface ProprietesRecuSignalement {
  readonly idSignalement: string;
  readonly statut: string;
  readonly dateSignalement?: string;
  readonly onOuvrirDossier?: (idSignalement: string) => void;
  readonly onTerminer?: () => void;
}

export function RecuSignalement(proprietes: ProprietesRecuSignalement): ReactNode {
  return (
    <section
      role="status"
      style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3, padding: ESPACEMENT.e4 }}
    >
      <h1 style={{ margin: 0, fontSize: TAILLE_TEXTE.xl, color: "inherit" }}>Signalement enregistré</h1>

      <p style={{ margin: 0, fontSize: TAILLE_TEXTE.md, color: "inherit" }}>
        Numéro de dossier : <strong>{proprietes.idSignalement}</strong>
      </p>

      <p style={{ margin: 0, fontSize: TAILLE_TEXTE.md, color: "var(--ui-texte-attenue)" }}>
        Statut actuel : {proprietes.statut}. Vous serez notifié à chaque décision du service.
      </p>

      {proprietes.dateSignalement ? (
        <p style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-texte-attenue)" }}>
          Enregistré le {proprietes.dateSignalement}.
        </p>
      ) : null}

      <div style={{ display: "flex", gap: ESPACEMENT.e2, flexWrap: "wrap" }}>
        {proprietes.onOuvrirDossier ? (
          <Bouton variante="primaire" onClick={() => proprietes.onOuvrirDossier?.(proprietes.idSignalement)}>
            Suivre ce signalement
          </Bouton>
        ) : null}
        {proprietes.onTerminer ? (
          <Bouton variante="texte" onClick={proprietes.onTerminer}>
            Retour à l accueil
          </Bouton>
        ) : null}
      </div>
    </section>
  );
}