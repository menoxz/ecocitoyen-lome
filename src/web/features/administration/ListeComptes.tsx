import { useState, type ReactNode } from "react";
import { CheckCircle2, UserCog, UserX, Users } from "lucide-react";
import { BarreListe } from "../../ui/BarreListe.tsx";
import { Bouton } from "../../ui/Bouton.tsx";
import { ChampSelect } from "../../ui/ChampSelect.tsx";
import { EtatVide } from "../../ui/EtatVide.tsx";
import { Facettes, type Facette } from "../../ui/Facettes.tsx";
import { PucesEtat, type PuceEtat } from "../../ui/PucesEtat.tsx";
import { ESPACEMENT, RAYON, TAILLE_TEXTE } from "../../ui/jetons.ts";
import { compterPar, filtrerParTexte, trierPar } from "../../ui/liste.ts";
import type { CompteApi } from "../../api/client.ts";
import { basculerActivation, libelleRole, nomAffichable } from "./logique.ts";

/**
 * Niveaux 2 et 3 de l'administration des comptes.
 *
 * Une ligne = un compte, avec son état en puces (rôle, actif, équipe) : icône, couleur et infobulle.
 * Les gestes — changer le rôle, désactiver — ne s'ouvrent qu'au clic (niveau 4) : une liste
 * d'administration ne doit pas exposer neuf boutons destructifs à portée de pouce.
 */
export interface ProprietesListeComptes {
  readonly comptes: readonly CompteApi[];
  readonly enCours: string | null;
  readonly onModifier: (
    idUtilisateur: string,
    entree: { role?: string; actif?: boolean },
    libelle: string,
  ) => void;
}

const TOUS = "TOUS";

const ROLES_PROPOSES = ["CITOYEN", "AGENT", "SUPERVISEUR", "ADMIN"] as const;

const OPTIONS_TRI = [
  { valeur: "service", libelle: "Administrateurs puis internes" },
  { valeur: "email", libelle: "Adresse e-mail" },
] as const;

export function ListeComptes(proprietes: ProprietesListeComptes): ReactNode {
  const [recherche, setRecherche] = useState("");
  const [role, setRole] = useState<string>(TOUS);
  const [tri, setTri] = useState<string>("service");

  const parRole = compterPar(proprietes.comptes, (compte) => compte.role);
  const facettes: readonly Facette[] = [
    { cle: TOUS, libelle: "Tous", nombre: proprietes.comptes.length },
    ...(["ADMIN", "SUPERVISEUR", "AGENT", "CITOYEN"] as const).map((cle) => ({
      cle,
      libelle: libelleRole(cle),
      nombre: parRole[cle] ?? 0,
    })),
  ];

  const filtres = filtrerParTexte(proprietes.comptes, recherche, (compte) => [
    compte.email,
    compte.nom ?? "",
    compte.prenom ?? "",
    libelleRole(compte.role),
  ]).filter((compte) => role === TOUS || compte.role === role);

  const visibles = tri === "email" ? trierPar(filtres, (compte) => compte.email) : filtres;

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
      <BarreListe
        idRecherche="recherche-compte"
        libelleRecherche="Chercher un compte"
        exempleRecherche="Nom, prénom, adresse e-mail ou rôle"
        recherche={recherche}
        onRecherche={setRecherche}
        tri={{ options: OPTIONS_TRI, valeur: tri, onChange: setTri }}
        filtres={
          <Facettes facettes={facettes} selection={role} etiquette="Filtrer par rôle" onSelectionner={setRole} />
        }
        resume={`${visibles.length} compte(s) affiché(s) sur ${proprietes.comptes.length}.`}
      />

      {visibles.length === 0 ? (
        <EtatVide
          titre="Aucun compte ne correspond"
          explication="Élargissez la recherche ou choisissez un autre rôle."
          libelleAction="Tout réafficher"
          onAction={() => {
            setRecherche("");
            setRole(TOUS);
          }}
        />
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: ESPACEMENT.e2 }}>
          {visibles.map((compte) => {
            const puces: PuceEtat[] = [
              {
                icone: UserCog,
                libelle: libelleRole(compte.role),
                ton: "info",
                aide: "Rôle du compte : il détermine les actions autorisées par le serveur.",
              },
              compte.actif === false
                ? { icone: UserX, libelle: "Désactivé", ton: "erreur", aide: "Compte désactivé : il ne peut plus se connecter." }
                : { icone: CheckCircle2, libelle: "Actif", ton: "succes", aide: "Compte actif : il peut se connecter." },
              ...(compte.id_equipe
                ? [{ icone: Users, libelle: `Équipe ${compte.id_equipe}`, ton: "neutre" as const, aide: "Équipe d intervention rattachée au compte." }]
                : []),
            ];

            return (
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
                <span style={{ fontSize: TAILLE_TEXTE.md, fontWeight: 600, color: "inherit" }}>
                  {nomAffichable(compte)}
                </span>
                <span style={{ fontSize: TAILLE_TEXTE.xs, color: "var(--ui-texte-attenue)" }}>{compte.email}</span>

                <PucesEtat puces={puces} etiquette={`État du compte ${compte.email}`} />

                <details>
                  <summary style={{ minHeight: 44, display: "flex", alignItems: "center", cursor: "pointer" }}>
                    <Bouton variante="texte" taille="sm">
                      Gérer ce compte
                    </Bouton>
                  </summary>
                  <div style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e2, paddingTop: ESPACEMENT.e2 }}>
                    <ChampSelect
                      id={`role-${compte.id_utilisateur}`}
                      libelle="Rôle"
                      valeur={compte.role}
                      options={ROLES_PROPOSES.map((valeur) => ({ valeur, libelle: libelleRole(valeur) }))}
                      onChange={(nouveau) => {
                        if (nouveau !== compte.role) {
                          void proprietes.onModifier(
                            compte.id_utilisateur,
                            { role: nouveau },
                            `Rôle de ${compte.email} modifié : ${libelleRole(nouveau)}.`,
                          );
                        }
                      }}
                      desactive={proprietes.enCours === compte.id_utilisateur}
                    />
                    <Bouton
                      variante="texte"
                      taille="sm"
                      desactive={proprietes.enCours === compte.id_utilisateur}
                      onClick={() =>
                        void proprietes.onModifier(
                          compte.id_utilisateur,
                          basculerActivation(compte),
                          `${compte.email} ${compte.actif === false ? "réactivé" : "désactivé"}.`,
                        )
                      }
                    >
                      {compte.actif === false ? "Réactiver ce compte" : "Désactiver ce compte"}
                    </Bouton>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
