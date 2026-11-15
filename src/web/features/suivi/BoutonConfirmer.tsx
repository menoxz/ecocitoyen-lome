import { useState, type ReactNode } from "react";
import { Bouton } from "../../ui/Bouton.tsx";
import { ESPACEMENT, TAILLE_TEXTE } from "../../ui/jetons.ts";
import type { ClientApi, ErreurApi } from "../../api/client.ts";

/**
 * « Moi aussi » (RG05).
 *
 * Le compteur affiché est celui que le serveur renvoie après l'écriture : un incrément local
 * mentirait si le refus arrivait (déjà confirmé, dossier propre, dossier clos). Tous les refus
 * viennent donc du serveur et s'affichent avec son message.
 */
export interface ProprietesBoutonConfirmer {
  readonly client: ClientApi;
  readonly idSignalement: string;
  readonly nbConfirmations: number;
  readonly statut: string;
}

export function BoutonConfirmer(proprietes: ProprietesBoutonConfirmer): ReactNode {
  const [compte, setCompte] = useState(proprietes.nbConfirmations);
  const [confirme, setConfirme] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<ErreurApi | null>(null);

  const clos = proprietes.statut === "RESOLU" || proprietes.statut === "REJETE";

  const confirmer = async (): Promise<void> => {
    setEnCours(true);
    setErreur(null);
    const resultat = await proprietes.client.confirmer(proprietes.idSignalement);
    setEnCours(false);
    if (!resultat.ok) {
      setErreur(resultat.erreur);
      return;
    }
    setCompte(resultat.valeur.nb_confirmations);
    setConfirme(true);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e2 }}>
      <p style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-texte-attenue)" }}>
        {compte === 0
          ? "Personne n'a encore confirmé ce problème."
          : `${compte} personne(s) ont confirmé ce problème.`}
      </p>

      {confirme ? (
        <p role="status" style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-succes)" }}>
          Merci, votre confirmation est enregistrée.
        </p>
      ) : clos ? (
        <p style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-texte-attenue)" }}>
          Ce dossier est clos : il n'est plus corroborable.
        </p>
      ) : (
        <Bouton variante="secondaire" enChargement={enCours} onClick={() => void confirmer()}>
          Moi aussi, je constate ce problème
        </Bouton>
      )}

      {erreur ? (
        <p role="alert" style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-erreur)" }}>
          {erreur.message}
        </p>
      ) : null}
    </div>
  );
}
