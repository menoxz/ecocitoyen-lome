import type { DepotComptes } from "@ports/depot-comptes.port.ts";
import type { DepotReferentiel } from "@ports/depot-referentiel.port.ts";
import type { DepotSessions } from "@ports/depot-sessions.port.ts";
import type { DepotSignalements } from "@ports/depot-signalements.port.ts";
import type { EmpreinteJeton, Hachage } from "@ports/hachage.port.ts";
import type { Horloge } from "@ports/horloge.port.ts";
import type { Identifiants } from "@ports/identifiants.port.ts";
import type { Journal } from "@ports/journal.port.ts";
import type { LimiteDebit } from "@ports/limite-debit.port.ts";
import type { Notificateur } from "@ports/notificateur.port.ts";
import type { ClassificateurIA } from "@ports/classificateur-ia.port.ts";
import type { DepotTravaux } from "@ports/depot-travaux.port.ts";
import type { StockagePhotos } from "@ports/stockage-photos.port.ts";

/**
 * Tout ce dont un cas d''usage a besoin, fourni par la composition root.
 *
 * Un cas d''usage ne crée jamais ses dépendances et n''importe jamais `infrastructure` :
 * c''est ce qui rend un test possible sans base, sans serveur et sans réseau.
 */
export interface Dependances {
  readonly signalements: DepotSignalements;
  readonly comptes: DepotComptes;
  readonly referentiel: DepotReferentiel;
  readonly sessions: DepotSessions;
  readonly journal: Journal;
  readonly debit: LimiteDebit;
  readonly notifications: Notificateur;
  readonly stockagePhotos: StockagePhotos;
  readonly classificateur: ClassificateurIA;
  readonly travaux: DepotTravaux;
  readonly hachage: Hachage;
  readonly jetons: EmpreinteJeton;
  readonly identifiants: Identifiants;
  readonly horloge: Horloge;
}

/** Acteur authentifié, résolu par la couche interface à chaque requête. */
export interface Acteur {
  readonly idUtilisateur: string;
  readonly role: import("@domaine/compte/role.type.ts").Role;
  readonly idEquipe: string | null;
  readonly adresseIp: string | null;
}