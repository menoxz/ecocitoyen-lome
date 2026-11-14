import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Calendar,
  ThumbsUp,
  Image as ImageIcon,
  User,
  ArrowRight
} from 'lucide-react';
import { Signalement, Categorie, Quartier, SignalementStatut, PrioriteNiveau, UserRole } from '../types/index.ts';
import { STATUS_CONFIG, PRIORITY_CONFIG, formatDate, formatRelativeTime } from '../utils/helpers.ts';

interface ReportsListViewProps {
  reports: Signalement[];
  categories: Categorie[];
  quartiers: Quartier[];
  currentRole: UserRole;
  onSelectReport: (report: Signalement) => void;
  onOpenNewReport: () => void;
}

export const ReportsListView: React.FC<ReportsListViewProps> = ({
  reports,
  categories,
  quartiers,
  currentRole,
  onSelectReport,
  onOpenNewReport
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatut, setSelectedStatut] = useState<string>('ALL');
  const [selectedCategorie, setSelectedCategorie] = useState<string>('ALL');
  const [selectedQuartier, setSelectedQuartier] = useState<string>('ALL');
  const [selectedPriorite, setSelectedPriorite] = useState<string>('ALL');

  const filteredReports = reports.filter((r) => {
    if (selectedStatut !== 'ALL' && r.statut !== selectedStatut) return false;
    if (selectedCategorie !== 'ALL' && r.id_categorie !== selectedCategorie) return false;
    if (selectedQuartier !== 'ALL' && r.id_quartier !== selectedQuartier) return false;
    if (selectedPriorite !== 'ALL' && r.niveau_priorite !== selectedPriorite) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchDesc = r.description.toLowerCase().includes(q);
      const matchQuartier = (r.quartier_nom || '').toLowerCase().includes(q);
      const matchRepere = (r.repere || '').toLowerCase().includes(q);
      const matchCat = (r.categorie_nom || '').toLowerCase().includes(q);
      if (!matchDesc && !matchQuartier && !matchRepere && !matchCat) return false;
    }

    return true;
  });

  const statusCounts = {
    ALL: reports.length,
    NOUVEAU: reports.filter(r => r.statut === 'NOUVEAU').length,
    VALIDE: reports.filter(r => r.statut === 'VALIDE').length,
    EN_COURS: reports.filter(r => r.statut === 'EN_COURS').length,
    RESOLU: reports.filter(r => r.statut === 'RESOLU').length,
    REJETE: reports.filter(r => r.statut === 'REJETE').length,
    ROUVERT: reports.filter(r => r.statut === 'ROUVERT').length,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Controls: Search, filters and New Report button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Signalements urbains</h1>
          <p className="text-sm text-slate-500">
            Suivi en temps réel des dépôts de déchets et interventions à Lomé
          </p>
        </div>

        <button
          onClick={onOpenNewReport}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition cursor-pointer"
        >
          <span>Nouveau signalement</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: 'ALL', label: 'Tous', count: statusCounts.ALL },
          { key: 'NOUVEAU', label: 'Nouveaux', count: statusCounts.NOUVEAU },
          { key: 'VALIDE', label: 'Validés', count: statusCounts.VALIDE },
          { key: 'EN_COURS', label: 'En cours', count: statusCounts.EN_COURS },
          { key: 'RESOLU', label: 'Résolus', count: statusCounts.RESOLU },
          { key: 'ROUVERT', label: 'Rouverts', count: statusCounts.ROUVERT },
          { key: 'REJETE', label: 'Rejetés', count: statusCounts.REJETE },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedStatut(tab.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              selectedStatut === tab.key
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedStatut === tab.key ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search and Secondary Filter Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par mot-clé, repère..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-emerald-500"
          />
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategorie}
          onChange={(e) => setSelectedCategorie(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-emerald-500"
        >
          <option value="ALL">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c.id_categorie} value={c.id_categorie}>{c.nom}</option>
          ))}
        </select>

        {/* Quartier Filter */}
        <select
          value={selectedQuartier}
          onChange={(e) => setSelectedQuartier(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-emerald-500"
        >
          <option value="ALL">Tous les quartiers de Lomé</option>
          {quartiers.map((q) => (
            <option key={q.id_quartier} value={q.id_quartier}>{q.nom}</option>
          ))}
        </select>

        {/* Priority Filter */}
        <select
          value={selectedPriorite}
          onChange={(e) => setSelectedPriorite(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-emerald-500"
        >
          <option value="ALL">Toutes les priorités</option>
          <option value="URGENTE">Urgente (SLA 72h)</option>
          <option value="HAUTE">Haute (SLA 7j)</option>
          <option value="NORMALE">Normale (SLA 14j)</option>
          <option value="BASSE">Basse (SLA 30j)</option>
        </select>
      </div>

      {/* Reports Grid */}
      {filteredReports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <AlertTriangle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">Aucun signalement trouvé</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Aucun dossier ne correspond à vos critères de recherche actuels. Essayez de réinitialiser vos filtres.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredReports.map((report) => {
            const statusConfig = STATUS_CONFIG[report.statut];
            const priorityConfig = PRIORITY_CONFIG[report.niveau_priorite];
            const photoSignalement = report.medias.find(m => m.type === 'SIGNALEMENT' && !m.masque)?.url;
            const photoResolution = report.medias.find(m => m.type === 'RESOLUTION' && !m.masque)?.url;

            return (
              <div
                key={report.id_signalement}
                onClick={() => onSelectReport(report)}
                className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col cursor-pointer"
              >
                {/* Photo Header */}
                <div className="relative h-44 bg-slate-100 overflow-hidden">
                  {photoSignalement ? (
                    <img
                      src={photoSignalement}
                      alt={report.categorie_nom}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 p-4 text-center">
                      <ImageIcon className="w-8 h-8 mb-1.5 opacity-60" />
                      <span className="text-xs font-medium">Mode dégradé (Sans photo)</span>
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border backdrop-blur-md shadow-xs ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                      {statusConfig.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border backdrop-blur-md shadow-xs ${priorityConfig.bg} ${priorityConfig.text} ${priorityConfig.border}`}>
                      {priorityConfig.label}
                    </span>
                  </div>

                  {/* Resolution Proof Badge */}
                  {photoResolution && (
                    <div className="absolute bottom-2.5 right-2.5 bg-emerald-600/90 text-white text-[11px] font-bold px-2 py-1 rounded-lg backdrop-blur-md flex items-center gap-1 shadow-sm">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Preuve photo jointe</span>
                    </div>
                  )}

                  {/* AI Badge */}
                  {report.score_ia && report.score_ia >= 0.8 && (
                    <div className="absolute top-2.5 right-2.5 bg-slate-900/80 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md flex items-center gap-1 border border-emerald-500/30">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      <span>IA {(report.score_ia * 100).toFixed(0)}%</span>
                    </div>
                  )}
                </div>

                {/* Card Content */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Category Title */}
                    <h3 className="font-bold text-slate-900 text-sm line-clamp-1 mb-1">
                      {report.categorie_nom || "Dépôt d'ordures"}
                    </h3>

                    {/* Location */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-2 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{report.quartier_nom || 'Lomé'}</span>
                      {report.repere && (
                        <span className="text-slate-400 truncate">({report.repere})</span>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">
                      {report.description}
                    </p>
                  </div>

                  {/* Card Footer: Metadata & author */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatRelativeTime(report.date_signalement)}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {report.nb_confirmations > 0 && (
                        <div className="flex items-center gap-1 text-emerald-700 font-semibold" title="Confirmations 'Moi aussi'">
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>+{report.nb_confirmations}</span>
                        </div>
                      )}

                      {report.auteur_nom && (
                        <div className="flex items-center gap-1 text-slate-600 truncate max-w-[100px]" title={report.auteur_nom}>
                          <User className="w-3 h-3 text-slate-400" />
                          <span className="truncate">{report.auteur_nom}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
