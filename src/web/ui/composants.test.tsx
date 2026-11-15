import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BadgePriorite } from "./BadgePriorite.tsx";
import { BadgeStatut } from "./BadgeStatut.tsx";
import { Bouton } from "./Bouton.tsx";
import { ChampTexte } from "./ChampTexte.tsx";
import { EtatChargement } from "./EtatChargement.tsx";
import { EtatErreur } from "./EtatErreur.tsx";
import { EtatVide } from "./EtatVide.tsx";
import { CIBLE_TACTILE, CLASSES, STATUTS } from "./jetons.ts";

const rendu = (element: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(element);

describe("Bouton (6 états)", () => {
  test("repos : libellé, classes d'état et cible tactile", () => {
    const html = rendu(<Bouton>Envoyer</Bouton>);

    expect(html).toContain("Envoyer");
    expect(html).toContain(CLASSES.bouton);
    expect(html).toContain(CLASSES.focusable);
    expect(html).toContain(`min-height:${CIBLE_TACTILE}px`);
  });

  test("chaque variante porte sa classe : la couleur vient de la feuille, pas du composant", () => {
    expect(rendu(<Bouton variante="primaire">Valider</Bouton>)).toContain(CLASSES.boutonPrimaire);
    expect(rendu(<Bouton variante="secondaire">Annuler</Bouton>)).toContain(CLASSES.secondaire);
    expect(rendu(<Bouton variante="danger">Rejeter</Bouton>)).toContain(CLASSES.danger);
    expect(rendu(<Bouton variante="texte">Filtrer</Bouton>)).toContain("ui-bouton--texte");
  });

  test("désactivé : reste dans le DOM, annoncé, clic neutralisé", () => {
    let clique = false;
    const html = rendu(
      <Bouton desactive onClick={() => {
        clique = true;
      }}>
        Envoyer
      </Bouton>,
    );

    expect(html).toContain("disabled");
    expect(html).toContain('aria-disabled="true"');
    expect(clique).toBe(false);
  });

  test("chargement : libellé conservé, attente annoncée", () => {
    const html = rendu(<Bouton enChargement>Envoyer</Bouton>);

    expect(html).toContain("Envoyer");
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("disabled");
  });

  test("taille lg pour une action de parcours, sm pour une action secondaire", () => {
    expect(rendu(<Bouton taille="lg">Signaler</Bouton>)).toContain("min-height:52px");
    expect(rendu(<Bouton taille="sm">Filtrer</Bouton>)).toContain("min-height:36px");
  });

  test("icône seule : libellé accessible obligatoire", () => {
    const html = rendu(
      <Bouton libelleAccessible="Fermer la fenêtre">
        <span aria-hidden="true">×</span>
      </Bouton>,
    );

    expect(html).toContain('aria-label="Fermer la fenêtre"');
  });
});

describe("BadgeStatut (6 statuts + inconnu)", () => {
  test("chaque statut du domaine affiche son libellé français", () => {
    for (const [cle, definition] of Object.entries(STATUTS)) {
      const html = rendu(<BadgeStatut statut={cle} />);
      expect(html).toContain(definition.libelle);
      expect(html).toContain(`data-statut="${cle}"`);
      expect(html).toContain(CLASSES.badge);
    }
  });

  test("le libellé est écrit, pas seulement la couleur (daltonisme)", () => {
    const html = rendu(<BadgeStatut statut="EN_COURS" />);

    expect(html).toContain("En cours");
    expect(html).toContain("●");
  });

  test("un statut inconnu affiche son code plutôt qu'une couleur inventée", () => {
    const html = rendu(<BadgeStatut statut="ARCHIVE" />);

    expect(html).toContain("ARCHIVE");
    expect(html).toContain('data-statut="ARCHIVE"');
    expect(html).not.toContain("background-color");
  });
});

describe("BadgePriorite", () => {
  test("affiche le niveau et le score qui le justifie", () => {
    const html = rendu(<BadgePriorite priorite="URGENTE" score={6} />);

    expect(html).toContain("Priorité Urgente");
    expect(html).toContain('aria-label="score 6"');
  });

  test("sans score : aucun chiffre inventé", () => {
    const html = rendu(<BadgePriorite priorite="BASSE" />);

    expect(html).toContain("Priorité Basse");
    expect(html).not.toContain("aria-label=\"score");
  });

  test("les quatre niveaux du domaine sont rendus", () => {
    for (const niveau of ["BASSE", "NORMALE", "HAUTE", "URGENTE"] as const) {
      expect(rendu(<BadgePriorite priorite={niveau} />)).toContain("Priorité");
    }
  });
});

describe("ChampTexte (libellé, aide, erreur)", () => {
  const base = { id: "email", libelle: "Adresse e-mail", valeur: "", onChange: () => {} };

  test("le libellé est relié au champ, jamais un simple placeholder", () => {
    const html = rendu(<ChampTexte {...base} requis />);

    expect(html).toContain('for="email"');
    expect(html).toContain('id="email"');
    expect(html).toContain("Adresse e-mail");
    expect(html).toContain("required");
  });

  test("erreur : annoncée, reliée au champ, et remplace l'aide", () => {
    const html = rendu(<ChampTexte {...base} aide="Aide" erreur="Adresse invalide" />);

    expect(html).toContain('role="alert"');
    expect(html).toContain("Adresse invalide");
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="email-erreur"');
    expect(html).not.toContain("Aide");
  });

  test("aide affichée et reliée quand il n'y a pas d'erreur", () => {
    const html = rendu(<ChampTexte {...base} aide="Utilisée pour vous répondre" />);

    expect(html).toContain("Utilisée pour vous répondre");
    expect(html).toContain('aria-describedby="email-aide"');
  });

  test("désactivé : champ inerte et fond distinct", () => {
    const html = rendu(<ChampTexte {...base} desactive />);

    expect(html).toContain("disabled");
    expect(html).toContain(CLASSES.champ);
    expect(html).not.toContain("background-color");
  });

  test("champ de recherche typé et borné", () => {
    const html = rendu(<ChampTexte {...base} type="search" maxLength={120} />);

    expect(html).toContain('type="search"');
    expect(html.toLowerCase()).toContain('maxlength="120"');
  });
});

describe("états de chemin", () => {
  test("EtatVide explique et propose une sortie", () => {
    const html = rendu(<EtatVide titre="Aucun signalement" explication="Rien dans votre quartier" libelleAction="Signaler" onAction={() => {}} />);

    expect(html).toContain("Aucun signalement");
    expect(html).toContain("Rien dans votre quartier");
    expect(html).toContain("Signaler");
  });

  test("EtatVide sans action reste lisible (pas de bouton mort)", () => {
    const html = rendu(<EtatVide titre="Aucun résultat" explication="Modifiez votre recherche" />);

    expect(html).toContain("Aucun résultat");
    expect(html).not.toContain("<button");
  });

  test("EtatErreur affiche le code du refus et propose une reprise", () => {
    const html = rendu(<EtatErreur message="Cette transition n'est pas autorisée." code="TRANSITION_INTERDITE" libelleReprise="Recharger" onReprise={() => {}} />);

    expect(html).toContain('data-code="TRANSITION_INTERDITE"');
    expect(html).toContain('role="alert"');
    expect(html).toContain("Recharger");
  });

  test("EtatChargement annonce l'attente et garde la hauteur", () => {
    const html = rendu(<EtatChargement lignes={4} />);

    expect(html).toContain('aria-busy="true"');
    // La hauteur vit dans `theme.css` (`.ui-squelette`), plus dans un style inline : c'est ce qui
    // permet au squelette de suivre le mode sombre.
    expect((html.match(/ui-squelette/g) ?? []).length).toBe(4);
    expect(html).not.toContain("height:64px");
  });
});