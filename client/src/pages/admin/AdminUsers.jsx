import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/api';
import {
  Users,
  Search,
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  Ban,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await adminService.getUsers({
        search: search.trim() || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined
      });
      setUsers(res.data.data.users || []);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleToggleBlock = async (user) => {
    const action = user.isBlocked ? 'unblock' : 'block';
    if (!window.confirm(`Are you sure you want to ${action} ${user.name}?`)) {
      return;
    }

    try {
      const res = await adminService.toggleBlockUser(user._id);
      toast.success(res.data.message);
      setUsers((prev) =>
        prev.map((u) =>
          u._id === user._id ? { ...u, isBlocked: !u.isBlocked } : u
        )
      );
    } catch (err) {
      toast.error(err.message || `Failed to ${action} user`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back button */}
      <Link
        to="/admin/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 transition-colors"
      >
        <ArrowLeft size={16} />
        <span>Back to Admin Overview</span>
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            User Account Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review registered platform members, inspect profiles, and suspend suspicious accounts.
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-emerald-600 shadow-xs"
            />
          </form>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl bg-white border border-slate-200 text-slate-700 shadow-xs focus:outline-none"
          >
            <option value="all">All Roles</option>
            <option value="farmer">Farmers</option>
            <option value="buyer">Buyers</option>
            <option value="admin">Admins</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading user records...</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No users match your criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="py-4 px-6">User</th>
                  <th className="py-4 px-6">Role</th>
                  <th className="py-4 px-6">Contact</th>
                  <th className="py-4 px-6">Location</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            u.avatar ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              u.name
                            )}&background=2E7D32&color=fff`
                          }
                          alt=""
                          className="w-9 h-9 rounded-xl object-cover"
                        />
                        <div>
                          <span className="font-bold text-slate-900 block">{u.name}</span>
                          <span className="text-[11px] text-slate-400">{u.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : u.role === 'farmer'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    <td className="py-4 px-6 font-medium text-slate-700">
                      {u.phone || 'N/A'}
                    </td>

                    <td className="py-4 px-6 text-slate-600">
                      {[u.location?.district, u.location?.state].filter(Boolean).join(', ') ||
                        'Not specified'}
                    </td>

                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          u.isBlocked
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {u.isBlocked ? (
                          <>
                            <Ban size={12} />
                            <span>Suspended</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle size={12} />
                            <span>Active</span>
                          </>
                        )}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right">
                      {u.role !== 'admin' && (
                        <button
                          type="button"
                          onClick={() => handleToggleBlock(u)}
                          className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                            u.isBlocked
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                          }`}
                        >
                          {u.isBlocked ? 'Unblock' : 'Block User'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
