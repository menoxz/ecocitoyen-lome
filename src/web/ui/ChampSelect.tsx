import type { ReactNode } from "react";
import { CLASSES, COULEURS, RAYON, TAILLE_TEXTE } from "./jetons.ts";

/**
 * Liste déroulante — états couverts : repos, survol, focus clavier, actif, désactivé,
 * erreur, vide (aucune option disponible).
 *
 * Une option vide « Sélectionner… » est présente mais non validable : sans elle, un navigateur
 * présélectionne la première valeur et l''utilisateur envoie une catégorie qu''il n''a pas choisie.
 */
export interface OptionSelect {
  readonly valeur: string;
  readonly libelle: string;
}

export interface ProprietesChampSelect {
  readonly id: string;
  readonly libelle: string;
  readonly valeur: string;
  readonly options: readonly OptionSelect[];
  readonly onChange: (valeur: string) => void;
  readonly texteVide?: string;
  readonly aide?: string;
  readonly erreur?: string | null;
  readonly requis?: boolean;
  readonly desactive?: boolean;
}

export function ChampSelect(proprietes: ProprietesChampSelect): ReactNode {
  const idAide = `${proprietes.id}-aide`;
  const idErreur = `${proprietes.id}-erreur`;
  const enErreur = typeof proprietes.erreur === "string" && proprietes.erreur.length > 0;
  const sansOption = proprietes.options.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={proprietes.id} style={{ fontSize: TAILLE_TEXTE.sm, fontWeight: 600, color: "inherit" }}>
        {proprietes.libelle}
        {proprietes.requis ? <span aria-hidden="true"> *</span> : null}
      </label>

      <select
        id={proprietes.id}
        className={[CLASSES.champ, CLASSES.focusable, enErreur ? CLASSES.champErreur : ""].filter(Boolean).join(" ")}
        value={proprietes.valeur}
        onChange={(evenement) => proprietes.onChange(evenement.currentTarget.value)}
        disabled={proprietes.desactive === true || sansOption}
        required={proprietes.requis === true}
        aria-invalid={enErreur ? "true" : undefined}
        aria-describedby={enErreur ? idErreur : proprietes.aide ? idAide : undefined}
        style={{
          color: "inherit",
          backgroundColor: proprietes.desactive || sansOption ? COULEURS.surfaceAlt : COULEURS.surface,
          borderColor: enErreur ? COULEURS.erreur : COULEURS.bordure,
          borderRadius: RAYON.md,
        }}
      >
        <option value="">{sansOption ? "Aucune option disponible" : (proprietes.texteVide ?? "Sélectionner…")}</option>
        {proprietes.options.map((option) => (
          <option key={option.valeur} value={option.valeur}>
            {option.libelle}
          </option>
        ))}
      </select>

      {enErreur ? (
        <p id={idErreur} role="alert" style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-erreur)" }}>
          {proprietes.erreur}
        </p>
      ) : proprietes.aide ? (
        <p id={idAide} style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-texte-attenue)" }}>
          {proprietes.aide}
        </p>
      ) : null}
    </div>
  );
}