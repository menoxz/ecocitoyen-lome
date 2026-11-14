import type { HorlogeReglable } from "@ports/horloge.port.ts";

/**
 * Horloge pilotable : même arithmétique que l''horloge réelle, mais l''instant de départ est
 * choisi. C''est ce qui rend testables les sept jours de contestation et les quinze minutes
 * de verrouillage sans attente réelle.
 */
export function creerHorlogeFixe(departIso: string): HorlogeReglable {
  let courant = Date.parse(departIso);
  const borne = Date.UTC(1970, 0, 1);

  return {
    maintenant() {
      return new Date(courant).toISOString();
    },
    decalerMinutes(iso, minutes) {
      return new Date(Date.parse(iso) + minutes * 60_000).toISOString();
    },
    debutFenetre(iso, minutes) {
      const fenetre = minutes > 0 ? minutes : 1;
      const millisecondes = Date.parse(iso);
      const debut = Math.floor((millisecondes - borne) / (fenetre * 60_000)) * fenetre * 60_000 + borne;
      return new Date(debut).toISOString();
    },
    avancerHeures(heures) {
      courant += heures * 3_600_000;
    },
    fixer(iso) {
      courant = Date.parse(iso);
    },
  };
}