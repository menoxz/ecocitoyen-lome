import { ChartColumn, FileSearch, Megaphone, Settings, ShieldCheck, Wrench } from "lucide-react";

/**
 * Entrées de navigation, en une seule source.
 *
 * La barre de bureau et le menu burger mobile doivent proposer exactement les mêmes cibles : deux
 * listes séparées finiraient par diverger à la première addition. La description de chaque accès
 * de service reste sur l'accueil, qui est le seul écran où il y a la place de l'expliquer.
 */
export const LIENS_NAV = [
  { href: "#/signaler", libelle: "Signaler", icone: Megaphone },
  { href: "#/dossier", libelle: "Suivre", icone: FileSearch },
  { href: "#/indicateurs", libelle: "Indicateurs", icone: ChartColumn },
] as const;

export const ACCES_SERVICE = [
  { href: "#/interventions", libelle: "Espace agent", icone: Wrench },
  { href: "#/supervision", libelle: "Supervision", icone: ShieldCheck },
  { href: "#/indicateurs", libelle: "Indicateurs de pilotage", icone: ChartColumn },
  { href: "#/administration", libelle: "Administration", icone: Settings },
] as const;
