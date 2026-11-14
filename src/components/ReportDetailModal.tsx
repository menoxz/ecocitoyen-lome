import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  Calendar, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  ThumbsUp, 
  ShieldCheck, 
  User, 
  HardHat, 
  ArrowRight, 
  Camera, 
  Upload, 
  EyeOff, 
  Eye, 
  RefreshCw, 
  Loader2,
  FileCheck2,
  Check,
  Ban
} from 'lucide-react';
import { 
  Signalement, 
  Categorie, 
  Equipe, 
  Utilisateur, 
  UserRole, 
  MotifRejet, 
  PrioriteNiveau 
} from '../types/index.ts';
import { STATUS_CONFIG, PRIORITY_CONFIG, MOTIFS_REJET, formatDate, compressImageFile } from '../utils/helpers.ts';

interface ReportDetailModalProps {
  report: Signalement;
  categories: Categorie[];
  equipes: Equipe[];
  users: Utilisateur[];
  currentRole: UserRole;
  currentUser: Utilisateur | null;
  onClose: () => void;
  onRefreshReport: (updated: Signalement) => void;
  onConfirmReport: (reportId: string) => void;
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  report,
  categories,
  equipes,
  users,
  currentRole,
  currentUser,
  onClose,
  onRefreshReport,
  onConfirmReport
}) => {
  // Action Modals State
  const [actionType, setActionType] = useState<
    'VALIDATE' | 'REJECT' | 'ASSIGN' | 'RESOLVE' | 'CANCEL_INTERVENTION' | 'REOPEN' | null
  >(null);

  // Form states for actions
  const [valCategory, setValCategory] = useState(report.id_categorie);
  const [valPriority, setValPriority] = useState<PrioriteNiveau>(report.niveau_priorite);
  const [valComment, setValComment] = useState('');

  const [rejMotif, setRejMotif] = useState<MotifRejet>('Informations insuffisantes');
  const [rejComment, setRejComment] = useState('');

  const [assignEquipe, setAssignEquipe] = useState(equipes[0]?.id_equipe || '');
  const [assignAgent, setAssignAgent] = useState('');
  const [assignComment, setAssignComment] = useState('');

  const [resPhoto, setResPhoto] = useState<{ url: string; mime: string; taille_octets: number } | null>(null);
  const [resComment, setResComment] = useState('');

  const [cancelMotif, setCancelMotif] = useState('');
  const [reopenComment, setReopenComment] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const statusConfig = STATUS_CONFIG[report.statut];
  const priorityConfig = PRIORITY_CONFIG[report.niveau_priorite];

  const photoSignalements = report.medias.filter(m => m.type === 'SIGNALEMENT');
  const photoResolutions = report.medias.filter(m => m.type === 'RESOLUTION');

  // Can current user resolve? (Agent of assigned team or Superviseur/Admin)
  const isAgentOfAssignedTeam = currentRole === 'AGENT' && report.interventions.some(
    i => i.id_equipe === currentUser?.id_equipe && (i.statut_intervention === 'EN_COURS' || i.statut_intervention === 'PLANIFIEE')
  );
  const canResolve = (isAgentOfAssignedTeam || ['SUPERVISEUR', 'ADMIN'].includes(currentRole)) && report.statut === 'EN_COURS';

  // Can current user validate / reject?
  const canValidateOrReject = ['SUPERVISEUR', 'ADMIN'].includes(currentRole) && ['NOUVEAU', 'VALIDE'].includes(report.statut);

  // Can assign?
  const canAssign = ['SUPERVISEUR', 'ADMIN'].includes(currentRole) && ['VALIDE', 'ROUVERT'].includes(report.statut);

  // Can reopen? (Citoyen author within 7 days, or Superviseur/Admin)
  const isAuthor = currentUser && currentUser.id_utilisateur === report.id_utilisateur;
  const canReopen = report.statut === 'RESOLU' && (
    ['SUPERVISEUR', 'ADMIN'].includes(currentRole) || 
    (currentRole === 'CITOYEN' && isAuthor)
  );

  // Resolution Photo Upload & Compression (ENF02)
  const handleResolutionPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const compressed = await compressImageFile(files[0], 1200, 0.82);
      setResPhoto({
        url: compressed.dataUrl,
        mime: 'image/jpeg',
        taille_octets: compressed.size
      });
      setActionError(null);
    } catch (err: any) {
      setActionError(`Erreur photo : ${err.message}`);
    }
  };

  // 1. Submit Validation (T1)
  const handleValidate = async () => {
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/reports/${report.id_signalement}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_categorie: valCategory,
          niveau_priorite: valPriority,
          commentaire: valComment
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onRefreshReport(data.report);
      setActionType(null);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Submit Rejection (T2/T4)
  const handleReject = async () => {
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/reports/${report.id_signalement}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motif_rejet: rejMotif,
          commentaire_rejet: rejComment
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onRefreshReport(data.report);
      setActionType(null);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Submit Assignment (T3/T8)
  const handleAssign = async () => {
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/reports/${report.id_signalement}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_equipe: assignEquipe,
          id_agent: assignAgent || undefined,
          commentaire: assignComment
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onRefreshReport(data.report);
      setActionType(null);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Submit Resolution (T5)
  const handleResolve = async () => {
    // CR8 enforcement: photo mandatory
    if (!resPhoto) {
      setActionError('CR8 : La photographie de résolution est strictement obligatoire.');
      return;
    }
    if (!resComment || resComment.trim().length < 5) {
      setActionError("Un commentaire d'intervention précisant les opérations de nettoyage est obligatoire.");
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/reports/${report.id_signalement}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo_resolution: resPhoto,
          commentaire: resComment
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onRefreshReport(data.report);
      setActionType(null);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 5. Submit Cancel Intervention (T6)
  const handleCancelIntervention = async () => {
    if (!cancelMotif) {
      setActionError("Le motif d'annulation est obligatoire.");
      return;
    }
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/reports/${report.id_signalement}/cancel-intervention`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motif: cancelMotif })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onRefreshReport(data.report);
      setActionType(null);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 6. Submit Reopen (T7)
  const handleReopen = async () => {
    if (!reopenComment) {
      setActionError('Un commentaire motivant la réouverture est obligatoire.');
      return;
    }
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/reports/${report.id_signalement}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentaire: reopenComment })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onRefreshReport(data.report);
      setActionType(null);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 7. Toggle Photo Mask (RG14)
  const handleToggleMaskPhoto = async (id_media: string) => {
    try {
      const res = await fetch(`/api/reports/${report.id_signalement}/mask-photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_media })
      });
      const data = await res.json();
      if (res.ok) {
        const updatedMedias = report.medias.map(m => 
          m.id_media === id_media ? { ...m, masque: data.masque } : m
        );
        onRefreshReport({ ...report, medias: updatedMedias });
      }
    } catch {
      // Ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-200">
        
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
              {statusConfig.label}
            </span>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${priorityConfig.bg} ${priorityConfig.text} ${priorityConfig.border}`}>
              Priorité : {priorityConfig.label} (SLA : {priorityConfig.delayMax})
            </span>
            {report.nb_confirmations > 0 && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>{report.nb_confirmations} confirmation{report.nb_confirmations > 1 ? 's' : ''}</span>
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[75vh] space-y-6">
          
          {/* Photos Showcase (Before & After Resolution Proof) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Preuves photographiques
              </h3>
              {['SUPERVISEUR', 'ADMIN'].includes(currentRole) && (
                <span className="text-[11px] text-slate-400">
                  (Superviseur : masquage des photos en un clic)
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Signalement Photo */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700 block">Photo du signalement</span>
                {photoSignalements.length > 0 ? (
                  photoSignalements.map(p => (
                    <div key={p.id_media} className="relative h-48 rounded-2xl overflow-hidden border border-slate-200 group">
                      {p.masque ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-300 p-4 text-center">
                          <EyeOff className="w-8 h-8 mb-1 text-slate-400" />
                          <span className="text-xs font-medium">Photo masquée par le superviseur</span>
                        </div>
                      ) : (
                        <img src={p.url} alt="Signalement initial" className="w-full h-full object-cover" />
                      )}

                      {['SUPERVISEUR', 'ADMIN'].includes(currentRole) && (
                        <button
                          onClick={() => handleToggleMaskPhoto(p.id_media)}
                          className="absolute top-2 right-2 p-1.5 bg-slate-900/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition cursor-pointer text-xs flex items-center gap-1 backdrop-blur-xs"
                          title="Masquer / Démasquer la photo"
                        >
                          {p.masque ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          <span>{p.masque ? 'Rétablir' : 'Masquer'}</span>
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="h-48 rounded-2xl bg-slate-100 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 text-xs p-4 text-center">
                    <Camera className="w-8 h-8 mb-1 opacity-50" />
                    <span>Mode dégradé activé (Sans photo)</span>
                  </div>
                )}
              </div>

              {/* Resolution Proof Photo */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <span>Preuve de résolution (Après intervention)</span>
                  {photoResolutions.length > 0 && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-bold">
                      Vérifiée
                    </span>
                  )}
                </span>

                {photoResolutions.length > 0 ? (
                  photoResolutions.map(p => (
                    <div key={p.id_media} className="relative h-48 rounded-2xl overflow-hidden border-2 border-emerald-500/50 group shadow-sm">
                      {p.masque ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-300 p-4 text-center">
                          <EyeOff className="w-8 h-8 mb-1 text-slate-400" />
                          <span className="text-xs font-medium">Photo masquée</span>
                        </div>
                      ) : (
                        <img src={p.url} alt="Preuve de résolution" className="w-full h-full object-cover" />
                      )}
                      <div className="absolute bottom-2 left-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                        ✓ Intervention clôturée
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-48 rounded-2xl bg-slate-50 border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 text-xs p-4 text-center">
                    <FileCheck2 className="w-8 h-8 mb-1 opacity-40 text-slate-300" />
                    <span>En attente de la preuve de nettoyage par l'équipe de voirie</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Core Info Details */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
              <div>
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  Catégorie retenue
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-0.5">
                  {report.categorie_nom}
                </h2>
              </div>
              <div className="text-left sm:text-right text-xs text-slate-500">
                <div>Signalé le {formatDate(report.date_signalement)}</div>
                {report.date_resolution && (
                  <div className="text-emerald-700 font-semibold">
                    Résolu le {formatDate(report.date_resolution)}
                  </div>
                )}
              </div>
            </div>

            {/* Location & Repère */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 font-medium block">Localisation :</span>
                <div className="font-semibold text-slate-900 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Quartier {report.quartier_nom || 'Lomé'}</span>
                </div>
                {report.repere && (
                  <p className="text-slate-600 text-[11px] mt-1 pl-5">
                    Repère : <i>{report.repere}</i>
                  </p>
                )}
              </div>

              <div>
                <span className="text-slate-500 font-medium block">Coordonnées GPS :</span>
                <div className="font-mono text-slate-700 text-[11px] mt-0.5">
                  {report.latitude.toFixed(6)}, {report.longitude.toFixed(6)} (±{report.precision_gps_m}m)
                </div>
                {report.auteur_nom && (
                  <div className="text-slate-600 text-[11px] mt-1 flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>Auteur : {report.auteur_nom} {report.auteur_contact ? `(${report.auteur_contact})` : ''}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="pt-2 border-t border-slate-200/70">
              <span className="text-slate-500 font-medium block text-xs mb-1">Description :</span>
              <p className="text-xs text-slate-800 leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
                {report.description}
              </p>
            </div>
          </div>

          {/* AI Traceability & Analysis Box (EF37, RG16) */}
          {report.score_ia && report.score_ia > 0 && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50/70 via-teal-50/50 to-slate-50 border border-emerald-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-emerald-950">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Traçabilité IA (EF37 / RG16)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-[10px] font-bold text-emerald-800">
                    Modèle : {report.modele_version || 'Gemini-4-Hydrogen'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold">
                    Score : {(report.score_ia * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                <div>
                  <span className="font-semibold text-slate-700">Suggestion IA : </span>
                  <span>{report.categorie_ia_nom || report.categorie_nom}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Validation superviseur : </span>
                  <span className={report.ia_desaccord ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold'}>
                    {report.ia_desaccord ? 'Catégorie ajustée manuellement' : 'Accord parfait avec suggestion IA'}
                  </span>
                </div>
              </div>

              {report.justification_ia && (
                <p className="text-[11px] text-slate-600 italic bg-white/70 p-2 rounded-lg border border-emerald-100">
                  "{report.justification_ia}"
                </p>
              )}
            </div>
          )}

          {/* Interventions History */}
          {report.interventions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <HardHat className="w-3.5 h-3.5 text-amber-600" />
                <span>Interventions de l'équipe municipale</span>
              </h4>
              <div className="space-y-2">
                {report.interventions.map((int) => (
                  <div key={int.id_intervention} className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                    <div className="flex items-center justify-between font-semibold text-slate-900 mb-1">
                      <span>{int.equipe_nom}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                        {int.statut_intervention}
                      </span>
                    </div>
                    {int.agent_nom && (
                      <div className="text-[11px] text-slate-600">
                        Agent responsable : <span className="font-medium text-slate-800">{int.agent_nom}</span>
                      </div>
                    )}
                    {int.commentaire && (
                      <p className="text-[11px] text-slate-700 mt-1 italic">
                        "{int.commentaire}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Timeline (HISTORIQUE_STATUT) */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Historique d'audit des statuts (Section 5.1 & EF31)</span>
            </h4>
            <div className="border-l-2 border-slate-200 ml-2 pl-4 space-y-3 text-xs">
              {report.historique.map((h) => (
                <div key={h.id_historique} className="relative">
                  <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white" />
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold text-slate-900">
                      {h.ancien_statut !== 'INITIAL' && `${h.ancien_statut} → `}
                      {h.nouveau_statut}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatDate(h.date_changement)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">Par {h.auteur_nom}</div>
                  {h.commentaire && (
                    <p className="text-[11px] text-slate-700 mt-0.5 italic">
                      "{h.commentaire}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Action Footer: contextual buttons based on RBAC */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          {/* Citizen confirmation button */}
          {currentRole === 'CITOYEN' && !isAuthor && (
            <button
              onClick={() => onConfirmReport(report.id_signalement)}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-300 shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>Confirmer ("Moi aussi")</span>
            </button>
          )}

          {/* Citizen or Supervisor Reopen under 7 days */}
          {canReopen && (
            <button
              onClick={() => setActionType('REOPEN')}
              className="px-3.5 py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Contester / Rouvrir le dossier</span>
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {/* Agent / Supervisor Resolve button */}
            {canResolve && (
              <button
                onClick={() => setActionType('RESOLVE')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Clôturer avec photo de preuve (T5)</span>
              </button>
            )}

            {/* Supervisor / Admin Assign button */}
            {canAssign && (
              <button
                onClick={() => setActionType('ASSIGN')}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <HardHat className="w-4 h-4" />
                <span>Affecter à une équipe (T3)</span>
              </button>
            )}

            {/* Supervisor / Admin Validate & Reject buttons */}
            {canValidateOrReject && (
              <>
                <button
                  onClick={() => setActionType('REJECT')}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5 inline mr-1" />
                  Rejeter (T2)
                </button>
                <button
                  onClick={() => setActionType('VALIDATE')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/30 transition cursor-pointer"
                >
                  <Check className="w-4 h-4 inline mr-1" />
                  Valider le signalement (T1)
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="px-3.5 py-2 bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SUB-MODAL ACTION OVERLAYS (Validation, Rejet, Résolution) */}
        {/* ======================================================== */}

        {/* 1. VALIDATION MODAL */}
        {actionType === 'VALIDATE' && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
              <h3 className="font-bold text-slate-900 text-sm">Validation municipale (T1)</h3>
              {actionError && <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg">{actionError}</div>}
              
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catégorie confirmée</label>
                <select
                  value={valCategory}
                  onChange={(e) => setValCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                >
                  {categories.map((c) => (
                    <option key={c.id_categorie} value={c.id_categorie}>{c.nom}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Priorité d'intervention</label>
                <select
                  value={valPriority}
                  onChange={(e) => setValPriority(e.target.value as PrioriteNiveau)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                >
                  <option value="URGENTE">Urgente (SLA 72h max)</option>
                  <option value="HAUTE">Haute (SLA 7 jours)</option>
                  <option value="NORMALE">Normale (SLA 14 jours)</option>
                  <option value="BASSE">Basse (SLA 30 jours)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Observations du superviseur</label>
                <textarea
                  rows={3}
                  placeholder="Notes de cadrage ou instructions pour la voirie..."
                  value={valComment}
                  onChange={(e) => setValComment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setActionType(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  disabled={submitting}
                  onClick={handleValidate}
                  className="px-4 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                >
                  {submitting ? 'Validation...' : 'Confirmer la validation'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. REJECTION MODAL */}
        {actionType === 'REJECT' && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
              <h3 className="font-bold text-slate-900 text-sm">Rejet du signalement (T2 / T4)</h3>
              {actionError && <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg">{actionError}</div>}
              
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motif officiel de rejet <span className="text-rose-500">*</span>
                </label>
                <select
                  value={rejMotif}
                  onChange={(e) => setRejMotif(e.target.value as MotifRejet)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium"
                >
                  {MOTIFS_REJET.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Commentaire explicatif pour le citoyen <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Justifiez la décision pour informer le citoyen (ex: domaine privé, doublon référence sig-X)..."
                  value={rejComment}
                  onChange={(e) => setRejComment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setActionType(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  disabled={submitting}
                  onClick={handleReject}
                  className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg"
                >
                  {submitting ? 'Rejet en cours...' : 'Rejeter le dossier'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. ASSIGNMENT MODAL */}
        {actionType === 'ASSIGN' && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
              <h3 className="font-bold text-slate-900 text-sm">Affectation à une équipe (T3 / T8)</h3>
              {actionError && <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg">{actionError}</div>}
              
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Équipe d'intervention</label>
                <select
                  value={assignEquipe}
                  onChange={(e) => setAssignEquipe(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium"
                >
                  {equipes.map((e) => (
                    <option key={e.id_equipe} value={e.id_equipe}>
                      {e.nom} ({e.zone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Agent responsable (optionnel)</label>
                <select
                  value={assignAgent}
                  onChange={(e) => setAssignAgent(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                >
                  <option value="">Sélection automatique par le chef d'équipe</option>
                  {users.filter(u => u.role === 'AGENT' && u.id_equipe === assignEquipe).map((u) => (
                    <option key={u.id_utilisateur} value={u.id_utilisateur}>
                      {u.prenom} {u.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Instructions d'intervention</label>
                <textarea
                  rows={3}
                  placeholder="Matériel requis (benne, pelles, EPI), accès par ruelle sablonneuse..."
                  value={assignComment}
                  onChange={(e) => setAssignComment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setActionType(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  disabled={submitting}
                  onClick={handleAssign}
                  className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg"
                >
                  {submitting ? 'Affectation...' : 'Mobiliser l\'équipe'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. RESOLUTION WITH PROOF PHOTO MODAL (CR8 / CR9 / T5) */}
        {actionType === 'RESOLVE' && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Clôture d'intervention avec preuve (T5)</h3>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                <strong>Règle CR8 / CR9 :</strong> Pour garantir la transparence municipale, la prise d'une photographie après nettoyage est <u>obligatoire</u> avant clôture.
              </div>

              {actionError && <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg">{actionError}</div>}

              {/* Photo Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Photo de preuve du nettoyage <span className="text-rose-500">*</span>
                </label>
                {resPhoto ? (
                  <div className="relative h-40 rounded-xl overflow-hidden border-2 border-emerald-500">
                    <img src={resPhoto.url} alt="Preuve" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setResPhoto(null)}
                      className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-lg text-xs"
                    >
                      Changer la photo
                    </button>
                  </div>
                ) : (
                  <label className="h-32 rounded-xl border-2 border-dashed border-emerald-400 hover:border-emerald-600 bg-emerald-50/30 flex flex-col items-center justify-center text-emerald-800 transition cursor-pointer p-4 text-center">
                    <Camera className="w-6 h-6 mb-1 text-emerald-600" />
                    <span className="text-xs font-bold">Prendre la photo 'APRÈS'</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">JPEG, PNG ou WebP compressé</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleResolutionPhotoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Compte-rendu d'intervention <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Volume enlevé (m³), destination des déchets, état du site..."
                  value={resComment}
                  onChange={(e) => setResComment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setActionType(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  disabled={submitting}
                  onClick={handleResolve}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
                >
                  {submitting ? 'Validation...' : 'Valider la résolution'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5. REOPEN MODAL (T7) */}
        {actionType === 'REOPEN' && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
              <h3 className="font-bold text-slate-900 text-sm">Contestation de résolution (T7)</h3>
              <p className="text-xs text-slate-600">
                Vous disposez d'un délai de 7 jours après la résolution pour signaler un travail incomplet ou des déchets oubliés.
              </p>
              {actionError && <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg">{actionError}</div>}
              
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motif de la contestation <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Précisez pourquoi le traitement est jugé insuffisant..."
                  value={reopenComment}
                  onChange={(e) => setReopenComment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setActionType(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  disabled={submitting}
                  onClick={handleReopen}
                  className="px-4 py-2 text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white rounded-lg"
                >
                  {submitting ? 'Envoi...' : 'Rouvrir le signalement'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
