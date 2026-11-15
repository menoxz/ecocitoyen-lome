import { useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { CLASSES } from "./jetons.ts";
import { Icone } from "./Icone.tsx";

/**
 * Champ texte — états couverts : repos, survol, focus clavier, désactivé, erreur, secret révélé.
 *
 * Le libellé est au-dessus, jamais en `placeholder` : un exemple disparaît à la saisie, un
 * libellé non. L'erreur remplace l'aide et est reliée par `aria-describedby` (lecteur d'écran).
 *
 * Un champ `secret` est rendu en `type="password"` — donc masqué par défaut, masqué pour de vrai —
 * avec une bascule explicite pour le relire. Le forçage en `text` était un défaut mesuré : le mot
 * de passe s'affichait en clair sur l'écran de connexion.
 *
 * La marque de champ obligatoire porte la classe `ui-requis` : elle prend la couleur d'alerte du
 * thème au lieu de rester un astérisque noir, et suit le mode sombre.
 */
export interface ProprietesChampTexte {
  readonly id: string;
  readonly libelle: string;
  readonly valeur: string;
  readonly onChange: (valeur: string) => void;
  readonly type?: "text" | "email" | "tel" | "search";
  /** Rendu en `password`, avec bascule afficher/masquer. */
  readonly secret?: boolean;
  readonly aide?: string;
  readonly erreur?: string | null;
  readonly requis?: boolean;
  readonly desactive?: boolean;
  readonly maxLength?: number;
  readonly autoComplete?: string;
  readonly exemple?: string;
}

export function ChampTexte(proprietes: ProprietesChampTexte): ReactNode {
  const idAide = `${proprietes.id}-aide`;
  const idErreur = `${proprietes.id}-erreur`;
  const enErreur = typeof proprietes.erreur === "string" && proprietes.erreur.length > 0;
  const [revele, setRevele] = useState(false);

  const type = proprietes.secret === true ? (revele ? "text" : "password") : (proprietes.type ?? "text");

  const champ = (
    <input
      id={proprietes.id}
      className={[
        CLASSES.champ,
        CLASSES.focusable,
        enErreur ? CLASSES.champErreur : "",
        proprietes.secret === true ? "ui-champ--avec-bouton" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      type={type}
      value={proprietes.valeur}
      onChange={(evenement) => proprietes.onChange(evenement.currentTarget.value)}
      disabled={proprietes.desactive === true}
      required={proprietes.requis === true}
      maxLength={proprietes.maxLength}
      autoComplete={proprietes.autoComplete}
      placeholder={proprietes.exemple}
      aria-invalid={enErreur ? "true" : undefined}
      aria-describedby={enErreur ? idErreur : proprietes.aide ? idAide : undefined}
    />
  );

  return (
    <div className="ui-champ-groupe">
      <label htmlFor={proprietes.id} className="ui-champ-libelle">
        {proprietes.libelle}
        {proprietes.requis ? (
          <span aria-hidden="true" className="ui-requis">
            {" "}
            *
          </span>
        ) : null}
      </label>

      {proprietes.secret === true ? (
        <div className="ui-champ-secret">
          {champ}
          <button
            type="button"
            className="ui-bouton-oeil"
            aria-label={revele ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            aria-pressed={revele}
            onClick={() => setRevele(!revele)}
          >
            <Icone icone={revele ? EyeOff : Eye} taille={18} />
          </button>
        </div>
      ) : (
        champ
      )}

      {enErreur ? (
        <p id={idErreur} role="alert" className="ui-champ-message ui-champ-message--erreur">
          {proprietes.erreur}
        </p>
      ) : proprietes.aide ? (
        <p id={idAide} className="ui-champ-message">
          {proprietes.aide}
        </p>
      ) : null}
    </div>
  );
}
