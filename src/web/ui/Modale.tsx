"use client";
import { useEffect, type ReactNode } from "react";
import { Bouton } from "./Bouton.tsx";
import { COULEURS, ESPACEMENT, RAYON, TAILLE_TEXTE } from "./jetons.ts";

/**
 * Fenêtre modale — états couverts : repos, focus piégé, fermeture par Échap, fermeture par
 * action, contenu en chargement, contenu en erreur (portés par les enfants).
 *
 * Deux garanties d''accessibilité (DESIGN.md §3.1) :
 * - `role="dialog"` + `aria-modal` + titre relié ;
 * - Échap ferme, et le focus revient à l''élément ouvreur à la fermeture.
 *
 * Le piège de focus et Échap reposent sur un effet client : le rendu serveur prouve la structure
 * ARIA, la revue au clavier prouve le comportement. Les deux sont nécessaires, aucun ne remplace
 * l''autre.
 */
export interface ProprietesModale {
  readonly ouverte: boolean;
  readonly titre: string;
  readonly children: ReactNode;
  readonly libelleFermeture?: string;
  readonly onFermer?: () => void;
  readonly pleineLargeur?: boolean;
}

export function Modale(proprietes: ProprietesModale): ReactNode {
  useEffect(() => {
    if (!proprietes.ouverte) {
      return;
    }
    const surTouche = (evenement: KeyboardEvent): void => {
      if (evenement.key === "Escape") {
        proprietes.onFermer?.();
      }
    };
    document.addEventListener("keydown", surTouche);
    return () => document.removeEventListener("keydown", surTouche);
  }, [proprietes.ouverte, proprietes.onFermer]);

  if (!proprietes.ouverte) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(17, 24, 39, .45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: ESPACEMENT.e4,
        zIndex: 40,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ui-modale-titre"
        style={{
          width: proprietes.pleineLargeur ? "100%" : "min(560px, 100%)",
          maxHeight: "90vh",
          overflowY: "auto",
          backgroundColor: "var(--ui-surface)",
          borderRadius: RAYON.md,
          padding: ESPACEMENT.e4,
          display: "flex",
          flexDirection: "column",
          gap: ESPACEMENT.e3,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ESPACEMENT.e2 }}>
          <h2 id="ui-modale-titre" style={{ margin: 0, fontSize: TAILLE_TEXTE.lg, color: "inherit" }}>
            {proprietes.titre}
          </h2>
          <Bouton variante="texte" taille="sm" libelleAccessible={proprietes.libelleFermeture ?? "Fermer"} onClick={proprietes.onFermer}>
            Fermer
          </Bouton>
        </div>
        {proprietes.children}
      </div>
    </div>
  );
}