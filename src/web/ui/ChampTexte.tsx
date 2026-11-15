import type { ReactNode } from "react";
import { CLASSES, COULEURS, TAILLE_TEXTE } from "./jetons.ts";

/**
 * Champ texte — états couverts : repos, survol, focus clavier, désactivé, erreur.
 *
 * Le libellé est au-dessus, jamais en `placeholder` : un exemple disparaît à la saisie, un
 * libellé non. L''erreur remplace l''aide et est reliée par `aria-describedby` (lecteur d'écran).
 */
export interface ProprietesChampTexte {
  readonly id: string;
  readonly libelle: string;
  readonly valeur: string;
  readonly onChange: (valeur: string) => void;
  readonly type?: "text" | "email" | "tel" | "search";
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={proprietes.id} style={{ fontSize: TAILLE_TEXTE.sm, fontWeight: 600, color: COULEURS.texte }}>
        {proprietes.libelle}
        {proprietes.requis ? <span aria-hidden="true"> *</span> : null}
      </label>

      <input
        id={proprietes.id}
        className={[CLASSES.champ, CLASSES.focusable, enErreur ? CLASSES.champErreur : ""].filter(Boolean).join(" ")}
        type={proprietes.type ?? "text"}
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

      {enErreur ? (
        <p id={idErreur} role="alert" style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: COULEURS.erreur }}>
          {proprietes.erreur}
        </p>
      ) : proprietes.aide ? (
        <p id={idAide} style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: COULEURS.texteAttenue }}>
          {proprietes.aide}
        </p>
      ) : null}
    </div>
  );
}