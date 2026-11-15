import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Routeur, lien, resoudre } from "./routeur.tsx";

const rendu = (element: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(element);

describe("résolution de route", () => {
  test("reconnaît signaler, avec ou sans barre oblique", () => {
    expect(resoudre("#/signaler")).toBe("signaler");
    expect(resoudre("#signaler")).toBe("signaler");
    expect(resoudre("#/Signaler")).toBe("signaler");
    expect(resoudre("#/signaler?v=1")).toBe("signaler");
  });

  test("tout le reste tombe sur l accueil, sans page blanche", () => {
    expect(resoudre("")).toBe("accueil");
    expect(resoudre("#/")).toBe("accueil");
    expect(resoudre("#/inconnu")).toBe("accueil");
  });

  test("les liens sont stables", () => {
    expect(lien("accueil")).toBe("#/");
    expect(lien("signaler")).toBe("#/signaler");
    expect(lien("supervision")).toBe("#/supervision");
  });
});

describe("Routeur", () => {
  const renduDesRoutes = {
    accueil: <p>Accueil</p>,
    signaler: <p>Signaler</p>,
    interventions: <p>Interventions</p>,
    supervision: <p>Supervision</p>,
    recette: <p>Recette</p>,
  };

  test("rend la vue correspondant au fragment", () => {
    expect(rendu(<Routeur fragment="#/signaler" rendu={renduDesRoutes} />)).toContain("Signaler");
    expect(rendu(<Routeur fragment="" rendu={renduDesRoutes} />)).toContain("Accueil");
    expect(rendu(<Routeur fragment="#/supervision" rendu={renduDesRoutes} />)).toContain("Supervision");
    expect(rendu(<Routeur fragment="#/recette" rendu={renduDesRoutes} />)).toContain("Recette");
  });
});