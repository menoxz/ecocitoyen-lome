import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Icône du thème, dans une enveloppe unique.
 *
 * Trois décisions prises ici une fois pour toutes : la taille vient de l'échelle du thème, le trait
 * reste constant (un mélange d'épaisseurs se voit immédiatement), et une icône purement décorative
 * est masquée aux lecteurs d'écran — sinon elle est annoncée sans rien dire. Une icône qui porte du
 * sens reçoit un `libelle`, et seulement dans ce cas.
 */
export interface ProprietesIcone {
  readonly icone: LucideIcon;
  /** Taille en pixels ; 20 par défaut, aligné sur la hauteur de ligne du texte courant. */
  readonly taille?: number;
  /** Décorative : masquée aux technologies d'assistance. `true` par défaut. */
  readonly decorative?: boolean;
  readonly libelle?: string;
  readonly classe?: string;
}

export function Icone(proprietes: ProprietesIcone): ReactNode {
  const Element = proprietes.icone;
  const decorative = proprietes.decorative !== false;

  return (
    <Element
      size={proprietes.taille ?? 20}
      strokeWidth={1.75}
      className={["ui-icone", proprietes.classe ?? ""].filter(Boolean).join(" ")}
      aria-hidden={decorative ? "true" : undefined}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : proprietes.libelle}
      focusable="false"
    />
  );
}
