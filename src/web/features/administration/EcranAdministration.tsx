import { useCallback, useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, ShieldCheck, UserCog, Users } from "lucide-react";
import { FormulaireSession } from "../compte/FormulaireSession.tsx";
import { EnTeteVue } from "../../ui/EnTeteVue.tsx";
import { EtatChargement } from "../../ui/EtatChargement.tsx";
import { EtatErreur } from "../../ui/EtatErreur.tsx";
import { ESPACEMENT, TAILLE_TEXTE } from "../../ui/jetons.ts";
import type { ClientApi, CompteApi, ErreurApi } from "../../api/client.ts";
import { ListeComptes } from "./ListeComptes.tsx";
import { comptesTries } from "./logique.ts";

/**
 * Parcours 7 : administration des comptes (PARCOURS.md §8), monté selon la hiérarchie de
 * découverte :
 *   1. la donnée globale — combien de comptes, combien d'administrateurs, combien d'actifs ;
 *   2. la liste, cherchable, filtrable par rôle et triable (`ListeComptes`) ;
 *   3. l'état de chaque compte, en icône + couleur + infobulle ;
 *   4. les gestes — rôle, activation — repliés, ouverts au clic.
 *
 * L'écran propose, le serveur décide. Chaque modification renvoie le compte tel qu'il a été
 * enregistré : la ligne affichée est celle du serveur, pas une supposition locale.
 */
export interface ProprietesEcranAdministration {
  readonly client: ClientApi;
}

type Session = "inconnu" | "absent" | "present";

const EXPLICATION =
  "Les comptes du service et leurs droits. Le dernier administrateur actif ne peut être ni rétrogradé ni désactivé.";

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
      setComptes((liste) =>
        (liste ?? []).map((compte) => (compte.id_utilisateur === maj.id_utilisateur ? { ...compte, ...maj } : compte)),
      );
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
        <EnTeteVue icone={ShieldCheck} titre="Administration des comptes" explication={EXPLICATION} />
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
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e4 }}>
        <EnTeteVue icone={ShieldCheck} titre="Administration des comptes" explication={EXPLICATION} />
        <EtatErreur
          message={erreur.message}
          code={erreur.code}
          libelleReprise="Réessayer"
          onReprise={() => void charger()}
        />
      </section>
    );
  }

  if (!comptes) {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e4 }}>
        <EnTeteVue icone={ShieldCheck} titre="Administration des comptes" explication={EXPLICATION} />
        <EtatChargement lignes={4} libelle="Chargement des comptes" />
      </section>
    );
  }

  const administrateurs = comptes.filter((compte) => compte.role === "ADMIN").length;
  const actifs = comptes.filter((compte) => compte.actif !== false).length;

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
      <EnTeteVue
        icone={ShieldCheck}
        titre="Administration des comptes"
        explication={EXPLICATION}
        chiffres={[
          {
            icone: Users,
            valeur: String(comptes.length),
            libelle: "compte(s)",
            aide: "Comptes enregistrés, servis par le serveur.",
          },
          {
            icone: UserCog,
            valeur: String(administrateurs),
            libelle: "administrateur(s)",
            aide: "Comptes au rôle ADMIN. Le dernier actif est protégé par le serveur.",
          },
          {
            icone: CheckCircle2,
            valeur: String(actifs),
            libelle: "actif(s)",
            aide: "Comptes autorisés à se connecter.",
          },
        ]}
      />

      {message ? (
        <p role="status" style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-succes)" }}>
          {message}
        </p>
      ) : null}

      {erreur ? (
        <p role="alert" style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-erreur)" }}>
          {erreur.message}
        </p>
      ) : null}

      <ListeComptes comptes={comptes} enCours={enCours} onModifier={(id, entree, libelle) => void modifier(id, entree, libelle)} />
    </section>
  );
}
