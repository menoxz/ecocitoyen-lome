import { useState, type ReactNode } from "react";
import { CircleCheck, CircleSlash } from "lucide-react";
import { Bouton } from "../../ui/Bouton.tsx";
import { ChampSelect } from "../../ui/ChampSelect.tsx";
import { ChampZoneTexte } from "../../ui/ChampZoneTexte.tsx";
import { TAILLE_TEXTE } from "../../ui/jetons.ts";
import type { SignalementApi } from "../../api/client.ts";
import { libellePriorite, peutRejeter, peutValider } from "./logique.ts";

/**
 * Les deux décisions du superviseur, dans un seul panneau.
 *
 * Valider engage une priorité (l'arbitrage est son travail, pas un héritage du citoyen) ; rejeter
 * exige un motif, sans quoi le citoyen ne saurait pas quoi corriger. Les valeurs proposées
 * viennent du serveur : l'écran n'invente ni priorité ni motif.
 *
 * Disposition : les champs passent en deux colonnes dès 620 px, le commentaire occupe la ligne
 * entière (c'est du texte long), et les deux actions sont bornées en largeur pour ne pas s'étirer
 * sur un écran large. En dessous de 620 px, tout repasse en une colonne.
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
    <section className="ui-decision">
      <div className="ui-decision-bloc">
        <h3 className="ui-decision-titre">Valider</h3>
        <p className="ui-decision-note">La priorité engage les équipes : elle est décidée ici, pas héritée du citoyen.</p>

        <div className="ui-decision-champs">
          <ChampSelect
            id="supervision-priorite"
            libelle="Priorité d intervention"
            valeur={priorite}
            options={proprietes.priorites.map((valeur) => ({ valeur, libelle: libellePriorite(valeur) }))}
            onChange={setPriorite}
            aide={validation.ok ? undefined : validation.raison}
            erreur={validation.ok ? null : (validation.raison ?? null)}
            requis
          />

          <div className="ui-decision-champ-large">
            <ChampZoneTexte
              id="supervision-commentaire"
              libelle="Commentaire (facultatif, sauf pour le motif « Autre »)"
              valeur={commentaire}
              onChange={setCommentaire}
              minimum={0}
              lignes={2}
              aide="Ce commentaire est visible du citoyen dans l historique de son dossier."
            />
          </div>
        </div>

        <div className="ui-decision-actions">
          <Bouton
            variante="primaire"
            desactive={!validation.ok || proprietes.enCours}
            enChargement={proprietes.enCours}
            onClick={() => proprietes.onValider(priorite, commentaire)}
          >
            <CircleCheck size={18} aria-hidden="true" /> Valider et transmettre
          </Bouton>
        </div>
      </div>

      <div className="ui-decision-bloc ui-decision-bloc--rejet">
        <h3 className="ui-decision-titre">Rejeter</h3>
        <p className="ui-decision-note">Rejeter ferme le dossier : le citoyen reçoit le motif.</p>

        <div className="ui-decision-champs">
          <ChampSelect
            id="supervision-motif"
            libelle="Motif de rejet"
            valeur={motif}
            options={proprietes.motifs.map((valeur) => ({ valeur, libelle: valeur }))}
            onChange={setMotif}
            erreur={motif.length > 0 && !rejet.ok ? (rejet.raison ?? null) : null}
            aide="Un rejet sans motif ne dit pas au citoyen quoi corriger."
          />
        </div>

        <div className="ui-decision-actions">
          <Bouton
            variante="danger"
            desactive={!rejet.ok || proprietes.enCours}
            onClick={() => proprietes.onRejeter(motif, commentaire)}
          >
            <CircleSlash size={18} aria-hidden="true" /> Rejeter le signalement
          </Bouton>
        </div>
      </div>

      <p style={{ margin: 0, fontSize: TAILLE_TEXTE.xs, color: "var(--ui-texte-attenue)" }}>
        Décision enregistrée au nom de votre compte ; l identité du décideur n est pas publiée.
      </p>
    </section>
  );
}


