import type { ReactNode } from "react";
import { AlertTriangle, CameraOff, CircleDot, Clock, Gauge, MapPin, Users } from "lucide-react";
import { PucesEtat, type PuceEtat } from "./PucesEtat.tsx";
import { CLASSES, ESPACEMENT, RAYON, STATUTS, TAILLE_TEXTE, type ClePriorite, type CleStatut } from "./jetons.ts";

/**
 * Carte d'un objet de la file — niveau 3 de la hiérarchie de découverte.
 *
 * L'état de l'objet est donné d'un coup d'œil : icône + couleur + infobulle, pour chaque
 * information qui le distingue des autres (statut, priorité, quartier, âge, photo, confirmations).
 * Le détail complet n'est pas ici : c'est la carte qui s'ouvre au clic (niveau 4).
 *
 * L'identité de l'auteur n'apparaît jamais (RG28) : la projection serveur ne l'envoie pas.
 * `maintenantIso` est fourni par l'appelant : l'âge relatif est calculé, pas déduit d'une horloge
 * implicite, sinon le rendu n'est pas testable.
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
  /** Action principale de la file de l'agent : démarrer l'intervention depuis la carte. */
  readonly onDemarrer?: (id: string) => void;
  readonly demarrageEnCours?: boolean;
  /** Clôture dépliée dans la carte : le geste de fin d intervention, sans écran intermédiaire. */
  readonly onCloturer?: (id: string) => void;
  readonly clotureOuverte?: boolean;
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

const AIDE_STATUT = "Statut du dossier : il décide des actions possibles, il ne les indique pas.";
const AIDE_PRIORITE = "Priorité calculée par le service à partir de la catégorie et des confirmations.";

export function CarteSignalement(proprietes: ProprietesCarteSignalement): ReactNode {
  const age = ageRelatif(proprietes.dateSignalement, proprietes.maintenantIso);
  const descriptionCourte =
    proprietes.description.length > 140 ? `${proprietes.description.slice(0, 137)}…` : proprietes.description;
  const libelleStatut = (STATUTS as Record<string, { readonly libelle: string }>)[proprietes.statut]?.libelle;
  const puces: PuceEtat[] = [
    {
      icone: CircleDot,
      libelle: libelleStatut ?? String(proprietes.statut),
      ton: "statut",
      aide: AIDE_STATUT,
    },
    {
      icone: AlertTriangle,
      libelle: `Priorité ${proprietes.priorite === "URGENTE" ? "urgente" : String(proprietes.priorite).toLowerCase()}`,
      ton: proprietes.priorite === "URGENTE" || proprietes.priorite === "HAUTE" ? "erreur" : "priorite",
      aide: AIDE_PRIORITE,
    },
    ...(typeof proprietes.scorePriorite === "number"
      ? [
          {
            icone: Gauge,
            libelle: `Score ${proprietes.scorePriorite}`,
            ton: "neutre" as const,
            aide: "Score de priorité calculé par le service, affiché pour lire l'ordre de la file.",
          },
        ]
      : []),
    { icone: MapPin, libelle: proprietes.quartier, ton: "neutre", aide: "Quartier déclaré au signalement." },
    { icone: Clock, libelle: age, ton: "neutre", aide: "Ancienneté depuis la date de signalement." },
    {
      icone: CameraOff,
      libelle: proprietes.sansPhoto === true ? "Sans photo" : "Photo",
      ton: proprietes.sansPhoto === true ? "alerte" : "succes",
      aide:
        proprietes.sansPhoto === true
          ? "Signalement déclaré sans photo : mode dégradé, la preuve manque."
          : "Une photo est jointe au signalement.",
    },
    ...(proprietes.nbConfirmations > 0
      ? [
          {
            icone: Users,
            libelle: `${proprietes.nbConfirmations} confirmation(s)`,
            ton: "info" as const,
            aide: "Nombre de citoyens ayant confirmé le même problème.",
          },
        ]
      : []),
  ];

  return (
    <article
      className={CLASSES.carte}
      data-id={proprietes.id}
      data-selectionnee={proprietes.selectionnee === true ? "true" : undefined}
      aria-busy={proprietes.enChargement === true ? "true" : undefined}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: ESPACEMENT.e2,
        padding: ESPACEMENT.e3,
        borderRadius: RAYON.md,
        backgroundColor: "var(--ui-surface)",
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
      ) : null}

      <PucesEtat puces={puces} etiquette={`État du dossier ${proprietes.id}`} />

      <p style={{ margin: 0, fontSize: TAILLE_TEXTE.md, color: "inherit" }}>{descriptionCourte}</p>

      {proprietes.enChargement === true ? (
        <p style={{ margin: 0, fontSize: TAILLE_TEXTE.xs, color: "var(--ui-texte-attenue)" }}>chargement…</p>
      ) : null}

      {/* « Ouvrir le dossier » n'est plus l'alternative d'une autre action : c'est le seul moyen
          de lire le lieu, l'ancienneté et la description entière. L'action de travail (clôturer,
          démarrer) vient à côté, pas à la place. */}
      <div className="ui-carte-actions">
        {proprietes.onOuvrir ? (
          <button
            type="button"
            className={["ui-bouton", "ui-bouton--texte", CLASSES.focusable].join(" ")}
            aria-label={`Ouvrir le dossier ${proprietes.quartier}`}
            onClick={() => proprietes.onOuvrir?.(proprietes.id)}
          >
            Ouvrir le dossier
          </button>
        ) : null}

        {proprietes.onCloturer ? (
          <button
            type="button"
            className={[CLASSES.bouton, CLASSES.boutonPrimaire, CLASSES.focusable].join(" ")}
            aria-label={`Clôturer l intervention du dossier ${proprietes.quartier}`}
            aria-expanded={proprietes.clotureOuverte === true ? "true" : "false"}
            onClick={() => proprietes.onCloturer?.(proprietes.id)}
          >
            {proprietes.clotureOuverte === true ? "Fermer le compte rendu" : "Clôturer l intervention"}
          </button>
        ) : proprietes.onDemarrer ? (
          <button
            type="button"
            className={[CLASSES.bouton, CLASSES.boutonPrimaire, CLASSES.focusable].join(" ")}
            aria-label={`Démarrer l intervention du dossier ${proprietes.quartier}`}
            disabled={proprietes.demarrageEnCours === true}
            onClick={() => proprietes.onDemarrer?.(proprietes.id)}
          >
            {proprietes.demarrageEnCours === true ? "Démarrage…" : "Démarrer l intervention"}
          </button>
        ) : null}
      </div>
    </article>
  );
}

