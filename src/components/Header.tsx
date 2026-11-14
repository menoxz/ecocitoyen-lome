import React, { useState } from 'react';
import { 
  Bell, 
  MapPin, 
  PlusCircle, 
  BarChart3, 
  ListFilter, 
  ShieldCheck, 
  CheckCircle2, 
  Users, 
  LogOut, 
  ChevronDown,
  Sparkles,
  Info
} from 'lucide-react';
import { Utilisateur, NotificationItem, UserRole } from '../types/index.ts';

interface HeaderProps {
  currentUser: Utilisateur | null;
  currentRole: UserRole;
  onSwitchRole: (role: UserRole, userId?: string) => void;
  notifications: NotificationItem[];
  onMarkNotificationAsRead: (id: string) => void;
  onMarkAllNotificationsAsRead: () => void;
  activeTab: 'MAP' | 'LIST' | 'STATS' | 'ADMIN' | 'RECETTE';
  setActiveTab: (tab: 'MAP' | 'LIST' | 'STATS' | 'ADMIN' | 'RECETTE') => void;
  onOpenNewReport: () => void;
  onSelectReportId: (id: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  currentRole,
  onSwitchRole,
  notifications,
  onMarkNotificationAsRead,
  onMarkAllNotificationsAsRead,
  activeTab,
  setActiveTab,
  onOpenNewReport,
  onSelectReportId
}) => {
  const [showNotifs, setShowNotifs] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const unreadNotifs = notifications.filter(n => !n.lu);

  const roleLabels: Record<UserRole, { label: string; color: string; desc: string }> = {
    VISITEUR: { label: 'Visiteur public', color: 'bg-slate-100 text-slate-700 border-slate-300', desc: 'Consultation carte publique' },
    CITOYEN: { label: 'Citoyen', color: 'bg-emerald-50 text-emerald-800 border-emerald-300', desc: 'Signalement & suivi personnel' },
    AGENT: { label: 'Agent municipal', color: 'bg-amber-50 text-amber-800 border-amber-300', desc: 'Intervention de terrain & clôture' },
    SUPERVISEUR: { label: 'Superviseur', color: 'bg-purple-50 text-purple-800 border-purple-300', desc: 'Tri, validation, priorité & affectation' },
    ADMIN: { label: 'Administrateur', color: 'bg-blue-50 text-blue-800 border-blue-300', desc: 'Gestion des rôles & audit global' }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      {/* Top Banner: Quick Role Switcher for instant evaluator testing */}
      <div className="bg-slate-900 text-slate-100 px-3 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-emerald-400">EcoCitoyen v2.0</span>
          <span className="hidden sm:inline text-slate-400">| Déploiement : Lomé, Togo</span>
        </div>

        {/* Fast Switch Profile Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
          <span className="text-slate-400 text-[11px] mr-1 hidden md:inline">Tester en tant que :</span>
          <button
            onClick={() => onSwitchRole('CITOYEN', 'usr-citoyen-1')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
              currentRole === 'CITOYEN' 
                ? 'bg-emerald-600 text-white shadow-xs font-semibold' 
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="Citoyen Koffi Mensah"
          >
            Citoyen (Koffi)
          </button>
          <button
            onClick={() => onSwitchRole('AGENT', 'usr-agent-1')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
              currentRole === 'AGENT' 
                ? 'bg-amber-600 text-white shadow-xs font-semibold' 
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="Agent Amivi Dossou (Équipe Salubrité Tokoin)"
          >
            Agent (Amivi)
          </button>
          <button
            onClick={() => onSwitchRole('SUPERVISEUR', 'usr-superviseur-1')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
              currentRole === 'SUPERVISEUR' 
                ? 'bg-purple-600 text-white shadow-xs font-semibold' 
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="Superviseur Kodjo Agbeko"
          >
            Superviseur (Kodjo)
          </button>
          <button
            onClick={() => onSwitchRole('ADMIN', 'usr-admin-1')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
              currentRole === 'ADMIN' 
                ? 'bg-blue-600 text-white shadow-xs font-semibold' 
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="Directeur Municipal Admin"
          >
            Admin
          </button>
          <button
            onClick={() => onSwitchRole('VISITEUR')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
              currentRole === 'VISITEUR' 
                ? 'bg-slate-600 text-white shadow-xs font-semibold' 
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
            title="Visiteur public non connecté"
          >
            Visiteur
          </button>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Info */}
          <div className="flex items-center gap-3">
            <div 
              onClick={() => setActiveTab('MAP')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-lg text-slate-900 tracking-tight">EcoCitoyen</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Lomé
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  Salubrité urbaine assistée par IA
                </p>
              </div>
            </div>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 ml-6 border-l border-slate-200 pl-4">
              <button
                onClick={() => setActiveTab('MAP')}
                className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'MAP'
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <MapPin className="w-4 h-4" />
                Carte interactive
              </button>
              <button
                onClick={() => setActiveTab('LIST')}
                className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'LIST'
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <ListFilter className="w-4 h-4" />
                Signalements
              </button>
              <button
                onClick={() => setActiveTab('STATS')}
                className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'STATS'
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Tableau de bord
              </button>

              {currentRole === 'ADMIN' && (
                <button
                  onClick={() => setActiveTab('ADMIN')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'ADMIN'
                      ? 'bg-blue-50 text-blue-800'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Administration
                </button>
              )}

              <button
                onClick={() => setActiveTab('RECETTE')}
                className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'RECETTE'
                    ? 'bg-purple-50 text-purple-800 font-semibold'
                    : 'text-purple-700 hover:bg-purple-50'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                Recette (14 critères)
              </button>
            </nav>
          </div>

          {/* Right Action Area */}
          <div className="flex items-center gap-2.5">
            {/* Primary Action: Signaler un déchet */}
            <button
              onClick={onOpenNewReport}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-emerald-600/30 flex items-center gap-1.5 transition hover:shadow-md cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Nouveau signalement</span>
              <span className="sm:hidden">Signaler</span>
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifs(!showNotifs)}
                className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifs.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs">
                    {unreadNotifs.length}
                  </span>
                )}
              </button>

              {/* Notification Popover */}
              {showNotifs && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-800">
                      Notifications ({unreadNotifs.length} non lues)
                    </span>
                    {unreadNotifs.length > 0 && (
                      <button
                        onClick={onMarkAllNotificationsAsRead}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
                      >
                        Tout marquer comme lu
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-sm">
                        Aucune notification pour le moment
                      </div>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div
                          key={n.id_notification}
                          onClick={() => {
                            onMarkNotificationAsRead(n.id_notification);
                            if (n.id_signalement) {
                              onSelectReportId(n.id_signalement);
                              setShowNotifs(false);
                            }
                          }}
                          className={`p-3 text-left hover:bg-slate-50 transition cursor-pointer ${
                            !n.lu ? 'bg-emerald-50/50' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-medium text-xs text-slate-900">{n.titre}</span>
                            {!n.lu && (
                              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">{n.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1.5 block">
                            {new Date(n.date_creation).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Pill */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className={`flex items-center gap-2 pl-2.5 pr-2 py-1.5 rounded-xl border text-xs font-medium transition cursor-pointer ${roleLabels[currentRole].color}`}
              >
                <div className="text-left">
                  <div className="font-semibold text-slate-900 truncate max-w-[110px]">
                    {currentUser ? `${currentUser.prenom} ${currentUser.nom}` : 'Visiteur'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    {roleLabels[currentRole].label}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Role switch modal dropdown */}
              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-800">Profil actif</p>
                    <p className="text-[11px] text-slate-500">
                      Changer de profil permet de tester les droits (RBAC) en direct
                    </p>
                  </div>
                  <div className="p-1 space-y-1">
                    <button
                      onClick={() => {
                        onSwitchRole('CITOYEN', 'usr-citoyen-1');
                        setShowRoleMenu(false);
                      }}
                      className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition cursor-pointer ${
                        currentRole === 'CITOYEN' ? 'bg-emerald-50 text-emerald-900 font-semibold' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div>Koffi Mensah (Citoyen)</div>
                        <div className="text-[10px] text-slate-400">Signalements & confirmation 'Moi aussi'</div>
                      </div>
                      {currentRole === 'CITOYEN' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </button>

                    <button
                      onClick={() => {
                        onSwitchRole('AGENT', 'usr-agent-1');
                        setShowRoleMenu(false);
                      }}
                      className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition cursor-pointer ${
                        currentRole === 'AGENT' ? 'bg-amber-50 text-amber-900 font-semibold' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div>Amivi Dossou (Agent)</div>
                        <div className="text-[10px] text-slate-400">Équipe Salubrité Tokoin & Bè</div>
                      </div>
                      {currentRole === 'AGENT' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                    </button>

                    <button
                      onClick={() => {
                        onSwitchRole('SUPERVISEUR', 'usr-superviseur-1');
                        setShowRoleMenu(false);
                      }}
                      className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition cursor-pointer ${
                        currentRole === 'SUPERVISEUR' ? 'bg-purple-50 text-purple-900 font-semibold' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div>Kodjo Agbeko (Superviseur)</div>
                        <div className="text-[10px] text-slate-400">Validation, priorisation, affectation</div>
                      </div>
                      {currentRole === 'SUPERVISEUR' && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
                    </button>

                    <button
                      onClick={() => {
                        onSwitchRole('ADMIN', 'usr-admin-1');
                        setShowRoleMenu(false);
                      }}
                      className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition cursor-pointer ${
                        currentRole === 'ADMIN' ? 'bg-blue-50 text-blue-900 font-semibold' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div>Directeur Municipal (Admin)</div>
                        <div className="text-[10px] text-slate-400">Gestion comptes internes & audit</div>
                      </div>
                      {currentRole === 'ADMIN' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </button>

                    <button
                      onClick={() => {
                        onSwitchRole('VISITEUR');
                        setShowRoleMenu(false);
                      }}
                      className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition cursor-pointer ${
                        currentRole === 'VISITEUR' ? 'bg-slate-100 text-slate-900 font-semibold' : 'hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <div>
                        <div>Visiteur (Déconnecté)</div>
                        <div className="text-[10px] text-slate-400">Carte publique sans identité auteur</div>
                      </div>
                      {currentRole === 'VISITEUR' && <CheckCircle2 className="w-4 h-4 text-slate-600" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="flex md:hidden border-t border-slate-100 py-2 gap-1 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('MAP')}
            className={`px-3 py-1.5 rounded-lg font-medium shrink-0 ${
              activeTab === 'MAP' ? 'bg-emerald-600 text-white' : 'text-slate-600 bg-slate-50'
            }`}
          >
            Carte
          </button>
          <button
            onClick={() => setActiveTab('LIST')}
            className={`px-3 py-1.5 rounded-lg font-medium shrink-0 ${
              activeTab === 'LIST' ? 'bg-emerald-600 text-white' : 'text-slate-600 bg-slate-50'
            }`}
          >
            Signalements
          </button>
          <button
            onClick={() => setActiveTab('STATS')}
            className={`px-3 py-1.5 rounded-lg font-medium shrink-0 ${
              activeTab === 'STATS' ? 'bg-emerald-600 text-white' : 'text-slate-600 bg-slate-50'
            }`}
          >
            Tableau de bord
          </button>
          {currentRole === 'ADMIN' && (
            <button
              onClick={() => setActiveTab('ADMIN')}
              className={`px-3 py-1.5 rounded-lg font-medium shrink-0 ${
                activeTab === 'ADMIN' ? 'bg-blue-600 text-white' : 'text-slate-600 bg-slate-50'
              }`}
            >
              Admin
            </button>
          )}
          <button
            onClick={() => setActiveTab('RECETTE')}
            className={`px-3 py-1.5 rounded-lg font-medium shrink-0 ${
              activeTab === 'RECETTE' ? 'bg-purple-600 text-white' : 'text-purple-700 bg-purple-50'
            }`}
          >
            Recette (14 tests)
          </button>
        </div>
      </div>
    </header>
  );
};
