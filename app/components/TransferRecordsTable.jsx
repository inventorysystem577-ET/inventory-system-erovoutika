import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  PackageCheck,
  Pencil,
} from "lucide-react";
import { getPageNumbers } from "../utils/paginationHelpers";

export default function TransferRecordsTable({
  darkMode,
  isAdmin,
  data,
  filters,
  handlers,
}) {
  const {
    filteredRecords,
    currentItems,
    itemsPerPage,
    indexOfFirstItem,
    indexOfLastItem,
    currentPage,
    totalPages,
  } = data;

  const { searchTerm, setSearchTerm, selectedMonth, setSelectedMonth } = filters;

  const { setCurrentPage, handleEditRecord, handleDeleteRecord } = handlers;

  return (
    <div
      className={`rounded-xl shadow-xl overflow-hidden border mb-4 ${
        darkMode
          ? "bg-[#1F2937] border-[#374151]"
          : "bg-white border-[#E5E7EB]"
      }`}
    >
      <div
        className={`p-4 border-b grid grid-cols-1 md:grid-cols-3 gap-3 ${
          darkMode ? "border-[#374151]" : "border-[#E5E7EB]"
        }`}
      >
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter records by name, type, category, purpose"
          className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all ${
            darkMode
              ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
              : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
          }`}
        />
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all ${
            darkMode
              ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
              : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
          }`}
        />
        <button
          type="button"
          onClick={() => {
            setSelectedMonth("");
            setSearchTerm("");
          }}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
            darkMode
              ? "bg-[#111827] text-[#D1D5DB] hover:bg-[#374151]"
              : "bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
          }`}
        >
          Clear Filters
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse">
          <thead
            className={`${
              darkMode
                ? "bg-[#111827] text-[#D1D5DB]"
                : "bg-[#F9FAFB] text-[#374151]"
            }`}
          >
            <tr>
              {[
                "ITEM NAME",
                "PURPOSE",
                "QUANTITY",
                "DATE",
                "TYPE / CATEGORY",
                "REMARK",
                "RECEIVER",
                "ACTION",
              ].map((head) => (
                <th
                  key={head}
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap text-center"
                >
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={darkMode ? "divide-[#374151]" : "divide-[#E5E7EB]"}>
            {currentItems.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className={`text-center p-8 sm:p-12 ${
                    darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                  } animate__animated animate__fadeIn`}
                >
                  <PackageCheck
                    className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 ${
                      darkMode ? "text-[#6B7280]" : "text-[#D1D5DB]"
                    }`}
                  />
                  <p className="text-base sm:text-lg font-medium mb-1">
                    No stock transfer records yet
                  </p>
                  <p className="text-xs sm:text-sm opacity-75">
                    Add your first transfer record using the form above
                  </p>
                </td>
              </tr>
            ) : (
              currentItems.map((record, index) => (
                <tr
                  key={record.id}
                  className={`border-t transition animate__animated animate__fadeIn animate__faster ${
                    darkMode
                      ? "border-[#374151] hover:bg-[#374151]/40"
                      : "border-[#E5E7EB] hover:bg-[#F3F4F6]"
                  }`}
                  style={{ animationDelay: `${index * 0.03}s` }}
                >
                  <td className="px-4 py-3 text-center align-middle font-semibold text-sm whitespace-nowrap">
                    {record.itemName}
                  </td>
                  <td className="px-4 py-3 align-middle text-xs sm:text-sm">
                    {(record.purpose || "").trim() || "-"}
                  </td>
                  <td className="px-4 py-3 text-center align-middle">
                    <span
                      className={`px-2 sm:px-3 py-1 rounded-lg font-bold text-xs sm:text-sm ${
                        darkMode
                          ? "bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30"
                          : "bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0]"
                      }`}
                    >
                      {record.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center align-middle text-xs sm:text-sm">
                    {record.date}
                  </td>

                  <td className="px-4 py-3 text-center align-middle">
                    <div className="flex flex-col items-center gap-2">
                      <span
                        className={`text-[11px] uppercase tracking-wide font-semibold ${
                          darkMode ? "text-[#E5E7EB]" : "text-[#1F2937]"
                        }`}
                      >
                        {record.type}
                      </span>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                          darkMode
                            ? "bg-[#111827] border-[#374151] text-[#D1D5DB]"
                            : "bg-[#FEF3C7] border-[#FCD34D] text-[#92400E]"
                        }`}
                      >
                        {record.category}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap text-center align-middle text-xs sm:text-sm font-semibold">
                    {record.remark}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap text-center align-middle text-xs sm:text-sm">
                    {(record.receiver || "").trim() || "-"}
                  </td>

                  <td className="px-4 py-3 text-center align-middle">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditRecord(record)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                          darkMode
                            ? "bg-[#111827] text-[#D1D5DB] hover:bg-[#374151]"
                            : "bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
                        }`}
                        title="Edit record"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>

                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteRecord(record.id)}
                          className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold ${
                            darkMode
                              ? "bg-red-900/30 text-red-200 hover:bg-red-900/40"
                              : "bg-red-100 text-red-700 hover:bg-red-200"
                          }`}
                          title="Remove record"
                        >
                          X
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filteredRecords.length > itemsPerPage ? (
        <div
          className={`flex items-center justify-between px-4 py-3 border-t ${
            darkMode ? "border-[#374151]" : "border-[#E5E7EB]"
          }`}
        >
          <span className={`text-sm ${darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"}`}>
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredRecords.length)}
            {" "}
            of {filteredRecords.length} entries
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`p-2 rounded-lg transition-all ${
                currentPage === 1
                  ? darkMode
                    ? "bg-[#374151] text-[#6B7280] cursor-not-allowed"
                    : "bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed"
                  : darkMode
                    ? "bg-[#374151] text-[#D1D5DB] hover:bg-[#4B5563]"
                    : "bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1">
              {getPageNumbers(currentPage, totalPages).map((pageNum, idx) =>
                pageNum === "..." ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className={`px-3 py-2 ${darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"}`}
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 rounded-lg font-medium transition-all ${
                      currentPage === pageNum
                        ? "bg-[#1E40AF] text-white shadow-md"
                        : darkMode
                          ? "bg-[#374151] text-[#D1D5DB] hover:bg-[#4B5563]"
                          : "bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
                    }`}
                  >
                    {pageNum}
                  </button>
                ),
              )}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-lg transition-all ${
                currentPage === totalPages
                  ? darkMode
                    ? "bg-[#374151] text-[#6B7280] cursor-not-allowed"
                    : "bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed"
                  : darkMode
                    ? "bg-[#374151] text-[#D1D5DB] hover:bg-[#4B5563]"
                    : "bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
