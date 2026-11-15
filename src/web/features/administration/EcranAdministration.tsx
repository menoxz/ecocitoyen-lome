import { useCallback, useEffect, useState, type ReactNode } from "react";
import { FormulaireSession } from "../compte/FormulaireSession.tsx";
import { Bouton } from "../../ui/Bouton.tsx";
import { ChampSelect } from "../../ui/ChampSelect.tsx";
import { EtatChargement } from "../../ui/EtatChargement.tsx";
import { EtatErreur } from "../../ui/EtatErreur.tsx";
import { ESPACEMENT, RAYON, TAILLE_TEXTE } from "../../ui/jetons.ts";
import type { ClientApi, CompteApi, ErreurApi } from "../../api/client.ts";
import { basculerActivation, comptesTries, libelleRole, nomAffichable } from "./logique.ts";

/**
 * Parcours 7 : administration des comptes (PARCOURS.md §8).
 *
 * L'écran propose, le serveur décide. Chaque modification renvoie le compte tel qu'il a été
 * enregistré : la ligne affichée est celle du serveur, pas une supposition locale. Un refus
 * — notamment « dernier administrateur actif » — remonte avec son code et s'affiche tel quel.
 */
const ROLES_PROPOSES = ["CITOYEN", "AGENT", "SUPERVISEUR", "ADMIN"] as const;

export interface ProprietesEcranAdministration {
  readonly client: ClientApi;
}

type Session = "inconnu" | "absent" | "present";

export function EcranAdministration(proprietes: ProprietesEcranAdministration): ReactNode {
  const [session, setSession] = useState<Session>("inconnu");
  const [comptes, setComptes] = useState<readonly CompteApi[] | null>(null);
  const [erreur, setErreur] = useState<ErreurApi | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const resultat = await proprietes.client.moi();
      setSession(resultat.ok && resultat.valeur.compte ? "present" : "absent");
    })();
  }, [proprietes.client]);

  const charger = useCallback(async (): Promise<void> => {
    setErreur(null);
    const resultat = await proprietes.client.comptes();
    if (!resultat.ok) {
      setErreur(resultat.erreur);
      return;
    }
    setComptes(comptesTries(resultat.valeur));
  }, [proprietes.client]);

  useEffect(() => {
    if (session === "present") {
      void charger();
    }
  }, [session, charger]);

  const modifier = useCallback(
    async (idUtilisateur: string, entree: { role?: string; actif?: boolean }, libelle: string): Promise<void> => {
      setEnCours(idUtilisateur);
      setErreur(null);
      setMessage(null);
      const resultat = await proprietes.client.modifierCompte(idUtilisateur, entree);
      setEnCours(null);
      if (!resultat.ok) {
        setErreur(resultat.erreur);
        return;
      }
      const maj = resultat.valeur;
      setComptes((liste) => (liste ?? []).map((compte) => (compte.id_utilisateur === maj.id_utilisateur ? { ...compte, ...maj } : compte)));
      setMessage(libelle);
    },
    [proprietes.client],
  );

  if (session === "inconnu") {
    return <EtatChargement lignes={2} libelle="Vérification de votre session" />;
  }

  if (session === "absent") {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e4 }}>
        <h1 style={{ margin: 0, fontSize: TAILLE_TEXTE.xl, color: "inherit" }}>Administration des comptes</h1>
        <FormulaireSession
          client={proprietes.client}
          onSession={() => setSession("present")}
          titre="Se connecter pour administrer les comptes"
          explication="Seul un administrateur peut changer un rôle ou désactiver un compte."
        />
      </section>
    );
  }

  if (erreur && !comptes) {
    return <EtatErreur message={erreur.message} code={erreur.code} libelleReprise="Réessayer" onReprise={() => void charger()} />;
  }

  if (!comptes) {
    return <EtatChargement lignes={4} libelle="Chargement des comptes" />;
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
      <h1 style={{ margin: 0, fontSize: TAILLE_TEXTE.xl, color: "inherit" }}>Administration des comptes</h1>
      <p style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-texte-attenue)" }}>
        {comptes.length} compte(s). Le dernier administrateur actif ne peut être ni rétrogradé ni désactivé.
      </p>

      {message ? (
        <p role="status" style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-succes)" }}>{message}</p>
      ) : null}

      {erreur ? (
        <p role="alert" style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-erreur)" }}>
          {erreur.message}
        </p>
      ) : null}

      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: ESPACEMENT.e2 }}>
        {comptes.map((compte) => (
          <li
            key={compte.id_utilisateur}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: ESPACEMENT.e2,
              padding: ESPACEMENT.e3,
              border: "1px solid var(--ui-bordure)",
              borderRadius: RAYON.md,
              backgroundColor: compte.actif === false ? "var(--ui-surface-douce)" : "var(--ui-surface)",
            }}
          >
            <span style={{ fontSize: TAILLE_TEXTE.md, color: "inherit", fontWeight: 600 }}>
              {nomAffichable(compte)}
            </span>
            <span style={{ fontSize: TAILLE_TEXTE.xs, color: "var(--ui-texte-attenue)" }}>
              {compte.email} · {compte.actif === false ? "désactivé" : "actif"}
            </span>

            <ChampSelect
              id={`role-${compte.id_utilisateur}`}
              libelle="Rôle"
              valeur={compte.role}
              options={ROLES_PROPOSES.map((role) => ({ valeur: role, libelle: libelleRole(role) }))}
              onChange={(role) => {
                if (role !== compte.role) {
                  void modifier(compte.id_utilisateur, { role }, `Rôle de ${compte.email} modifié : ${libelleRole(role)}.`);
                }
              }}
              desactive={enCours === compte.id_utilisateur}
            />

            <Bouton
              variante="texte"
              taille="sm"
              desactive={enCours === compte.id_utilisateur}
              onClick={() =>
                void modifier(
                  compte.id_utilisateur,
                  basculerActivation(compte),
                  `${compte.email} ${compte.actif === false ? "réactivé" : "désactivé"}.`,
                )
              }
            >
              {compte.actif === false ? "Réactiver ce compte" : "Désactiver ce compte"}
            </Bouton>
          </li>
        ))}
      </ul>
    </section>
  );
}
