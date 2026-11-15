import type { ReactNode } from "react";
import { ChartColumn, Leaf, Megaphone, Search, ShieldCheck, Wrench } from "lucide-react";
import { Icone } from "../../ui/Icone.tsx";

/**
 * Page d'accueil : dire ce que fait le service, puis laisser choisir son rôle.
 *
 * Une page d'entrée publique n'a qu'un travail : faire comprendre en dix secondes ce qu'on peut
 * faire ici, et proposer une action principale évidente. L'action citoyenne est mise en avant ;
 * les accès de service restent visibles mais discrets, groupés, jamais mêlés au parcours usager.
 */
const ETAPES = [
  "Vous décrivez le problème et vous le situez.",
  "Le service municipal vérifie et décide.",
  "Vous suivez chaque étape, jusqu'à la résolution.",
] as const;

const ACCES_SERVICE = [
  {
    href: "#/interventions",
    titre: "Espace agent",
    detail: "Interventions affectées à votre équipe, preuve de terrain et clôture.",
    icone: Wrench,
  },
  {
    href: "#/supervision",
    titre: "Supervision",
    detail: "File de tri : valider un signalement ou le rejeter avec son motif.",
    icone: ShieldCheck,
  },
  {
    href: "#/indicateurs",
    titre: "Indicateurs de pilotage",
    detail: "Délais, taux de résolution et couverture, sans valeur inventée.",
    icone: ChartColumn,
  },
  {
    href: "#/administration",
    titre: "Administration",
    detail: "Comptes, rôles et activation, sous protection du dernier administrateur.",
    icone: ShieldCheck,
  },
] as const;

export function EcranAccueil(): ReactNode {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <section className="ui-heros">
        <span className="ui-tete-icone" aria-hidden="true">
          <Icone icone={Leaf} taille={26} />
        </span>
        <h1 className="ui-titre-page">Signaler un problème de propreté, et savoir ce qu'il devient</h1>
        <p className="ui-sous-titre">
          Dépôt sauvage, caniveau bouché, déchet dangereux : votre signalement entre dans une file de
          décision municipale. Chaque changement de statut est enregistré et vous est notifié.
        </p>
        <div className="ui-actions-principales">
          <a href="#/signaler" className="ui-lien-bouton">
            <Icone icone={Megaphone} taille={18} />
            Signaler un problème
          </a>
          <a href="#/dossier" className="ui-lien-bouton ui-lien-bouton--secondaire">
            <Icone icone={Search} taille={18} />
            Suivre un dossier
          </a>
        </div>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 className="ui-section-titre">Comment ça marche</h2>
        <ol className="ui-etapes">
          {ETAPES.map((etape) => (
            <li key={etape}>{etape}</li>
          ))}
        </ol>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 className="ui-section-titre">Accès de service</h2>
        <div className="ui-grille-acces">
          {ACCES_SERVICE.map((acces) => (
            <a key={acces.href} href={acces.href} className="ui-acces">
              <Icone icone={acces.icone} taille={22} />
              <span className="ui-acces-titre">{acces.titre}</span>
              <span className="ui-acces-detail">{acces.detail}</span>
            </a>
          ))}
        </div>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 className="ui-section-titre">Qualité et transparence</h2>
        <p style={{ fontSize: 14, margin: 0 }}>
          Les 14 critères de recette du cahier des charges sont publiés avec le test qui les porte :{" "}
          <a href="#/recette">voir la recette vérifiable</a>.
        </p>
      </section>
    </div>
  );
}
