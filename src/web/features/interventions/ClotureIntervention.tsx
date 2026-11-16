import { useState, type ReactNode } from "react";
import { Bouton } from "../../ui/Bouton.tsx";
import { ChampZoneTexte } from "../../ui/ChampZoneTexte.tsx";
import { GrillePhotos } from "../../ui/GrillePhotos.tsx";
import { ESPACEMENT, TAILLE_TEXTE } from "../../ui/jetons.ts";
import type { ClientApi, ErreurApi, SignalementApi } from "../../api/client.ts";
import { construireEntreeCloture, peutCloturer, type PhotoPreuve } from "./logique.ts";

/**
 * Clôture d'une intervention, dépliée dans la carte de la file.
 *
 * Ce formulaire vivait sur un écran de détail séparé qui n'affichait aucune information de plus
 * que la carte : seul le geste était neuf. Il est donc ici, là où l'agent voit le dossier.
 *
 * La preuve est le fichier lui-même : un booléen déclaratif ne prouverait rien. Le fichier part au
 * serveur en binaire (jamais en base64 dans du JSON), et la clôture reprend le chemin renvoyé par
 * le serveur, jamais un chemin forgé côté client.
 */
export interface ProprietesClotureIntervention {
  readonly dossier: SignalementApi;
  readonly client: ClientApi;
  readonly onMessage: (message: string) => void;
  readonly onFermer: () => void;
  readonly onRecharge: () => void;
}

export function ClotureIntervention(proprietes: ProprietesClotureIntervention): ReactNode {
  const [commentaire, setCommentaire] = useState("");
  /** La preuve est un fichier + son aperçu : même présentation que la page de signalement. */
  const [photo, setPhoto] = useState<(PhotoPreuve & { urlApercu?: string }) | null>(null);
  const [erreur, setErreur] = useState<ErreurApi | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const decision = peutCloturer(commentaire, photo);

  const prendrePhoto = (fichier: File | null): void => {
    if (photo?.urlApercu && typeof URL !== "undefined" && "revokeObjectURL" in URL) {
      URL.revokeObjectURL(photo.urlApercu);
    }
    setPhoto(
      fichier
        ? {
            octets: fichier,
            nom: fichier.name,
            typeMime: fichier.type || "image/jpeg",
            urlApercu:
              typeof URL !== "undefined" && "createObjectURL" in URL ? URL.createObjectURL(fichier) : undefined,
          }
        : null,
    );
  };

  const cloturer = async (): Promise<void> => {
    if (!photo) {
      setErreur({ code: "PHOTO_MANQUANTE", message: "Ajoutez la photographie du site nettoyé avant de clôturer." });
      return;
    }
    setEnvoi(true);
    setErreur(null);
    try {
      const envoiPhoto = await proprietes.client.envoyerPhoto(
        proprietes.dossier.id_signalement,
        photo.octets,
        photo.typeMime,
      );
      if (!envoiPhoto.ok) {
        setErreur(envoiPhoto.erreur);
        return;
      }

      const resultat = await proprietes.client.resoudre(
        proprietes.dossier.id_signalement,
        construireEntreeCloture(commentaire, {
          chemin: envoiPhoto.valeur.media.chemin,
          mime: photo.typeMime,
          tailleOctets: photo.octets.size,
        }),
      );
      if (!resultat.ok) {
        setErreur(resultat.erreur);
        return;
      }
      proprietes.onMessage("Intervention clôturée. La preuve est enregistrée et le citoyen est notifié.");
      proprietes.onFermer();
      proprietes.onRecharge();
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="ui-cloture">
      <ChampZoneTexte
        id={`compte-rendu-${proprietes.dossier.id_signalement}`}
        libelle="Ce qui a été fait"
        valeur={commentaire}
        onChange={setCommentaire}
        minimum={10}
        aide="Site nettoyé, bacs relevés, déchets transportés."
        requis
      />

      {/* Même composant de dépôt que la page de signalement : emplacement dessiné, aperçu, retrait. */}
      <p className="ui-cloture-libelle">Photographie du site nettoyé (obligatoire)</p>
      <GrillePhotos
        photos={photo ? [{ id: "preuve", nom: photo.nom, urlApercu: photo.urlApercu }] : []}
        maximum={1}
        desactive={envoi}
        onFichiers={(fichiers) => prendrePhoto(fichiers[0] ?? null)}
        onRetirer={() => prendrePhoto(null)}
      />
      {photo ? (
        <p className="ui-cloture-detail">
          {photo.nom} — {Math.max(1, Math.round(photo.octets.size / 1024))} Ko
        </p>
      ) : (
        <p style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-alerte)" }}>
          Sans photographie, la clôture sera refusée par le service : c'est la preuve du travail.
        </p>
      )}

      {erreur ? (
        <p role="alert" style={{ margin: 0, fontSize: TAILLE_TEXTE.sm, color: "var(--ui-erreur)" }}>
          {erreur.message}
        </p>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: ESPACEMENT.e2 }}>
        <Bouton variante="primaire" enChargement={envoi} desactive={!decision.ok} onClick={() => void cloturer()}>
          Clôturer avec preuve
        </Bouton>

      </div>
    </div>
  );
}



