import type { Horloge } from "@ports/horloge.port.ts";

/**
 * Horloge réelle. Un des rares fichiers autorisés à lire l''heure système : la couche
 * infrastructure est précisément là pour isoler cette dépendance.
 */
export function creerHorlogeSysteme(): Horloge {
  return {
    maintenant() {
      return new Date().toISOString();
    },
    decalerMinutes(iso, minutes) {
      return new Date(Date.parse(iso) + minutes * 60_000).toISOString();
    },
    debutFenetre(iso, minutes) {
      const fenetre = minutes > 0 ? minutes : 1;
      const millisecondes = Date.parse(iso);
      const borne = Date.UTC(1970, 0, 1);
      const debut = Math.floor((millisecondes - borne) / (fenetre * 60_000)) * fenetre * 60_000 + borne;
      return new Date(debut).toISOString();
    },
  };
}