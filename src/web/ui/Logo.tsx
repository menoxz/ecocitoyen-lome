import type { ReactNode } from "react";

/**
 * Logotype de la marque : six feuilles disposées en cercle, comme les pales d'un ventilateur.
 *
 * Dessiné en SVG inline plutôt qu'importé d'une bibliothèque : la marque doit rester stable quand
 * les icônes changent, et elle doit suivre le thème. Les deux tons viennent de variables
 * (`--ui-primaire`, `--ui-accent`), donc le logo se réaccorde en mode sombre sans règle dédiée.
 *
 * Décoratif par défaut : le nom « EcoCitoyen Lomé » est écrit juste à côté, un titre lu en plus
 * serait du bruit pour un lecteur d'écran.
 */
export interface ProprietesLogo {
  readonly taille?: number;
  readonly titre?: string;
}

/** Une feuille effilée : elle part du centre et s'ouvre vers l'extérieur. */
const FEUILLE = "M16 15.4 C17.4 11.6 20.2 8.9 24 7.3 C24.4 11.5 21.2 14.8 16 15.4 Z";
const NERVURE = "M16.9 14.6 L22.6 8.7";

const ANGLES = [0, 60, 120, 180, 240, 300] as const;

export function Logo(proprietes: ProprietesLogo): ReactNode {
  const taille = proprietes.taille ?? 24;
  const decoratif = proprietes.titre === undefined;

  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 32 32"
      role={decoratif ? "presentation" : "img"}
      aria-hidden={decoratif ? "true" : undefined}
      aria-label={proprietes.titre}
      focusable="false"
      className="ui-logo"
    >
      {ANGLES.map((angle, index) => (
        <g key={angle} transform={`rotate(${angle} 16 16)`}>
          <path d={FEUILLE} fill={index % 2 === 0 ? "var(--ui-primaire)" : "var(--ui-accent)"} />
          <path
            d={NERVURE}
            stroke="var(--ui-surface)"
            strokeWidth="0.7"
            strokeLinecap="round"
            fill="none"
            opacity="0.75"
          />
        </g>
      ))}
      <circle cx="16" cy="16" r="1.9" fill="var(--ui-accent)" />
    </svg>
  );
}
