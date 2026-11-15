import { describe, expect, test } from "bun:test";
import { BROUILLON_INITIAL, construireDemande, peutAvancer, type Brouillon } from "./etapes.ts";
import { versCentres } from "./EcranSignaler.tsx";
import type { QuartierApi } from "../../api/client.ts";

/**
 * Régression métier mesurée au navigateur : sans géolocalisation, l'étape « Lieu » affichait
 * « activez la localisation ou saisissez le repère » alors qu'aucun champ ne produisait de
 * position, et le bouton Continuer refusait d'avancer. Le parcours citoyen était donc impossible
 * dès que l'usager refusait la localisation — contraire à PARCOURS.md §3.
 */
const POSITION = { latitude: 6.1255, longitude: 1.2222 };
const CENTRES = { "qrt-be": { latitude: 6.1255, longitude: 1.2222 } };

const brouillon = (surcharge: Partial<Brouillon> = {}): Brouillon => ({ ...BROUILLON_INITIAL, ...surcharge });

describe("étape Lieu quand la géolocalisation est refusée", () => {
  test("refuse d'avancer sans position ni position approximative, avec une raison actionnable", () => {
    const decision = peutAvancer("lieu", brouillon({ idQuartier: "qrt-be" }));
    const raison = decision.ok ? "" : decision.raison;

    expect(decision.ok).toBe(false);
    expect(raison.length).toBeGreaterThan(20);
    expect(raison).toContain("centre");
    expect(raison).toContain("localisation");
  });

  test("accepte une position approximative dès que le quartier est choisi", () => {
    const decision = peutAvancer("lieu", brouillon({ idQuartier: "qrt-be", positionManuelle: true }));

    expect(decision.ok).toBe(true);
  });

  test("refuse la position approximative sans quartier : le centre viendrait de nulle part", () => {
    expect(peutAvancer("lieu", brouillon({ positionManuelle: true })).ok).toBe(false);
  });

  test("une position GPS reste valable sans position approximative", () => {
    expect(peutAvancer("lieu", brouillon({ position: POSITION, idQuartier: "qrt-be" })).ok).toBe(true);
  });
});

describe("demande construite avec une position approximative", () => {
  const complet = (surcharge: Partial<Brouillon> = {}): Brouillon =>
    brouillon({
      idQuartier: "qrt-be",
      idCategorie: "cat-1",
      description: "Tas de déchets devant l école primaire",
      ...surcharge,
    });

  test("utilise le centre du quartier et le déclare au serveur", () => {
    const demande = construireDemande(complet({ positionManuelle: true }), CENTRES);

    expect(demande.latitude).toBe(6.1255);
    expect(demande.longitude).toBe(1.2222);
    expect(demande.position_manuelle).toBe(true);
    expect(demande.precision_gps_m).toBe(500);
  });

  test("privilégie la position GPS réelle quand elle existe", () => {
    const demande = construireDemande(complet({ position: { latitude: 6.2, longitude: 1.3 } }), CENTRES);

    expect(demande.latitude).toBe(6.2);
    expect(demande.position_manuelle).toBe(false);
    expect(demande.precision_gps_m).toBe(15);
  });

  test("refuse de construire si le quartier choisi n'a pas de centre connu", () => {
    expect(() => construireDemande(complet({ positionManuelle: true, idQuartier: "qrt-inconnu" }), CENTRES)).toThrow();
  });
});

describe("versCentres", () => {
  test("extrait les centres et ignore les quartiers sans identifiant", () => {
    const quartiers: readonly QuartierApi[] = [
      { id_quartier: "qrt-be", nom: "Bè", centre_lat: 6.1255, centre_lon: 1.2222 },
      { id_quartier: "", nom: "Sans identifiant", centre_lat: 0, centre_lon: 0 },
    ];

    expect(versCentres(quartiers)).toEqual({ "qrt-be": { latitude: 6.1255, longitude: 1.2222 } });
  });

  test("retourne un objet vide sans quartier, sans échouer", () => {
    expect(versCentres([])).toEqual({});
  });
});
