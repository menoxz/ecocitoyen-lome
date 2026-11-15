import type { ReactNode } from "react";
import { CLASSES, COULEURS, RAYON, TAILLE_TEXTE } from "./jetons.ts";

/**
 * Zone de texte comptée — états couverts : repos, focus, désactivé, erreur, compteur hors bornes.
 *
 * Le compteur (10 à 500 caractères, §4.2) est affiché en permanence mais **ne bloque jamais la
 * saisie** : on n'empêche pas quelqu'un de décrire son problème. Le refus vient du serveur, avec
 * son code, et s'affiche sous le champ.
 */
export interface ProprietesChampZoneTexte {
  readonly id: string;
  readonly libelle: string;
  readonly valeur: string;
  readonly onChange: (valeur: string) => void;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly aide?: string;
  readonly erreur?: string | null;
  readonly requis?: boolean;
  readonly desactive?: boolean;
  readonly lignes?: number;
}

export const DESCRIPTION_MIN = 10;
export const DESCRIPTION_MAX = 500;

export function ChampZoneTexte(proprietes: ProprietesChampZoneTexte): ReactNode {
  const minimum = proprietes.minimum ?? DESCRIPTION_MIN;
  const maximum = proprietes.maximum ?? DESCRIPTION_MAX;
  const longueur = proprietes.valeur.trim().length;
  const enErreur = typeof proprietes.erreur === "string" && proprietes.erreur.length > 0;
  const horsBornes = longueur > 0 && (longueur < minimum || longueur > maximum);
  const idCompteur = `${proprietes.id}-compteur`;
  const idAide = `${proprietes.id}-aide`;
  const idErreur = `${proprietes.id}-erreur`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={proprietes.id} style={{ fontSize: TAILLE_TEXTE.sm, fontWeight: 600, color: "inherit" }}>
        {proprietes.libelle}
        {proprietes.requis ? <span aria-hidden="true"> *</span> : null}
      </label>

      <textarea
        id={proprietes.id}
        className={[CLASSES.champ, CLASSES.focusable, enErreur ? CLASSES.champErreur : ""].filter(Boolean).join(" ")}
        value={proprietes.valeur}
        onChange={(evenement) => proprietes.onChange(evenement.currentTarget.value)}
        rows={proprietes.lignes ?? 4}
        maxLength={maximum}
        disabled={proprietes.desactive === true}
        aria-invalid={enErreur ? "true" : undefined}
        aria-describedby={[idCompteur, enErreur ? idErreur : proprietes.aide ? idAide : ""].filter(Boolean).join(" ")}
        style={{
          color: "inherit",
          backgroundColor: proprietes.desactive ? COULEURS.surfaceAlt : COULEURS.surface,
          borderColor: enErreur ? COULEURS.erreur : COULEURS.bordure,
          borderRadius: RAYON.md,
          fontFamily: "inherit",
          fontSize: TAILLE_TEXTE.md,
          padding: 12,
          resize: "vertical",
        }}
      />

      <p
        id={idCompteur}
        style={{
          margin: 0,
          fontSize: TAILLE_TEXTE.xs,
          color: horsBornes ? COULEURS.alerte : COULEURS.texteAttenue,
        }}
      >
        {longueur}/{maximum} caractères{longueur > 0 && longueur < minimum ? ` (${minimum} minimum)` : ""}
      </p>

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