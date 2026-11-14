import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  MapPin, 
  Download, 
  AlertCircle, 
  RefreshCw,
  PieChart as PieIcon,
  Filter
} from 'lucide-react';
import { KPIStats } from '../types/index.ts';

export const DashboardView: React.FC = () => {
  const [stats, setStats] = useState<KPIStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stats/overview');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch KPIs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleExportCSV = () => {
    window.location.href = '/api/reports/export-csv';
  };

  if (loading || !stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-600" />
        <p className="text-sm">Calcul des indicateurs municipaux en cours...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tableau de bord de pilotage</h1>
          <p className="text-sm text-slate-500">
            Indicateurs officiels de gestion des déchets urbains (District Autonome du Grand Lomé)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStats}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            title="Actualiser les indicateurs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Exporter CSV (EF47)</span>
          </button>
        </div>
      </div>

      {/* 6 Core KPI Cards (Section 13) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Taux de résolution */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Taux de résolution</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{stats.tauxResolution}%</span>
            <span className="text-xs text-emerald-700 font-semibold">
              {stats.resolusCount} résolus
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Résolus ÷ (Validés + En cours + Résolus + Rouverts)
          </p>
        </div>

        {/* KPI 2: Délai moyen de tri & traitement */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Délais moyens</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-600">Tri / Validation :</span>
              <span className="font-bold text-slate-900">{stats.delaiMoyenTriHeures}h</span>
            </div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-600">Intervention terrain :</span>
              <span className="font-bold text-emerald-700">{stats.delaiMoyenTraitementHeures}h</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Conforme aux cibles SLA Lomé (Section 5.3)
          </p>
        </div>

        {/* KPI 3: Qualité IA (Score & Accord) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Qualité IA Gemini</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{stats.qualiteIA.tauxAccord}%</span>
            <span className="text-xs text-purple-700 font-semibold">
              d'accord
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Score moyen {(stats.qualiteIA.scoreMoyen * 100).toFixed(0)}% sur {stats.qualiteIA.totalEvalues} analyses
          </p>
        </div>

        {/* KPI 4: Couverture géographique */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Couverture Lomé</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <MapPin className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{stats.couvertureGeographique}%</span>
            <span className="text-xs text-amber-700 font-semibold">
              des quartiers
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {stats.totalSignalements} signalements enregistrés au total
          </p>
        </div>
      </div>

      {/* Breakdown Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Répartition par Statut */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center justify-between">
            <span>Cycle de vie & Répartition par statut</span>
            <span className="text-xs font-normal text-slate-400">{stats.totalSignalements} total</span>
          </h3>

          <div className="space-y-2.5">
            {stats.parStatut.map((item) => {
              const pct = stats.totalSignalements > 0 ? Math.round((item.count / stats.totalSignalements) * 100) : 0;
              return (
                <div key={item.statut} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700">{item.label}</span>
                    <span className="font-bold text-slate-900">{item.count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Répartition par Catégorie */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">
            Répartition par catégorie de déchets
          </h3>

          <div className="space-y-2.5">
            {stats.parCategorie.map((cat) => {
              const pct = stats.totalSignalements > 0 ? Math.round((cat.count / stats.totalSignalements) * 100) : 0;
              return (
                <div key={cat.id_categorie} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700">{cat.nom}</span>
                    <span className="font-bold text-slate-900">{cat.count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: cat.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Répartition par Quartier de Lomé */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">
            Signalements par quartier (Lomé)
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {stats.parQuartier.map((q) => (
              <div key={q.id_quartier} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-xs font-semibold text-slate-800 block truncate">{q.nom}</span>
                <span className="text-lg font-bold text-emerald-700">{q.count}</span>
                <span className="text-[10px] text-slate-400 block">signalements</span>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Motifs de rejet et Priorités */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">
            Analyse des rejets et urgences
          </h3>

          <div className="space-y-3">
            <div>
              <span className="text-xs font-semibold text-slate-600 block mb-1.5">
                Niveaux de priorité actuels :
              </span>
              <div className="flex gap-2">
                {stats.parPriorite.map((p) => (
                  <div key={p.priorite} className="flex-1 bg-slate-50 p-2 rounded-xl text-center border border-slate-200">
                    <span className="text-[10px] font-semibold text-slate-500 block">{p.priorite}</span>
                    <span className="text-sm font-bold text-slate-900">{p.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-600 block mb-1.5">
                Motifs des signalements rejetés :
              </span>
              <div className="space-y-1">
                {stats.parMotifRejet.filter(m => m.count > 0).map((m) => (
                  <div key={m.motif} className="flex justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                    <span className="text-slate-700">{m.motif}</span>
                    <span className="font-semibold text-rose-600">{m.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
