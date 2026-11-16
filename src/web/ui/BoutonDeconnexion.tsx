import { useEffect, useState, type ReactNode } from "react";
import { LogOut } from "lucide-react";
import type { ClientApi } from "../api/client.ts";
import { Icone } from "./Icone.tsx";

/**
 * Sortie de session.
 *
 * Le bouton n'apparaît que si une session existe : l'afficher à un visiteur non connecté
 * promettrait une action sans effet. L'état vient de `/auth/moi`, la même source que les écrans
 * protégés, donc il ne peut pas mentir sur qui est connecté. Après déconnexion, la page repart de
 * l'accueil : rester sur un écran d'administration avec une session fermée n'afficherait que des
 * refus.
 */
export interface ProprietesBoutonDeconnexion {
  readonly client?: ClientApi;
  /** Variante posée dans le panneau burger, où les entrées occupent toute la largeur. */
  readonly pleineLargeur?: boolean;
}

export function BoutonDeconnexion(proprietes: ProprietesBoutonDeconnexion): ReactNode {
  const [connecte, setConnecte] = useState(false);
  const { client } = proprietes;

  useEffect(() => {
    if (!client) {
      return;
    }
    let actif = true;
    void client.moi().then((resultat) => {
      if (actif && resultat.ok) {
        setConnecte(resultat.valeur.compte !== null);
      }
    });
    return () => {
      actif = false;
    };
  }, [client]);

  if (!client || !connecte) {
    return null;
  }

  const sortir = (): void => {
    void client.deconnexion().then(() => {
      window.location.hash = "#/";
      window.location.reload();
    });
  };

  return (
    <button
      type="button"
      className={proprietes.pleineLargeur === true ? "ui-deconnexion ui-deconnexion--pleine" : "ui-deconnexion"}
      onClick={sortir}
    >
      <Icone icone={LogOut} taille={18} />
      <span>Se déconnecter</span>
    </button>
  );
}
