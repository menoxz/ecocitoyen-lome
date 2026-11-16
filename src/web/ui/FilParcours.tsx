import type { ReactNode } from "react";
import { ESPACEMENT, TAILLE_TEXTE } from "./jetons.ts";

/**
 * Fil de parcours — états couverts : étape faite, étape courante, étape à venir.
 *
 * Trois étapes nommées au maximum : au-delà, le parcours'est trop long (PARCOURS.md §3 exige
 * trois écrans pour signaler). L''étape courante porte `aria-current="step"` : un lecteur d''écran
 * sait où il en est sans voir la couleur.
 */
export interface EtapeParcours {
  readonly cle: string;
  readonly libelle: string;
}

export interface ProprietesFilParcours {
  readonly etapes: readonly EtapeParcours[];
  readonly courante: string;
  /** Étapes déjà validées ; déduites de l''ordre si absent. */
  readonly faites?: readonly string[];
}

export function FilParcours(proprietes: ProprietesFilParcours): ReactNode {
  const indexCourant = proprietes.etapes.findIndex((etape) => etape.cle === proprietes.courante);
  const estFaite = (cle: string, index: number): boolean =>
    proprietes.faites ? proprietes.faites.includes(cle) : index < indexCourant;

  return (
    <ol
      aria-label="Étapes du signalement"
      style={{ display: "flex", gap: ESPACEMENT.e2, margin: 0, padding: 0, listStyle: "none", flexWrap: "wrap" }}
    >
      {proprietes.etapes.map((etape, index) => {
        const courante = etape.cle === proprietes.courante;
        const faite = estFaite(etape.cle, index);
        return (
          <li
            key={etape.cle}
            aria-current={courante ? "step" : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: ESPACEMENT.e1,
              fontSize: TAILLE_TEXTE.sm,
              fontWeight: courante ? 700 : 500,
              color: courante ? "var(--ui-texte)" : "var(--ui-texte-attenue)",
            }}
          >
            <span
              aria-hidden="true"
              data-etat={courante ? "courante" : faite ? "faite" : "a_venir"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 24,
                borderRadius: 9999,
                fontSize: TAILLE_TEXTE.xs,
                fontWeight: 700,
                /* Le numéro reste lisible sur le vert : la couleur seule ne porte pas l'état. */
                color: courante || faite ? "var(--ui-sur-primaire)" : "var(--ui-texte-attenue)",
                backgroundColor: courante ? "var(--ui-primaire)" : faite ? "var(--ui-succes)" : "var(--ui-surface-douce)",
                border: `1px solid ${courante ? "var(--ui-primaire)" : faite ? "var(--ui-succes)" : "var(--ui-bordure)"}`,
              }}
            >
              {index + 1}
            </span>
            <span>{etape.libelle}</span>
            {index < proprietes.etapes.length - 1 ? <span aria-hidden="true">›</span> : null}
          </li>
        );
      })}
    </ol>
  );
}