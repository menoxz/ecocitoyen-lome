import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  UserCheck, 
  UserX, 
  CheckCircle2, 
  AlertCircle, 
  Key, 
  Building2, 
  Loader2 
} from 'lucide-react';
import { Utilisateur, UserRole, Equipe } from '../types/index.ts';
import { formatDate } from '../utils/helpers.ts';

interface AdminViewProps {
  users: Utilisateur[];
  equipes: Equipe[];
  onRefreshUsers: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ users, equipes, onRefreshUsers }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [role, setRole] = useState<UserRole>('AGENT');
  const [idEquipe, setIdEquipe] = useState<string>(equipes[0]?.id_equipe || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom,
          prenom,
          email,
          telephone,
          role,
          id_equipe: role === 'AGENT' ? idEquipe : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccessMsg(`Compte interne créé pour ${prenom} ${nom} avec mot de passe temporaire.`);
      setShowCreateModal(false);
      setNom('');
      setPrenom('');
      setEmail('');
      setTelephone('');
      onRefreshUsers();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (user: Utilisateur) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id_utilisateur}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actif: !user.actif })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error);
        return;
      }
      onRefreshUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleChangeRole = async (user: Utilisateur, newRole: UserRole) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id_utilisateur}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error);
        return;
      }
      onRefreshUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Administration des comptes et rôles</h1>
          <p className="text-sm text-slate-500">
            Gestion des agents municipaux, superviseurs et autorisations d'accès (RBAC)
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Créer un compte interne (EF04)</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-4">Utilisateur</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Rôle</th>
                <th className="py-3 px-4">Équipe / Zone</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4">Création</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const equipe = equipes.find(e => e.id_equipe === u.id_equipe);

                return (
                  <tr key={u.id_utilisateur} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{u.prenom} {u.nom}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{u.id_utilisateur}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-slate-800">{u.email}</div>
                      {u.telephone && <div className="text-slate-400 text-[11px]">{u.telephone}</div>}
                    </td>

                    <td className="py-3 px-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleChangeRole(u, e.target.value as UserRole)}
                        className="bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs font-semibold"
                      >
                        <option value="CITOYEN">CITOYEN</option>
                        <option value="AGENT">AGENT</option>
                        <option value="SUPERVISEUR">SUPERVISEUR</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {equipe ? (
                        <div>
                          <div className="font-medium text-slate-800">{equipe.nom}</div>
                          <div className="text-[10px] text-slate-400">{equipe.zone}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        u.actif ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}>
                        {u.actif ? 'Actif' : 'Désactivé'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {formatDate(u.date_creation)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggleUserStatus(u)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
                          u.actif
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {u.actif ? 'Désactiver' : 'Réactiver'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Internal User */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <h3 className="font-bold text-slate-900 text-base">Création d'un compte interne (Agent / Superviseur)</h3>
            <p className="text-xs text-slate-500">
              Conformément à la règle RB03, les comptes internes sont créés par l'administrateur avec un mot de passe temporaire.
            </p>

            {errorMsg && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Prénom</label>
                  <input
                    type="text"
                    required
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nom</label>
                  <input
                    type="text"
                    required
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Email municipal</label>
                <input
                  type="email"
                  required
                  placeholder="nom@mairie-lome.tg"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Téléphone (+228)</label>
                <input
                  type="text"
                  placeholder="+228 90 00 00 00"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Rôle attribué</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold"
                >
                  <option value="AGENT">AGENT MUNICIPAL</option>
                  <option value="SUPERVISEUR">SUPERVISEUR MUNICIPAL</option>
                  <option value="ADMIN">ADMINISTRATEUR</option>
                </select>
              </div>

              {role === 'AGENT' && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Équipe de rattachement</label>
                  <select
                    value={idEquipe}
                    onChange={(e) => setIdEquipe(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                  >
                    {equipes.map((e) => (
                      <option key={e.id_equipe} value={e.id_equipe}>
                        {e.nom} ({e.zone})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                >
                  {loading ? 'Création...' : 'Créer le compte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
