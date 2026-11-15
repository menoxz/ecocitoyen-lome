import { useState, type ReactNode } from "react";
import { Bouton } from "../../ui/Bouton.tsx";
import { ChampSelect } from "../../ui/ChampSelect.tsx";
import { ChampZoneTexte } from "../../ui/ChampZoneTexte.tsx";
import { COULEURS, ESPACEMENT, TAILLE_TEXTE } from "../../ui/jetons.ts";
import type { SignalementApi } from "../../api/client.ts";
import { libellePriorite, peutRejeter, peutValider } from "./logique.ts";

/**
 * Les deux décisions du superviseur, dans un seul formulaire.
 *
 * Valider engage une priorité (l'arbitrage est son travail, pas un héritage du citoyen) ; rejeter
 * exige un motif, sans quoi le citoyen ne saurait pas quoi corriger. Les valeurs proposées
 * viennent du serveur : l'écran n'invente ni priorité ni motif.
 */
export interface ProprietesFormulaireDecision {
  readonly dossier: SignalementApi;
  readonly priorites: readonly string[];
  readonly motifs: readonly string[];
  readonly enCours: boolean;
  readonly onValider: (priorite: string, commentaire: string) => void;
  readonly onRejeter: (motif: string, commentaire: string) => void;
}

export function FormulaireDecision(proprietes: ProprietesFormulaireDecision): ReactNode {
  const [priorite, setPriorite] = useState(proprietes.dossier.niveau_priorite);
  const [motif, setMotif] = useState("");
  const [commentaire, setCommentaire] = useState("");

  const validation = peutValider(priorite);
  const rejet = peutRejeter(motif, commentaire);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
      <ChampSelect
        id="supervision-priorite"
        libelle="Priorité d'intervention"
        valeur={priorite}
        options={proprietes.priorites.map((valeur) => ({ valeur, libelle: libellePriorite(valeur) }))}
        onChange={setPriorite}
        aide={validation.ok ? undefined : validation.raison}
        erreur={validation.ok ? null : validation.raison ?? null}
        requis
      />

      <ChampZoneTexte
        id="supervision-commentaire"
        libelle="Commentaire (facultatif, sauf pour le motif « Autre »)"
        valeur={commentaire}
        onChange={setCommentaire}
        minimum={0}
        lignes={3}
        aide="Ce commentaire est visible du citoyen dans l'historique de son dossier."
      />

      <Bouton
        variante="primaire"
        pleineLargeur
        desactive={!validation.ok || proprietes.enCours}
        enChargement={proprietes.enCours}
        onClick={() => proprietes.onValider(priorite, commentaire)}
      >
        Valider et transmettre aux équipes
      </Bouton>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: ESPACEMENT.e2,
          paddingTop: ESPACEMENT.e3,
          borderTop: `1px solid ${COULEURS.bordure}`,
        }}
      >
        <p style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-texte-attenue)" }}>
          Rejeter ferme le dossier : le citoyen reçoit le motif.
        </p>
        <ChampSelect
          id="supervision-motif"
          libelle="Motif de rejet"
          valeur={motif}
          options={proprietes.motifs.map((valeur) => ({ valeur, libelle: valeur }))}
          onChange={setMotif}
          erreur={motif.length > 0 && !rejet.ok ? rejet.raison ?? null : null}
        />
        <Bouton
          variante="danger"
          pleineLargeur
          desactive={!rejet.ok || proprietes.enCours}
          onClick={() => proprietes.onRejeter(motif, commentaire)}
        >
          Rejeter le signalement
        </Bouton>
      </div>
    </section>
  );
}
