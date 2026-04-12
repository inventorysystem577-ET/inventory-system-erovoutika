"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "../../../components/AuthGuard";
import Sidebar from "../../../components/Sidebar";
import TopNavbar from "../../../components/TopNavbar";
import { useAuth } from "../../../hook/useAuth";
import { isAdminRole } from "../../../utils/roleHelper";
import { ClipboardList, Search, Filter, ArrowLeft } from "lucide-react";

export default function ActivityLogPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState("all");
  const [logs, setLogs] = useState([]);
  const [fetchingLogs, setFetchingLogs] = useState(true);

  const { role, loading } = useAuth();
  const router = useRouter();

  const isAdmin = isAdminRole(role);

  useEffect(() => {
    const savedDarkMode = localStorage.getItem("darkMode");
    if (savedDarkMode !== null) {
      setDarkMode(savedDarkMode === "true");
    }
  }, []);

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace("/view/product-in");
    }
  }, [loading, isAdmin, router]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setFetchingLogs(true);

        const query = new URLSearchParams({
          userType: userTypeFilter,
          search: searchTerm,
        });

        const res = await fetch(`/api/activity-log?${query.toString()}`);
        const result = await res.json();

        if (result.success) {
          setLogs(result.data || []);
        } else {
          setLogs([]);
        }
      } catch (error) {
        console.error("Failed to fetch activity logs:", error);
        setLogs([]);
      } finally {
        setFetchingLogs(false);
      }
    };

    fetchLogs();
  }, [userTypeFilter, searchTerm]);

  const formattedLogs = useMemo(() => {
    return logs.map((log) => ({
      ...log,
      displayDate: log.created_at
        ? new Date(log.created_at).toLocaleString()
        : "N/A",
    }));
  }, [logs]);

  if (!isAdmin) {
    return (
      <AuthGuard darkMode={darkMode}>
        <div
          className={`min-h-screen flex items-center justify-center ${
            darkMode ? "bg-[#111827] text-white" : "bg-[#F3F4F6] text-black"
          }`}
        >
          <p className="text-sm">Redirecting to monitoring page...</p>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard darkMode={darkMode}>
      <div
        className={`min-h-screen transition-colors duration-300 ${
          darkMode ? "bg-[#111827] text-white" : "bg-[#F3F4F6] text-black"
        }`}
      >
        <TopNavbar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />

        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          darkMode={darkMode}
        />

        <div
          className={`transition-all duration-300 ${
            sidebarOpen ? "lg:ml-64" : "ml-0"
          } pt-16`}
        >
          <div className="p-6 sm:p-8">
            <div className="mb-4">
              <button
                type="button"
                onClick={() => router.push("/view/admin-panel")}
                className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${
                  darkMode
                    ? "text-gray-300 hover:text-white"
                    : "text-gray-600 hover:text-black"
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Admin Panel
              </button>
            </div>

            <div
              className={`rounded-xl border p-6 mb-6 ${
                darkMode
                  ? "bg-[#1F2937] border-[#374151]"
                  : "bg-white border-[#E5E7EB]"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <ClipboardList className="w-6 h-6 text-[#2563EB]" />
                <h1 className="text-2xl font-bold">Activity Log</h1>
              </div>
              <p
                className={`text-sm ${
                  darkMode ? "text-gray-300" : "text-gray-600"
                }`}
              >
                Monitor and review system activity performed by both admin and
                staff users.
              </p>
            </div>

            <div
              className={`rounded-xl border p-4 mb-6 ${
                darkMode
                  ? "bg-[#1F2937] border-[#374151]"
                  : "bg-white border-[#E5E7EB]"
              }`}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search
                    className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                      darkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  />
                  <input
                    type="text"
                    placeholder="Search by user, action, module, or details..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full rounded-lg border pl-10 pr-4 py-2 text-sm outline-none transition-colors ${
                      darkMode
                        ? "bg-[#111827] border-[#374151] text-white placeholder:text-gray-400"
                        : "bg-white border-[#D1D5DB] text-black placeholder:text-gray-500"
                    }`}
                  />
                </div>

                <div className="relative">
                  <Filter
                    className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                      darkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  />
                  <select
                    value={userTypeFilter}
                    onChange={(e) => setUserTypeFilter(e.target.value)}
                    className={`w-full rounded-lg border pl-10 pr-4 py-2 text-sm outline-none transition-colors ${
                      darkMode
                        ? "bg-[#111827] border-[#374151] text-white"
                        : "bg-white border-[#D1D5DB] text-black"
                    }`}
                  >
                    <option value="all">All User Types</option>
                    <option value="admin">Admin Only</option>
                    <option value="staff">Staff Only</option>
                  </select>
                </div>
              </div>
            </div>

            <div
              className={`rounded-xl border overflow-hidden ${
                darkMode
                  ? "bg-[#1F2937] border-[#374151]"
                  : "bg-white border-[#E5E7EB]"
              }`}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className={darkMode ? "bg-[#111827]" : "bg-[#F9FAFB]"}>
                    <tr>
                      <th className="text-left text-xs font-semibold uppercase tracking-wide px-4 py-3">
                        User Name
                      </th>
                      <th className="text-left text-xs font-semibold uppercase tracking-wide px-4 py-3">
                        User Type
                      </th>
                      <th className="text-left text-xs font-semibold uppercase tracking-wide px-4 py-3">
                        Action
                      </th>
                      <th className="text-left text-xs font-semibold uppercase tracking-wide px-4 py-3">
                        Module
                      </th>
                      <th className="text-left text-xs font-semibold uppercase tracking-wide px-4 py-3">
                        Details
                      </th>
                      <th className="text-left text-xs font-semibold uppercase tracking-wide px-4 py-3">
                        Date & Time
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {fetchingLogs ? (
                      <tr>
                        <td
                          colSpan="6"
                          className={`px-4 py-8 text-center text-sm ${
                            darkMode ? "text-gray-300" : "text-gray-600"
                          }`}
                        >
                          Loading activity logs...
                        </td>
                      </tr>
                    ) : formattedLogs.length > 0 ? (
                      formattedLogs.map((log) => (
                        <tr
                          key={log.id}
                          className={`border-t transition-colors ${
                            darkMode
                              ? "border-[#374151] hover:bg-[#273244]"
                              : "border-[#E5E7EB] hover:bg-[#F9FAFB]"
                          }`}
                        >
                          <td className="px-4 py-4 text-sm">{log.user_name}</td>
                          <td className="px-4 py-4 text-sm">
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                log.user_type === "admin"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {log.user_type}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm">{log.action}</td>
                          <td className="px-4 py-4 text-sm">{log.module}</td>
                          <td className="px-4 py-4 text-sm">{log.details}</td>
                          <td className="px-4 py-4 text-sm">{log.displayDate}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="6"
                          className={`px-4 py-8 text-center text-sm ${
                            darkMode ? "text-gray-300" : "text-gray-600"
                          }`}
                        >
                          No activity logs found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div
              className={`rounded-xl border p-4 mt-6 ${
                darkMode
                  ? "bg-[#1F2937] border-[#374151]"
                  : "bg-white border-[#E5E7EB]"
              }`}
            >
              <h3 className="font-semibold mb-2">Log Information</h3>
              <p
                className={`text-sm ${
                  darkMode ? "text-gray-300" : "text-gray-600"
                }`}
              >
                This page displays activity records from both admin and staff
                users. Use the filters above to isolate entries by user type or
                search for a specific activity.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}