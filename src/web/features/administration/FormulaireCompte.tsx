import type { ReactNode } from "react";
import { Bouton } from "../../ui/Bouton.tsx";
import { ChampSelect } from "../../ui/ChampSelect.tsx";
import { ESPACEMENT, TAILLE_TEXTE } from "../../ui/jetons.ts";
import type { CompteApi } from "../../api/client.ts";
import { basculerActivation, libelleRole } from "./logique.ts";

/**
 * Geste d'administration d'un compte, isolé pour tenir dans la modale et rester court.
 *
 * Les valeurs de rôle proposées sont un vocabulaire fixe du domaine ; la décision d'accepter ou de
 * refuser appartient au serveur, qui renvoie le compte tel qu'il a été enregistré.
 */
const ROLES_PROPOSES = ["CITOYEN", "AGENT", "SUPERVISEUR", "ADMIN"] as const;

export interface ProprietesFormulaireCompte {
  readonly compte: CompteApi;
  readonly enCours: boolean;
  readonly onModifier: (idUtilisateur: string, entree: { role?: string; actif?: boolean }, libelle: string) => void;
}

export function FormulaireCompte(proprietes: ProprietesFormulaireCompte): ReactNode {
  const compte = proprietes.compte;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
      <p style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-texte-attenue)" }}>
        {compte.email} · {compte.actif === false ? "désactivé" : "actif"}
      </p>

      <ChampSelect
        id={`role-${compte.id_utilisateur}`}
        libelle="Rôle"
        valeur={compte.role}
        options={ROLES_PROPOSES.map((valeur) => ({ valeur, libelle: libelleRole(valeur) }))}
        onChange={(nouveau) => {
          if (nouveau !== compte.role) {
            proprietes.onModifier(compte.id_utilisateur, { role: nouveau }, `Rôle de ${compte.email} modifié : ${libelleRole(nouveau)}.`);
          }
        }}
        desactive={proprietes.enCours}
      />

      <Bouton
        variante="texte"
        desactive={proprietes.enCours}
        onClick={() =>
          proprietes.onModifier(
            compte.id_utilisateur,
            basculerActivation(compte),
            `${compte.email} ${compte.actif === false ? "réactivé" : "désactivé"}.`,
          )
        }
      >
        {compte.actif === false ? "Réactiver ce compte" : "Désactiver ce compte"}
      </Bouton>

      <p style={{ margin: 0, fontSize: TAILLE_TEXTE.xs, color: "var(--ui-texte-attenue)" }}>
        Le dernier administrateur actif ne peut être ni rétrogradé ni désactivé : le refus vient du serveur.
      </p>
    </div>
  );
}
