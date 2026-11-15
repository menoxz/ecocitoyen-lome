import type { ReactNode } from "react";
import { BadgePriorite } from "./BadgePriorite.tsx";
import { BadgeStatut } from "./BadgeStatut.tsx";
import { CLASSES, COULEURS, ESPACEMENT, RAYON, TAILLE_TEXTE, type ClePriorite, type CleStatut } from "./jetons.ts";

/**
 * Carte d'un signalement — états couverts : repos, survol, focus clavier, actif, chargement,
 * sans photo, avec photo. Aucun état vide : c''est la liste qui gère le vide (`EtatVide`).
 *
 * Ordre de lecture imposé (DESIGN.md §3.1) : photo, statut, priorité, description, quartier,
 * âge relatif. L''identité de l''auteur n''apparaît jamais ici (RG28) : la projection serveur
 * ne l''envoie pas.
 *
 * `maintenantIso` est fourni par l''appelant : l''âge relatif est calculé, pas déduit d''une
 * horloge implicite, sinon le rendu n''est pas testable.
 */
export interface ProprietesCarteSignalement {
  readonly id: string;
  readonly statut: CleStatut | string;
  readonly priorite: ClePriorite | string;
  readonly scorePriorite?: number | null;
  readonly description: string;
  readonly quartier: string;
  readonly dateSignalement: string;
  readonly maintenantIso: string;
  readonly nbConfirmations: number;
  readonly photoUrl?: string | null;
  readonly sansPhoto?: boolean;
  readonly enChargement?: boolean;
  readonly selectionnee?: boolean;
  readonly onOuvrir?: (id: string) => void;
}

/** Âge lisible : « à l'instant », « il y a 3 h », « hier », « il y a 5 j ». */
export function ageRelatif(dateIso: string, maintenantIso: string): string {
  const ecart = Date.parse(maintenantIso) - Date.parse(dateIso);
  if (!Number.isFinite(ecart) || ecart < 0) {
    return "date inconnue";
  }
  const heures = Math.floor(ecart / 3_600_000);
  if (heures < 1) return "à l'instant";
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.floor(heures / 24);
  return jours === 1 ? "hier" : `il y a ${jours} j`;
}

export function CarteSignalement(proprietes: ProprietesCarteSignalement): ReactNode {
  const age = ageRelatif(proprietes.dateSignalement, proprietes.maintenantIso);
  const descriptionCourte =
    proprietes.description.length > 140 ? `${proprietes.description.slice(0, 137)}…` : proprietes.description;

  return (
    <article
      className={[CLASSES.carte, CLASSES.focusable].join(" ")}
      data-id={proprietes.id}
      data-selectionnee={proprietes.selectionnee === true ? "true" : undefined}
      aria-busy={proprietes.enChargement === true ? "true" : undefined}
      tabIndex={0}
      onClick={() => proprietes.onOuvrir?.(proprietes.id)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: ESPACEMENT.e2,
        padding: ESPACEMENT.e3,
        border: `1px solid ${proprietes.selectionnee ? COULEURS.primaire : COULEURS.bordure}`,
        borderRadius: RAYON.md,
        backgroundColor: COULEURS.surface,
        cursor: "pointer",
      }}
    >
      {proprietes.photoUrl ? (
        <img
          src={proprietes.photoUrl}
          alt=""
          width={320}
          height={180}
          style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: RAYON.sm }}
        />
      ) : (
        <p
          style={{
            margin: 0,
            fontSize: TAILLE_TEXTE.xs,
            color: COULEURS.texteAttenue,
            padding: `${ESPACEMENT.e2}px 0`,
          }}
        >
          {proprietes.sansPhoto === true ? "Signalement déclaré sans photo (mode dégradé)" : "Aucune photo"}
        </p>
      )}

      <div style={{ display: "flex", gap: ESPACEMENT.e2, flexWrap: "wrap" }}>
        <BadgeStatut statut={proprietes.statut} />
        <BadgePriorite priorite={proprietes.priorite} score={proprietes.scorePriorite ?? null} />
      </div>

      <p style={{ margin: 0, fontSize: TAILLE_TEXTE.md, color: COULEURS.texte }}>{descriptionCourte}</p>

      <p style={{ margin: 0, fontSize: TAILLE_TEXTE.xs, color: COULEURS.texteAttenue }}>
        {proprietes.quartier} · {age}
        {proprietes.nbConfirmations > 0 ? ` · ${proprietes.nbConfirmations} confirmation(s)` : ""}
        {proprietes.enChargement === true ? " · chargement…" : ""}
      </p>
    </article>
  );
}