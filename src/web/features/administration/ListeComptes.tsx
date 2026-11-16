import { useState, type ReactNode } from "react";
import { CheckCircle2, Settings, UserCog, UserX, Users } from "lucide-react";
import { BarreListe } from "../../ui/BarreListe.tsx";
import { Bouton } from "../../ui/Bouton.tsx";
import { EtatVide } from "../../ui/EtatVide.tsx";
import { Facettes, type Facette } from "../../ui/Facettes.tsx";
import { Modale } from "../../ui/Modale.tsx";
import { Pagination } from "../../ui/Pagination.tsx";
import { PucesEtat, type PuceEtat } from "../../ui/PucesEtat.tsx";
import { ESPACEMENT, RAYON, TAILLE_TEXTE } from "../../ui/jetons.ts";
import { bornesPage, compterPar, filtrerParTexte, nombreDePages, paginer, trierPar } from "../../ui/liste.ts";
import type { CompteApi } from "../../api/client.ts";
import { FormulaireCompte } from "./FormulaireCompte.tsx";
import { libelleRole, nomAffichable } from "./logique.ts";

/**
 * Niveaux 2 à 4 de l'administration des comptes.
 *
 * Une ligne = un compte, avec son état en puces (rôle, actif, équipe). Les gestes ne sont pas dans
 * la liste : ils s'ouvrent dans une modale, qui prend le focus et met les actions destructives à
 * l'abri d'un pouce maladroit. Objets courts → grille de deux colonnes au-delà de 1100 px.
 */
export interface ProprietesListeComptes {
  readonly comptes: readonly CompteApi[];
  readonly enCours: string | null;
  readonly onModifier: (idUtilisateur: string, entree: { role?: string; actif?: boolean }, libelle: string) => void;
}

const TOUS = "TOUS";

const OPTIONS_TRI = [
  { valeur: "service", libelle: "Administrateurs puis internes" },
  { valeur: "email", libelle: "Adresse e-mail" },
] as const;

export function ListeComptes(proprietes: ProprietesListeComptes): ReactNode {
  const [recherche, setRecherche] = useState("");
  const [role, setRole] = useState<string>(TOUS);
  const [tri, setTri] = useState<string>("service");
  const [page, setPage] = useState(1);
  const [gestion, setGestion] = useState<CompteApi | null>(null);

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
  const pages = nombreDePages(visibles.length);
  const courante = Math.min(page, pages);
  const bornes = bornesPage(courante, visibles.length);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
      <BarreListe
        idRecherche="recherche-compte"
        libelleRecherche="Chercher un compte"
        exempleRecherche="Nom, prénom, adresse e-mail ou rôle"
        recherche={recherche}
        onRecherche={(valeur) => { setRecherche(valeur); setPage(1); }}
        tri={{ options: OPTIONS_TRI, valeur: tri, onChange: setTri }}
        filtres={<Facettes facettes={facettes} selection={role} etiquette="Filtrer par rôle" onSelectionner={(cle) => { setRole(cle); setPage(1); }} />}
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
            setPage(1);
          }}
        />
      ) : (
        <>
          <ul className="ui-grille-objets">
            {paginer(visibles, courante).map((compte) => {
              const puces: PuceEtat[] = [
                { icone: UserCog, libelle: libelleRole(compte.role), ton: "info", aide: "Rôle du compte : il détermine les actions autorisées par le serveur." },
                compte.actif === false
                  ? { icone: UserX, libelle: "Désactivé", ton: "erreur", aide: "Compte désactivé : il ne peut plus se connecter." }
                  : { icone: CheckCircle2, libelle: "Actif", ton: "succes", aide: "Compte actif : il peut se connecter." },
                ...(compte.id_equipe
                  ? [{ icone: Users, libelle: `Équipe ${compte.id_equipe}`, ton: "neutre" as const, aide: "Équipe d'intervention rattachée au compte." }]
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
                  <span style={{ fontSize: TAILLE_TEXTE.md, fontWeight: 600, color: "inherit" }}>{nomAffichable(compte)}</span>
                  <span style={{ fontSize: TAILLE_TEXTE.xs, color: "var(--ui-texte-attenue)" }}>{compte.email}</span>
                  <PucesEtat puces={puces} etiquette={`État du compte ${compte.email}`} />
                  <Bouton variante="texte" taille="sm" onClick={() => setGestion(compte)}>
                    <Settings size={16} aria-hidden="true" /> Gérer ce compte
                  </Bouton>
                </li>
              );
            })}
          </ul>

          <Pagination page={courante} pages={pages} debut={bornes.debut} fin={bornes.fin} total={visibles.length} onPage={setPage} />
        </>
      )}

      <Modale ouverte={gestion !== null} titre={gestion ? `Gérer ${nomAffichable(gestion)}` : ""} onFermer={() => setGestion(null)}>
        {gestion ? (
          <FormulaireCompte
            compte={gestion}
            enCours={proprietes.enCours === gestion.id_utilisateur}
            onModifier={proprietes.onModifier}
          />
        ) : null}
      </Modale>
    </section>
  );
}
