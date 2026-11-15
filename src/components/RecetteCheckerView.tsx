import React from 'react';
import { Signalement, UserRole } from '../types/index.ts';

interface RecetteCheckerViewProps {
  reports: Signalement[];
  currentRole: UserRole;
  onOpenReportById: (id: string) => void;
}

/**
 * Vue de recette du prototype — neutralisée.
 *
 * Elle affichait quinze statuts « PASSED » saisis à la main et un bandeau « Critères validés
 * (100 %) » alors qu'aucun test n'avait tourné. C'est un mensonge d'affichage, pas une recette.
 *
 * La recette vérifiable vit dans le nouveau front (`#/recette`) : chaque critère y renvoie au
 * fichier de test et au libellé du test qui le porte, et le résultat se lit en lançant `bun test`.
 * Ce composant reste monté dans le prototype gelé, mais n'affirme plus aucun résultat.
 */
export const RecetteCheckerView: React.FC<RecetteCheckerViewProps> = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 space-y-3">
        <h1 className="text-lg font-bold text-amber-900">Recette déplacée vers le front vérifiable</h1>
        <p className="text-sm text-amber-800 leading-relaxed">
          Cet écran présentait des statuts de recette écrits à la main : aucun n&apos;était exécuté.
          La recette vit désormais là où chaque critère renvoie au test nommé qui le porte, et où le
          résultat se lit en lançant <code className="font-mono">bun test</code>.
        </p>
        <a
          href="signaler.html#/recette"
          className="inline-flex items-center min-h-[44px] px-4 rounded-lg bg-amber-900 text-amber-50 text-sm font-semibold"
        >
          Ouvrir la recette vérifiable
        </a>
      </div>
    </div>
  );
};
