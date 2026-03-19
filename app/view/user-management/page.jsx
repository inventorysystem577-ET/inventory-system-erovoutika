"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Pencil, Search, Trash2, Users, XCircle } from "lucide-react";
import AuthGuard from "../../components/AuthGuard";
import Sidebar from "../../components/Sidebar";
import TopNavbar from "../../components/TopNavbar";
import { useAuth } from "../../hook/useAuth";
import { isAdminRole } from "../../utils/roleHelper";
import { fetchAllUsers, handleDeleteUser, handleUpdateUser } from "../../controller/userManagementController";
import { handleApproveRequest } from "../../controller/accessRequestController";

const ROLES = ["admin", "staff"]; // ← adjust to your actual roles

const STATUS_TABS = [
  { key: "approved", label: "Approved" },
  { key: "pending",  label: "Pending"  },
  { key: "denied",   label: "Denied"   },
];

export default function UserManagementPage() {
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [darkMode, setDarkMode]         = useState(false);
  const [users, setUsers]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [feedback, setFeedback]         = useState({ type: "", message: "" });
  const [statusTab, setStatusTab]       = useState("approved");
  const [search, setSearch]             = useState("");
  const [roleFilter, setRoleFilter]     = useState("");

  // Edit modal
  const [editingUser, setEditingUser]   = useState(null);
  const [editForm, setEditForm]         = useState({ name: "", role: "" });
  const [editPending, setEditPending]   = useState(false);

  // Delete confirm
  const [deletingUser, setDeletingUser] = useState(null);
  const [deletePending, setDeletePending] = useState(false);

  const { role, loading: authLoading, userEmail } = useAuth();
  const router  = useRouter();
  const isAdmin = isAdminRole(role);

  useEffect(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved !== null) setDarkMode(saved === "true");
  }, []);

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace("/view/dashboard");
  }, [authLoading, isAdmin, router]);

  useEffect(() => {
    if (feedback.message) {
      const t = setTimeout(() => setFeedback({ type: "", message: "" }), 4000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllUsers({
        role:   roleFilter || null,
        search: search.trim() || null,
        status: statusTab,
      });
      setUsers(data);
    } catch (err) {
      setFeedback({ type: "error", message: err.message });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [statusTab, roleFilter, search]);

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin, loadUsers]);

  // ── Approve / Deny (pending tab) ──────────────────────────
  const approveUser = async (user) => {
    try {
      await handleApproveRequest(user.id, "approve", userEmail);
      setFeedback({ type: "success", message: `${user.name} approved successfully.` });
      await loadUsers();
    } catch (err) {
      setFeedback({ type: "error", message: err.message });
    }
  };

  const denyUser = async (user) => {
    try {
      await handleApproveRequest(user.id, "reject", userEmail);
      setFeedback({ type: "success", message: `${user.name} has been denied.` });
      await loadUsers();
    } catch (err) {
      setFeedback({ type: "error", message: err.message });
    }
  };

  // ── Edit (approved tab) ───────────────────────────────────
  const openEdit = (user) => {
    setEditingUser(user);
    setEditForm({ name: user.name, role: user.role });
  };
  const closeEdit = () => { setEditingUser(null); setEditForm({ name: "", role: "" }); };

  const submitEdit = async () => {
    if (!editForm.name.trim() || !editForm.role) return;
    setEditPending(true);
    try {
      await handleUpdateUser(editingUser.id, { name: editForm.name.trim(), role: editForm.role });
      setFeedback({ type: "success", message: `${editForm.name} updated successfully.` });
      closeEdit();
      await loadUsers();
    } catch (err) {
      setFeedback({ type: "error", message: err.message });
    } finally {
      setEditPending(false);
    }
  };

  // ── Delete (approved tab) ─────────────────────────────────
  const openDelete  = (user) => setDeletingUser(user);
  const closeDelete = () => setDeletingUser(null);

  const confirmDelete = async () => {
    setDeletePending(true);
    try {
      await handleDeleteUser(deletingUser.id);
      setFeedback({ type: "success", message: `${deletingUser.name} has been deleted.` });
      closeDelete();
      await loadUsers();
    } catch (err) {
      setFeedback({ type: "error", message: err.message });
    } finally {
      setDeletePending(false);
    }
  };

  // ── Style helpers (identical to user-approvals/page.jsx) ──
  const cardClass = (extra = "") =>
    `rounded-xl border ${extra} ${
      darkMode ? "bg-[#1F2937] border-[#374151]" : "bg-white border-[#E5E7EB]"
    }`;
  const subtextClass = darkMode ? "text-gray-400" : "text-gray-600";
  const inputClass = `w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] ${
    darkMode
      ? "bg-[#111827] border-[#374151] text-white placeholder-gray-500"
      : "bg-white border-[#E5E7EB] text-gray-900 placeholder-gray-400"
  }`;
  const roleBadge = (r) => {
    const map = { admin: "bg-purple-100 text-purple-700", manager: "bg-blue-100 text-blue-700", staff: "bg-emerald-100 text-emerald-700" };
    return `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[r] || "bg-gray-100 text-gray-600"}`;
  };

  if (!isAdmin) {
    return (
      <AuthGuard darkMode={darkMode}>
        <div className={`min-h-screen flex items-center justify-center ${darkMode ? "bg-[#111827] text-white" : "bg-[#F3F4F6] text-black"}`}>
          <p className="text-sm">Redirecting...</p>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard darkMode={darkMode}>
      <div className={`min-h-screen transition-colors duration-300 ${darkMode ? "bg-[#111827] text-white" : "bg-[#F3F4F6] text-black"}`}>
        <TopNavbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} darkMode={darkMode} setDarkMode={setDarkMode} />
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} darkMode={darkMode} />

        <div className={`transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "ml-0"} pt-16`}>
          <div className="p-4 sm:p-6 lg:p-8">

            {/* Header */}
            <div className={`${cardClass()} p-6 mb-6`}>
              <div className="flex items-center gap-3 mb-1">
                <Users className="w-6 h-6 text-[#2563EB]" />
                <h1 className="text-2xl font-bold">User Management</h1>
              </div>
              <p className={`text-sm ${subtextClass}`}>
                Manage all users — approve requests, edit profiles, and remove accounts.
              </p>
            </div>

            {/* Feedback */}
            {feedback.message && (
              <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
                feedback.type === "success"
                  ? darkMode ? "bg-green-900/30 text-green-400 border border-green-800" : "bg-green-50 text-green-700 border border-green-200"
                  : darkMode ? "bg-red-900/30 text-red-400 border border-red-800"       : "bg-red-50 text-red-700 border border-red-200"
              }`}>
                {feedback.message}
              </div>
            )}

            {/* Status tabs + filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              {/* Tab switcher */}
              <div className={`flex rounded-lg border overflow-hidden ${darkMode ? "border-[#374151]" : "border-[#E5E7EB]"}`}>
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => { setStatusTab(tab.key); setSearch(""); setRoleFilter(""); }}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      statusTab === tab.key
                        ? "bg-[#2563EB] text-white"
                        : darkMode
                          ? "bg-[#1F2937] text-gray-400 hover:text-white"
                          : "bg-white text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search + role filter */}
              <div className="flex gap-2 flex-1 sm:max-w-sm">
                <div className="relative flex-1">
                  <Search className={`absolute left-3 top-2.5 w-4 h-4 ${subtextClass}`} />
                  <input
                    type="text"
                    placeholder="Search name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={`${inputClass} pl-9`}
                  />
                </div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className={`${inputClass} w-auto`}
                >
                  <option value="">All Roles</option>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table */}
            <div className={`${cardClass()} overflow-hidden`}>
              {loading ? (
                <div className="p-8 text-center">
                  <div className="inline-block w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
                  <p className={`mt-3 text-sm ${subtextClass}`}>Loading users...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="p-8 text-center">
                  <p className={`text-sm ${subtextClass}`}>No users found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={darkMode ? "bg-[#374151]/50" : "bg-[#F9FAFB]"}>
                        <th className={`px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider ${subtextClass}`}>Name</th>
                        <th className={`px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider ${subtextClass}`}>Email</th>
                        <th className={`px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider ${subtextClass}`}>Role</th>
                        {statusTab === "approved" && (
                          <th className={`px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider ${subtextClass}`}>Approved At</th>
                        )}
                        {statusTab === "pending" && (
                          <th className={`px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider ${subtextClass}`}>Reason</th>
                        )}
                        {statusTab === "denied" && (
                          <th className={`px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider ${subtextClass}`}>Denied At</th>
                        )}
                        <th className={`px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider ${subtextClass}`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {users.map((user) => (
                        <tr key={user.id} className={darkMode ? "hover:bg-[#374151]/30" : "hover:bg-[#F9FAFB]"}>
                          <td className="px-4 py-3 font-medium">{user.name}</td>
                          <td className={`px-4 py-3 ${subtextClass}`}>{user.email}</td>
                          <td className="px-4 py-3">
                            <span className={roleBadge(user.role)}>{user.role}</span>
                          </td>

                          {/* Context-sensitive 4th column */}
                          {statusTab === "approved" && (
                            <td className={`px-4 py-3 ${subtextClass}`}>
                              {user.approved_at ? new Date(user.approved_at).toLocaleDateString() : "—"}
                            </td>
                          )}
                          {statusTab === "pending" && (
                            <td className={`px-4 py-3 ${subtextClass}`}>{user.reason || "—"}</td>
                          )}
                          {statusTab === "denied" && (
                            <td className={`px-4 py-3 ${subtextClass}`}>
                              {user.rejected_at ? new Date(user.rejected_at).toLocaleDateString() : "—"}
                            </td>
                          )}

                          {/* Actions — differ per tab */}
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              {statusTab === "approved" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openEdit(user)}
                                    className={`p-1.5 rounded-lg transition-colors ${darkMode ? "hover:bg-[#374151] text-blue-400" : "hover:bg-blue-50 text-blue-600"}`}
                                    title="Edit"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openDelete(user)}
                                    className={`p-1.5 rounded-lg transition-colors ${darkMode ? "hover:bg-[#374151] text-red-400" : "hover:bg-red-50 text-red-600"}`}
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              {statusTab === "pending" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => approveUser(user)}
                                    className={`p-1.5 rounded-lg transition-colors ${darkMode ? "hover:bg-[#374151] text-green-400" : "hover:bg-green-50 text-green-600"}`}
                                    title="Approve"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => denyUser(user)}
                                    className={`p-1.5 rounded-lg transition-colors ${darkMode ? "hover:bg-[#374151] text-red-400" : "hover:bg-red-50 text-red-600"}`}
                                    title="Deny"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              {statusTab === "denied" && (
                                // Re-approve a denied user
                                <button
                                  type="button"
                                  onClick={() => approveUser(user)}
                                  className={`p-1.5 rounded-lg transition-colors ${darkMode ? "hover:bg-[#374151] text-green-400" : "hover:bg-green-50 text-green-600"}`}
                                  title="Re-approve"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md mx-4 rounded-xl border p-6 shadow-xl ${darkMode ? "bg-[#1F2937] border-[#374151] text-white" : "bg-white border-[#E5E7EB] text-gray-900"}`}>
            <h2 className="text-lg font-bold mb-1">Edit User</h2>
            <p className={`text-sm mb-5 ${subtextClass}`}>Update {editingUser.email}&apos;s name or role.</p>
            <div className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${subtextClass}`}>Full Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className={inputClass}
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${subtextClass}`}>Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                  className={inputClass}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button" onClick={closeEdit} disabled={editPending}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${darkMode ? "bg-[#374151] hover:bg-[#4B5563] text-gray-300" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
              >
                Cancel
              </button>
              <button
                type="button" onClick={submitEdit} disabled={editPending || !editForm.name.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-[#2563EB] hover:bg-[#1D4ED8] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {editPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md mx-4 rounded-xl border p-6 shadow-xl ${darkMode ? "bg-[#1F2937] border-[#374151] text-white" : "bg-white border-[#E5E7EB] text-gray-900"}`}>
            <h2 className="text-lg font-bold mb-1">Delete User?</h2>
            <p className={`text-sm mb-6 ${subtextClass}`}>
              This will permanently delete{" "}
              <span className="font-semibold text-red-500">{deletingUser.name}</span> from user_profiles and Supabase Auth. This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button" onClick={closeDelete} disabled={deletePending}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${darkMode ? "bg-[#374151] hover:bg-[#4B5563] text-gray-300" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
              >
                Cancel
              </button>
              <button
                type="button" onClick={confirmDelete} disabled={deletePending}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deletePending ? "Deleting..." : "Delete User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}