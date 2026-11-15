import { useEffect, useState, type ReactNode } from "react";
import { AssistantSignalement } from "./AssistantSignalement.tsx";
import { EtatChargement } from "../../ui/EtatChargement.tsx";
import { EtatErreur } from "../../ui/EtatErreur.tsx";
import { Bouton } from "../../ui/Bouton.tsx";
import { COULEURS, ESPACEMENT, TAILLE_TEXTE } from "../../ui/jetons.ts";
import type { CategorieApi, ClientApi, ErreurApi, QuartierApi } from "../../api/client.ts";
import { construireDemande } from "./etapes.ts";

/**
 * Écran conteneur du parcours 1.
 *
 * Il porte les trois choses que le composant d'assistant ne doit pas connaître : le chargement
 * des référentiels, la session (le client envoie le cookie), et la conversion d'un refus serveur
 * en état affichable. L'assistant reste sans effet de bord, donc testable séparément.
 *
 * Les trois états sont explicites : chargement (squelette), erreur de chargement (avec reprise),
 * prêt (l'assistant).
 */
export interface ProprietesEcranSignaler {
  readonly client: ClientApi;
  readonly positionInitiale?: { readonly latitude: number; readonly longitude: number } | null;
  readonly onOuvrirDossier?: (idSignalement: string) => void;
  /** Injecté pour les tests : par défaut, la position vient du navigateur. */
  readonly positionFournie?: boolean;
}

type EtatChargementReferentiels =
  | { readonly etape: "chargement" }
  | { readonly etape: "erreur"; readonly erreur: ErreurApi }
  | {
      readonly etape: "pret";
      readonly categories: readonly { valeur: string; libelle: string }[];
      readonly quartiers: readonly { valeur: string; libelle: string }[];
    };

/** Conversion référentiel → options, pure et testable sans navigateur. */
export function versOptions(
  categories: readonly CategorieApi[],
  quartiers: readonly QuartierApi[],
): { categories: readonly { valeur: string; libelle: string }[]; quartiers: readonly { valeur: string; libelle: string }[] } {
  return {
    categories: categories
      .filter((categorie) => categorie.id_categorie.length > 0)
      .map((categorie) => ({ valeur: categorie.id_categorie, libelle: categorie.nom })),
    quartiers: quartiers
      .filter((quartier) => quartier.id_quartier.length > 0)
      .map((quartier) => ({ valeur: quartier.id_quartier, libelle: quartier.nom })),
  };
}

export function EcranSignaler(proprietes: ProprietesEcranSignaler): ReactNode {
  const [etat, setEtat] = useState<EtatChargementReferentiels>({ etape: "chargement" });

  const charger = (): void => {
    setEtat({ etape: "chargement" });
    void (async () => {
      const [categories, quartiers] = await Promise.all([
        proprietes.client.categories(),
        proprietes.client.quartiers(),
      ]);

      if (!categories.ok) {
        setEtat({ etape: "erreur", erreur: categories.erreur });
        return;
      }
      if (!quartiers.ok) {
        setEtat({ etape: "erreur", erreur: quartiers.erreur });
        return;
      }

      setEtat({ etape: "pret", ...versOptions(categories.valeur, quartiers.valeur) });
    })();
  };

  useEffect(charger, [proprietes.client]);

  if (etat.etape === "chargement") {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
        <h1 style={{ margin: 0, fontSize: TAILLE_TEXTE.xl, color: COULEURS.texte }}>Signaler un problème</h1>
        <EtatChargement lignes={3} libelle="Chargement des catégories et des quartiers" />
      </section>
    );
  }

  if (etat.etape === "erreur") {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e3 }}>
        <h1 style={{ margin: 0, fontSize: TAILLE_TEXTE.xl, color: COULEURS.texte }}>Signaler un problème</h1>
        <EtatErreur
          message={etat.erreur.message}
          code={etat.erreur.code}
          libelleReprise="Réessayer"
          onReprise={charger}
        />
      </section>
    );
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: ESPACEMENT.e4 }}>
      <h1 style={{ margin: 0, fontSize: TAILLE_TEXTE.xl, color: COULEURS.texte }}>Signaler un problème</h1>

      <AssistantSignalement
        categories={etat.categories}
        quartiers={etat.quartiers}
        positionInitiale={proprietes.positionInitiale ?? null}
        onOuvrirDossier={proprietes.onOuvrirDossier}
        envoyer={async (demande, photos) => {
          const resultat = await proprietes.client.creerSignalement(demande);
          if (!resultat.ok) {
            return resultat;
          }

          // Les photos partent après le dossier : une photo refusée n'annule pas le signalement
          // (CR13), et seuls les fichiers réellement choisis sont transmis.
          for (const photo of photos) {
            if (photo.octets) {
              await proprietes.client.envoyerPhoto(
                resultat.valeur.signalement.id_signalement,
                photo.octets,
                photo.typeMime ?? photo.octets.type ?? "application/octet-stream",
              );
            }
          }

          return { ok: true as const, valeur: { signalement: resultat.valeur.signalement } };
        }}
      />
    </section>
  );
}

/** Position du navigateur, ou null si l'utilisateur refuse : le parcours reste utilisable. */
export function positionDuNavigateur(): Promise<{ latitude: number; longitude: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resoudre) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resoudre({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => resoudre(null),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}