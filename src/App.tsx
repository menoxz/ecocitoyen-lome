import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { MapView } from './components/MapView.tsx';
import { ReportsListView } from './components/ReportsListView.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { AdminView } from './components/AdminView.tsx';
import { RecetteCheckerView } from './components/RecetteCheckerView.tsx';
import { NewReportModal } from './components/NewReportModal.tsx';
import { ReportDetailModal } from './components/ReportDetailModal.tsx';
import { 
  Signalement, 
  Categorie, 
  Quartier, 
  Equipe, 
  Utilisateur, 
  NotificationItem, 
  UserRole 
} from './types/index.ts';

export default function App() {
  const [currentUser, setCurrentUser] = useState<Utilisateur | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>('CITOYEN');
  const [allUsers, setAllUsers] = useState<Utilisateur[]>([]);

  const [categories, setCategories] = useState<Categorie[]>([]);
  const [quartiers, setQuartiers] = useState<Quartier[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [reports, setReports] = useState<Signalement[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Navigation
  const [activeTab, setActiveTab] = useState<'MAP' | 'LIST' | 'STATS' | 'ADMIN' | 'RECETTE'>('MAP');

  // Modals
  const [isNewReportModalOpen, setIsNewReportModalOpen] = useState(false);
  const [newReportLocation, setNewReportLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedReport, setSelectedReport] = useState<Signalement | null>(null);

  // Initial Data Fetch
  const loadInitialData = async () => {
    try {
      // 1. Current user
      const userRes = await fetch('/api/auth/me');
      const userData = await userRes.json();
      if (userData.user) {
        setCurrentUser(userData.user);
        setCurrentRole(userData.user.role);
      } else {
        setCurrentRole('VISITEUR');
      }
      if (userData.availableUsers) {
        setAllUsers(userData.availableUsers);
      }

      // 2. Reference data
      const [catsRes, quartsRes, eqsRes] = await Promise.all([
        fetch('/api/ref/categories'),
        fetch('/api/ref/quartiers'),
        fetch('/api/ref/equipes')
      ]);

      const [cats, quarts, eqs] = await Promise.all([
        catsRes.json(),
        quartsRes.json(),
        eqsRes.json()
      ]);

      setCategories(cats);
      setQuartiers(quarts);
      setEquipes(eqs);

      // 3. Reports
      fetchReports();

      // 4. Notifications
      fetchNotifications();
    } catch (err) {
      console.error('Error initializing applet:', err);
    }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/reports');
      const data = await res.json();
      if (Array.isArray(data)) {
        setReports(data);
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (Array.isArray(data)) {
        setNotifications(data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Fast switch role handler
  const handleSwitchRole = async (role: UserRole, userId?: string) => {
    try {
      const res = await fetch('/api/auth/switch-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, userId })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        setCurrentRole(role);
        // Refresh reports and notifications for new role's permissions
        fetchReports();
        fetchNotifications();
      }
    } catch (err) {
      console.error('Switch role failed:', err);
    }
  };

  // Mark single notification read
  const handleMarkNotificationAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n.id_notification === id ? { ...n, lu: true } : n));
    } catch {
      // Ignore
    }
  };

  // Mark all notifications read
  const handleMarkAllNotificationsAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'PATCH' });
      setNotifications(prev => prev.map(n => ({ ...n, lu: true })));
    } catch {
      // Ignore
    }
  };

  // Select report by ID (e.g. from notification click)
  const handleSelectReportById = async (id: string) => {
    try {
      const res = await fetch(`/api/reports/${id}`);
      const data = await res.json();
      if (res.ok) {
        setSelectedReport(data);
      }
    } catch {
      // Ignore
    }
  };

  // Confirm report "Moi aussi"
  const handleConfirmReport = async (reportId: string) => {
    try {
      const res = await fetch(`/api/reports/${reportId}/confirm`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error);
        return;
      }
      // Update local report confirmations
      setReports(prev => prev.map(r => 
        r.id_signalement === reportId ? { ...r, nb_confirmations: data.nb_confirmations } : r
      ));
      if (selectedReport && selectedReport.id_signalement === reportId) {
        setSelectedReport(prev => prev ? { ...prev, nb_confirmations: data.nb_confirmations } : null);
      }
      alert('Merci ! Votre confirmation ("Moi aussi") a été prise en compte et renforce la priorité du dossier.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Refresh reports after validation / action
  const handleRefreshReport = (updated: Signalement) => {
    setReports(prev => prev.map(r => r.id_signalement === updated.id_signalement ? updated : r));
    setSelectedReport(updated);
    fetchNotifications();
  };

  // Click on map to report at coordinates
  const handleRequestNewReportAtLocation = (lat: number, lon: number) => {
    setNewReportLocation({ lat, lon });
    setIsNewReportModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 font-sans">
      {/* Top Navigation & Fast Role Switcher */}
      <Header
        currentUser={currentUser}
        currentRole={currentRole}
        onSwitchRole={handleSwitchRole}
        notifications={notifications}
        onMarkNotificationAsRead={handleMarkNotificationAsRead}
        onMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewReport={() => {
          setNewReportLocation(null);
          setIsNewReportModalOpen(true);
        }}
        onSelectReportId={handleSelectReportById}
      />

      {/* Main Tab Content */}
      <main className="flex-1 flex flex-col">
        {activeTab === 'MAP' && (
          <MapView
            reports={reports}
            categories={categories}
            quartiers={quartiers}
            onSelectReport={(r) => setSelectedReport(r)}
            onRequestNewReportAtLocation={handleRequestNewReportAtLocation}
          />
        )}

        {activeTab === 'LIST' && (
          <ReportsListView
            reports={reports}
            categories={categories}
            quartiers={quartiers}
            currentRole={currentRole}
            onSelectReport={(r) => setSelectedReport(r)}
            onOpenNewReport={() => {
              setNewReportLocation(null);
              setIsNewReportModalOpen(true);
            }}
          />
        )}

        {activeTab === 'STATS' && (
          <DashboardView />
        )}

        {activeTab === 'ADMIN' && (
          <AdminView
            users={allUsers}
            equipes={equipes}
            onRefreshUsers={loadInitialData}
          />
        )}

        {activeTab === 'RECETTE' && (
          <RecetteCheckerView
            reports={reports}
            currentRole={currentRole}
            onOpenReportById={handleSelectReportById}
          />
        )}
      </main>

      {/* New Report Modal Wizard (3 steps) */}
      {isNewReportModalOpen && (
        <NewReportModal
          categories={categories}
          quartiers={quartiers}
          initialLat={newReportLocation?.lat}
          initialLon={newReportLocation?.lon}
          onClose={() => {
            setIsNewReportModalOpen(false);
            setNewReportLocation(null);
          }}
          onSubmitSuccess={(newRep) => {
            setReports(prev => [newRep, ...prev]);
            setSelectedReport(newRep);
            fetchNotifications();
          }}
          onConfirmExistingReport={(existingId) => {
            setIsNewReportModalOpen(false);
            handleConfirmReport(existingId);
          }}
        />
      )}

      {/* Report Detail Modal with Contextual Actions */}
      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          categories={categories}
          equipes={equipes}
          users={allUsers}
          currentRole={currentRole}
          currentUser={currentUser}
          onClose={() => setSelectedReport(null)}
          onRefreshReport={handleRefreshReport}
          onConfirmReport={handleConfirmReport}
        />
      )}
    </div>
  );
}
