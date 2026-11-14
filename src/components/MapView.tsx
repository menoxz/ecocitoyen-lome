import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  Filter, 
  MapPin, 
  Layers, 
  Eye, 
  Sparkles, 
  CheckCircle2, 
  Plus, 
  AlertTriangle 
} from 'lucide-react';
import { Signalement, Categorie, Quartier, SignalementStatut, PrioriteNiveau } from '../types/index.ts';
import { STATUS_CONFIG, PRIORITY_CONFIG } from '../utils/helpers.ts';
import { COMMUNE_LOME } from '../data/initialData.ts';

interface MapViewProps {
  reports: Signalement[];
  categories: Categorie[];
  quartiers: Quartier[];
  onSelectReport: (report: Signalement) => void;
  onRequestNewReportAtLocation?: (lat: number, lon: number) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  reports,
  categories,
  quartiers,
  onSelectReport,
  onRequestNewReportAtLocation
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Filters
  const [selectedStatut, setSelectedStatut] = useState<string>('ALL');
  const [selectedCategorie, setSelectedCategorie] = useState<string>('ALL');
  const [selectedQuartier, setSelectedQuartier] = useState<string>('ALL');
  const [selectedPriorite, setSelectedPriorite] = useState<string>('ALL');
  const [showFilters, setShowFilters] = useState(false);

  // Filtered reports
  const filteredReports = reports.filter(r => {
    if (selectedStatut !== 'ALL' && r.statut !== selectedStatut) return false;
    if (selectedCategorie !== 'ALL' && r.id_categorie !== selectedCategorie) return false;
    if (selectedQuartier !== 'ALL' && r.id_quartier !== selectedQuartier) return false;
    if (selectedPriorite !== 'ALL' && r.niveau_priorite !== selectedPriorite) return false;
    return true;
  });

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Center on Lomé (Togo)
    const map = L.map(mapContainerRef.current, {
      center: [6.145, 1.222],
      zoom: 13,
      minZoom: 11,
      maxZoom: 18
    });

    // OpenStreetMap standard tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | EcoCitoyen Lomé',
      maxZoom: 19
    }).addTo(map);

    // Pilot Zone Lomé bounding box overlay (lat 6.08 to 6.25, lon 1.12 to 1.35)
    const bounds = L.latLngBounds(
      [COMMUNE_LOME.lat_min, COMMUNE_LOME.lon_min],
      [COMMUNE_LOME.lat_max, COMMUNE_LOME.lon_max]
    );
    L.rectangle(bounds, {
      color: '#059669',
      weight: 1.5,
      fillColor: '#10b981',
      fillOpacity: 0.03,
      dashArray: '4, 4'
    }).addTo(map).bindTooltip("Zone pilote officielle : District Autonome du Grand Lomé", { sticky: true });

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    // Click on map to add report
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      if (onRequestNewReportAtLocation) {
        onRequestNewReportAtLocation(lat, lng);
      }
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers when reports or filters change
  useEffect(() => {
    if (!markersLayerRef.current || !mapInstanceRef.current) return;
    markersLayerRef.current.clearLayers();

    filteredReports.forEach((report) => {
      const statusConfig = STATUS_CONFIG[report.statut];
      const priorityConfig = PRIORITY_CONFIG[report.niveau_priorite];

      // Status marker colors
      const pinColors: Record<SignalementStatut, string> = {
        NOUVEAU: '#3b82f6',
        VALIDE: '#8b5cf6',
        EN_COURS: '#f59e0b',
        RESOLU: '#10b981',
        REJETE: '#ef4444',
        ROUVERT: '#ec4899'
      };

      const color = pinColors[report.statut] || '#64748b';

      // Custom SVG Marker Icon
      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div style="
            background-color: ${color};
            width: 32px;
            height: 32px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            border: 2px solid white;
            cursor: pointer;
          ">
            <div style="
              transform: rotate(45deg);
              color: white;
              font-size: 11px;
              font-weight: bold;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              ${report.statut === 'RESOLU' ? '✓' : report.nb_confirmations > 0 ? report.nb_confirmations : '•'}
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
      });

      const marker = L.marker([report.latitude, report.longitude], { icon: customIcon });

      const firstPhoto = report.medias.find(m => m.type === 'SIGNALEMENT' && !m.masque)?.url;
      const resPhoto = report.medias.find(m => m.type === 'RESOLUTION' && !m.masque)?.url;

      const popupHtml = `
        <div style="font-family: inherit; width: 260px; padding: 2px;">
          ${firstPhoto ? `
            <div style="position: relative; width: 100%; height: 110px; border-radius: 8px; overflow: hidden; margin-bottom: 8px;">
              <img src="${firstPhoto}" style="width: 100%; height: 100%; object-fit: cover;" alt="Signalement" />
              ${resPhoto ? `
                <div style="position: absolute; bottom: 4px; right: 4px; background: #10b981; color: white; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                  ✓ Preuve jointe
                </div>
              ` : ''}
            </div>
          ` : ''}
          <div style="display: flex; gap: 4px; margin-bottom: 6px; flex-wrap: wrap;">
            <span style="background: ${color}20; color: ${color}; border: 1px solid ${color}40; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px;">
              ${statusConfig.label}
            </span>
            <span style="background: ${priorityConfig.bg}; color: ${priorityConfig.text}; border: 1px solid ${priorityConfig.border}; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px;">
              ${priorityConfig.label}
            </span>
            ${report.score_ia && report.score_ia >= 0.8 ? `
              <span style="background: #ecfdf5; color: #047857; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px;">
                IA ${(report.score_ia * 100).toFixed(0)}%
              </span>
            ` : ''}
          </div>
          <div style="font-size: 13px; font-weight: bold; color: #0f172a; margin-bottom: 3px;">
            ${report.categorie_nom || "Dépôt d'ordures"}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
            📍 ${report.quartier_nom || 'Lomé'} ${report.repere ? `• <i>${report.repere}</i>` : ''}
          </div>
          <p style="font-size: 12px; color: #334155; margin: 0 0 10px 0; line-clamp: 2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${report.description}
          </p>
          <button id="btn-details-${report.id_signalement}" style="
            width: 100%;
            background: #059669;
            color: white;
            border: none;
            padding: 6px 12px;
            font-size: 12px;
            font-weight: 600;
            border-radius: 6px;
            cursor: pointer;
          ">
            Consulter le dossier
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-details-${report.id_signalement}`);
        if (btn) {
          btn.onclick = () => onSelectReport(report);
        }
      });

      markersLayerRef.current?.addLayer(marker);
    });
  }, [filteredReports, onSelectReport]);

  return (
    <div className="relative w-full h-[calc(100vh-112px)] bg-slate-100 flex flex-col">
      {/* Top Filter Bar */}
      <div className="absolute top-3 left-3 right-3 sm:right-auto z-[1000] flex flex-col gap-2 max-w-xl">
        <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-2 rounded-2xl shadow-lg border border-slate-200">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
              showFilters ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filtres</span>
            {(selectedStatut !== 'ALL' || selectedCategorie !== 'ALL' || selectedQuartier !== 'ALL' || selectedPriorite !== 'ALL') && (
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>

          {/* Quick status pill filter */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs py-0.5">
            <button
              onClick={() => setSelectedStatut('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer shrink-0 ${
                selectedStatut === 'ALL' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Tous ({reports.length})
            </button>
            <button
              onClick={() => setSelectedStatut('EN_COURS')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer shrink-0 ${
                selectedStatut === 'EN_COURS' ? 'bg-amber-500 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              En cours
            </button>
            <button
              onClick={() => setSelectedStatut('RESOLU')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer shrink-0 ${
                selectedStatut === 'RESOLU' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Résolus
            </button>
            <button
              onClick={() => setSelectedStatut('VALIDE')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer shrink-0 ${
                selectedStatut === 'VALIDE' ? 'bg-purple-600 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Validés
            </button>
          </div>
        </div>

        {/* Detailed Filters Panel */}
        {showFilters && (
          <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-200 text-xs space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Statut</label>
                <select
                  value={selectedStatut}
                  onChange={(e) => setSelectedStatut(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800"
                >
                  <option value="ALL">Tous les statuts</option>
                  <option value="NOUVEAU">Nouveau</option>
                  <option value="VALIDE">Validé</option>
                  <option value="EN_COURS">En cours d'intervention</option>
                  <option value="RESOLU">Résolu</option>
                  <option value="REJETE">Rejeté</option>
                  <option value="ROUVERT">Rouvert</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Catégorie</label>
                <select
                  value={selectedCategorie}
                  onChange={(e) => setSelectedCategorie(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800"
                >
                  <option value="ALL">Toutes les catégories</option>
                  {categories.map((c) => (
                    <option key={c.id_categorie} value={c.id_categorie}>{c.nom}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Quartier (Lomé)</label>
                <select
                  value={selectedQuartier}
                  onChange={(e) => setSelectedQuartier(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800"
                >
                  <option value="ALL">Tous les quartiers</option>
                  {quartiers.map((q) => (
                    <option key={q.id_quartier} value={q.id_quartier}>{q.nom}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Priorité</label>
                <select
                  value={selectedPriorite}
                  onChange={(e) => setSelectedPriorite(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800"
                >
                  <option value="ALL">Toutes les priorités</option>
                  <option value="URGENTE">Urgente (SLA 72h)</option>
                  <option value="HAUTE">Haute (SLA 7j)</option>
                  <option value="NORMALE">Normale (SLA 14j)</option>
                  <option value="BASSE">Basse (SLA 30j)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <span className="text-slate-500 text-[11px]">
                {filteredReports.length} signalement{filteredReports.length > 1 ? 's' : ''} affiché{filteredReports.length > 1 ? 's' : ''}
              </span>
              <button
                onClick={() => {
                  setSelectedStatut('ALL');
                  setSelectedCategorie('ALL');
                  setSelectedQuartier('ALL');
                  setSelectedPriorite('ALL');
                }}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Map Legend (Bottom Left) */}
      <div className="absolute bottom-6 left-3 z-[1000] hidden sm:block bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-slate-200 text-xs">
        <div className="font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-emerald-600" />
          <span>Légende des statuts</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-slate-700">Nouveau</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span className="text-slate-700">Validé</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-700">En cours</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-700">Résolu</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
            <span className="text-slate-700">Rouvert</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-slate-700">Rejeté</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
          💡 Cliquez n'importe où sur la carte pour signaler à cet endroit.
        </div>
      </div>

      {/* Map Target / Instructions Overlay */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />
    </div>
  );
};
