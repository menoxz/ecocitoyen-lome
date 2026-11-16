import { useEffect, useState, type ReactNode } from "react";
import { LogOut } from "lucide-react";
import type { ClientApi } from "../api/client.ts";
import { Icone } from "./Icone.tsx";

/**
 * Identité affichée et sortie de session.
 *
 * Les deux manquaient, et le défaut était le même : l'état de session n'était lu qu'au montage.
 * Après une connexion faite sur l'écran courant, l'en-tête ne changeait pas — un agent ne savait
 * donc ni sous quel compte il travaillait, ni comment sortir. Le composant se remet à jour sur
 * l'événement `eco:session`, émis par les formulaires de connexion et de mot de passe.
 *
 * Rien n'est rendu tant qu'aucune session n'existe : un bouton « Se déconnecter » pour un visiteur
 * anonyme promettrait une action sans effet.
 */
export interface ProprietesBoutonDeconnexion {
  readonly client?: ClientApi;
  /** Variante posée dans le panneau burger, où les entrées occupent toute la largeur. */
  readonly pleineLargeur?: boolean;
}

export function BoutonDeconnexion(proprietes: ProprietesBoutonDeconnexion): ReactNode {
  const [identite, setIdentite] = useState<string | null>(null);
  const { client } = proprietes;

  useEffect(() => {
    if (!client) {
      return;
    }
    let actif = true;

    const relire = (): void => {
      void client.moi().then((resultat) => {
        if (!actif || !resultat.ok) {
          return;
        }
        const compte = resultat.valeur.compte;
        if (!compte) {
          setIdentite(null);
          return;
        }
        const nom = `${compte.prenom ?? ""} ${compte.nom ?? ""}`.trim();
        setIdentite(nom.length > 0 ? nom : compte.email);
      });
    };

    relire();
    window.addEventListener("eco:session", relire);
    return () => {
      actif = false;
      window.removeEventListener("eco:session", relire);
    };
  }, [client]);

  if (!client || identite === null) {
    return null;
  }

  const sortir = (): void => {
    void client.deconnexion().then(() => {
      window.location.hash = "#/";
      window.location.reload();
    });
  };

  const classe = proprietes.pleineLargeur === true ? "ui-deconnexion ui-deconnexion--pleine" : "ui-deconnexion";

  return (
    <div className={proprietes.pleineLargeur === true ? "ui-session-identite ui-session-identite--pleine" : "ui-session-identite"}>
      <span className="ui-session-nom" title="Compte connecté sur cet appareil">
        {identite}
      </span>
      <button type="button" className={classe} onClick={sortir}>
        <Icone icone={LogOut} taille={18} />
        <span>Se déconnecter</span>
      </button>
    </div>
  );
}
