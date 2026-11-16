import { useEffect, useState, type ReactNode } from "react";
import { CameraOff, CircleDot, Clock, Gauge, Info, MapPin, Users } from "lucide-react";
import { PucesEtat, type PuceEtat } from "../../ui/PucesEtat.tsx";
import { ageRelatif } from "../../ui/CarteSignalement.tsx";
import { ESPACEMENT, TAILLE_TEXTE } from "../../ui/jetons.ts";
import type { ClientApi, PhotoApi, SignalementApi } from "../../api/client.ts";

/**
 * Fiche d'un dossier — niveau 4 de la hiérarchie de découverte.
 *
 * Sans elle, un agent décidait sur une phrase tronquée à 140 caractères, sans lieu précis, sans
 * ancienneté exacte, sans savoir ce qu'on attendait de lui. Trois manques ont été constatés à
 * l'usage : aucun détail ouvrable, aucune action « prendre en main », et la seule action offerte
 * était la clôture — la plus irréversible.
 *
 * La fiche ne décide rien : elle affiche les valeurs du serveur et expose les gestes que l'écran
 * appelant lui transmet. L'identité de l'auteur n'est jamais affichée (RG28), même si elle
 * existait côté données.
 *
 * Les preuves sont chargées ici et affichées : la carte annonçait « photo jointe » sans qu'aucune
 * vue ne permette de la regarder, ce qui revenait à demander de décider sans preuve.
 */
export interface ProprietesDetailDossier {
  readonly dossier: SignalementApi;
  readonly maintenantIso: string;
  readonly client: ClientApi;
  readonly onDemarrer?: (id: string) => void;
  readonly demarrageEnCours?: boolean;
  readonly onCloturer?: (id: string) => void;
}

const AIDE_PRIORITE = "Priorité calculée par le service à partir de la catégorie et des confirmations.";

/** Date absolue lisible, pour lever l'ambiguïté de « il y a 3 j ». */
function dateLisible(iso: string): string {
  const brut = Date.parse(iso);
  if (!Number.isFinite(brut)) {
    return "date inconnue";
  }
  return new Date(brut).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
}

export function DetailDossier(proprietes: ProprietesDetailDossier): ReactNode {
  const dossier = proprietes.dossier;
  const quartier = dossier.quartier_nom ?? dossier.id_quartier;

  const [photos, setPhotos] = useState<readonly PhotoApi[] | null>(null);
  const [erreurPhotos, setErreurPhotos] = useState<string | null>(null);

  useEffect(() => {
    let actif = true;
    setPhotos(null);
    setErreurPhotos(null);
    void proprietes.client.photosDe(dossier.id_signalement).then((resultat) => {
      if (!actif) {
        return;
      }
      if (resultat.ok) {
        setPhotos(resultat.valeur);
        return;
      }
      setPhotos([]);
      setErreurPhotos(resultat.erreur.message);
    });
    return () => {
      actif = false;
    };
  }, [proprietes.client, dossier.id_signalement]);

  const puces: PuceEtat[] = [
    { icone: CircleDot, libelle: `Statut ${String(dossier.statut).toLowerCase()}`, ton: "statut", aide: "Statut du dossier." },
    {
      icone: Gauge,
      libelle: `Priorité ${String(dossier.niveau_priorite).toLowerCase()}`,
      ton: dossier.niveau_priorite === "URGENTE" || dossier.niveau_priorite === "HAUTE" ? "erreur" : "priorite",
      aide: AIDE_PRIORITE,
    },
    ...(typeof dossier.score_priorite === "number"
      ? [{ icone: Gauge, libelle: `Score ${dossier.score_priorite}`, ton: "neutre" as const, aide: "Ordre dans la file." }]
      : []),
    { icone: MapPin, libelle: quartier, ton: "neutre", aide: "Quartier déclaré au signalement." },
    { icone: Clock, libelle: ageRelatif(dossier.date_signalement, proprietes.maintenantIso), ton: "neutre", aide: "Ancienneté." },
    {
      icone: CameraOff,
      libelle: dossier.sans_photo === true ? "Sans photo" : "Photo jointe",
      ton: dossier.sans_photo === true ? "alerte" : "succes",
      aide: "Une photo est exigée pour clôturer : sans elle, la clôture est refusée.",
    },
    ...(dossier.nb_confirmations > 0
      ? [
          {
            icone: Users,
            libelle: `${dossier.nb_confirmations} confirmation(s)`,
            ton: "info" as const,
            aide: "Citoyens ayant confirmé le même problème.",
          },
        ]
      : []),
  ];

  return (
    <div className="ui-detail-dossier">
      <PucesEtat puces={puces} etiquette="État du dossier" />

      <section>
        <h3 className="ui-detail-titre">Ce qui a été signalé</h3>
        <p className="ui-detail-texte">{dossier.description ?? "Aucune description fournie."}</p>
        <dl className="ui-detail-liste">
          <div>
            <dt>Quartier</dt>
            <dd>{quartier}</dd>
          </div>
          <div>
            <dt>Signalé le</dt>
            <dd>{dateLisible(dossier.date_signalement)}</dd>
          </div>
          <div>
            <dt>Référence</dt>
            <dd>
              <code>{dossier.id_signalement}</code>
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <h3 className="ui-detail-titre">Preuves photographiques</h3>
        {photos === null ? (
          <p className="ui-detail-note" style={{ fontSize: TAILLE_TEXTE.sm }}>
            Chargement des preuves…
          </p>
        ) : photos.length === 0 ? (
          <p className="ui-detail-note" style={{ fontSize: TAILLE_TEXTE.sm }}>
            {erreurPhotos
              ? `Preuves indisponibles : ${erreurPhotos}`
              : "Aucune photo n'est jointe à ce dossier. La clôture en exigera une."}
          </p>
        ) : (
          <ul className="ui-preuves">
            {photos.map((photo, index) => (
              <li key={photo.id_media}>
                <a
                  href={proprietes.client.urlPhoto(dossier.id_signalement, photo.id_media)}
                  target="_blank"
                  rel="noreferrer"
                  title="Ouvrir la preuve en grand"
                >
                  <img
                    className="ui-preuve"
                    src={proprietes.client.urlPhoto(dossier.id_signalement, photo.id_media)}
                    alt={`Preuve ${index + 1} du signalement, ${photo.type === "RESOLUTION" ? "après intervention" : "à la déclaration"}`}
                    loading="lazy"
                  />
                </a>
                <span className="ui-preuve-legende">
                  {photo.type === "RESOLUTION" ? "Après intervention" : "À la déclaration"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ui-detail-attendu">
        <h3 className="ui-detail-titre">
          <Info size={16} aria-hidden="true" /> Ce qu'on attend de vous
        </h3>
        <ol className="ui-detail-etapes">
          <li>Aller sur place et constater.</li>
          <li>Prendre en main le dossier : il passe « en cours » et vous en devenez responsable.</li>
          <li>Clôturer avec une photo et un mot sur ce qui a été fait. Sans photo, la clôture est refusée.</li>
        </ol>
      </section>

      <div className="ui-detail-actions" style={{ gap: ESPACEMENT.e2 }}>
        {proprietes.onDemarrer ? (
          <button
            type="button"
            className="ui-bouton ui-bouton--primaire"
            disabled={proprietes.demarrageEnCours === true}
            onClick={() => proprietes.onDemarrer?.(dossier.id_signalement)}
          >
            {proprietes.demarrageEnCours === true ? "Prise en main…" : "Prendre en main"}
          </button>
        ) : null}
        {proprietes.onCloturer ? (
          <button
            type="button"
            className="ui-bouton"
            onClick={() => proprietes.onCloturer?.(dossier.id_signalement)}
          >
            Clôturer avec preuve
          </button>
        ) : null}
      </div>

      <p className="ui-detail-note" style={{ fontSize: TAILLE_TEXTE.xs }}>
        Les priorités et les statuts sont décidés par le service : cette fiche ne les modifie pas.
      </p>
    </div>
  );
}
