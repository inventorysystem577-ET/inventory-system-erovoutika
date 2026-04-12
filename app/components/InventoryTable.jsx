import React from "react";
import Link from "next/link";
import {
  BarChart3,
  Check,
  ChevronLeft,
  ChevronRight,
  PencilLine,
  Search,
  X,
} from "lucide-react";
import { getPageNumbers } from "../utils/paginationHelpers";

export default function InventoryTable({
  darkMode,
  tableRef,
  config,
  state,
  handlers,
}) {
  const {
    kind,
    focusedSection,
    ringClass,
    lightHeaderClass,
    emptyIcon,
    emptyLabel,
    categoryOptions,
    defaultCategory,
    pageActiveClass,
    getDisplayName,
    getCode,
    getAddStockHref,
  } = config;

  const {
    items,
    sortedItems,
    paginatedItems,
    currentPage,
    totalPages,
    indexOfFirstItem,
    indexOfLastItem,
    setCurrentPage,
  } = state;

  const {
    isAdmin,
    canViewHistory,
    openHistoryModal,
    openThresholdModal,
    transferCategory,
    isUpdatingCategoryId,
    getDisplayedQuantity,
    getItemThreshold,
    getIndicatorColor,
    getStatusColor,
    getStatusIcon,
    getStatusLabel,
    getCategoryColor,
    getCategoryIcon,
    buildSku,
    buildDescription,
    truncateText,
    descriptionLimit,
    expandedDescriptionIds,
    toggleDescriptionExpanded,
    editingDescriptionId,
    editingDescriptionValue,
    setEditingDescriptionValue,
    isSavingDescription,
    saveEditingDescription,
    cancelEditingDescription,
    startEditingDescription,
  } = handlers;

  const EmptyIcon = emptyIcon;
  const isParcel = kind === "parcel";

  return (
    <div
      ref={tableRef}
      className={`rounded-xl shadow-lg overflow-hidden border ${focusedSection === kind ? `ring-2 ${ringClass} ring-offset-2 ring-offset-transparent` : ""} ${darkMode ? "bg-[#1F2937] border-[#374151]" : "bg-white border-[#E5E7EB]"}`}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead
            className={
              darkMode ? "bg-[#374151] text-gray-300" : `${lightHeaderClass} text-white`
            }
          >
            <tr>
              {[
                "Code",
                "Product",
                "SKU",
                "Description",
                "Category",
                "Stock Quantity",
                "Status",
                "Date Added",
                "Actions",
              ].map((head) => (
                <th
                  key={head}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                >
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={`divide-y ${darkMode ? "divide-[#374151]" : "divide-[#E5E7EB]"}`}>
            {sortedItems.length === 0 ? (
              <tr>
                <td colSpan="9" className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <EmptyIcon className={`w-12 h-12 ${darkMode ? "text-gray-600" : "text-gray-400"}`} />
                    <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                      No {emptyLabel} found
                    </p>
                    <p className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
                      Try changing the filter
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedItems.map((item, index) => {
                const rowId = `${kind}-${item.id}`;
                const qty = getDisplayedQuantity(kind, item);
                const threshold = getItemThreshold(kind, item);
                const rawDescription = buildDescription(item);
                const isExpanded = expandedDescriptionIds.has(rowId);

                return (
                  <tr
                    key={index}
                    className={`transition-colors ${darkMode ? "hover:bg-[#374151]" : "hover:bg-[#F9FAFB]"}`}
                  >
                    <td className="px-4 py-3 text-sm">{getCode(item)}</td>
                    <td className="px-4 py-3 text-sm font-medium align-top">
                      <div className="flex items-start gap-2 min-w-0">
                        <div className={`w-2 h-2 rounded-full ${getIndicatorColor(qty, threshold)}`} />
                        <span className="break-words whitespace-normal">{getDisplayName(item)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{buildSku(item)}</td>
                    <td className="px-4 py-3 text-sm min-w-[22rem] w-[28rem] align-top">
                      {isParcel ? (
                        (() => {
                          if (!rawDescription) return "-";

                          if (isExpanded) {
                            return (
                              <button
                                type="button"
                                onClick={() => toggleDescriptionExpanded(rowId)}
                                className={`text-left whitespace-pre-wrap break-words ${darkMode ? "text-gray-200 hover:text-white" : "text-gray-800 hover:text-black"}`}
                                title="Click to collapse"
                              >
                                {rawDescription}
                              </button>
                            );
                          }

                          const truncated = truncateText(rawDescription, descriptionLimit);
                          return (
                            <button
                              type="button"
                              onClick={() => toggleDescriptionExpanded(rowId)}
                              className={`text-left break-words ${darkMode ? "text-gray-200 hover:text-white" : "text-gray-800 hover:text-black"}`}
                              title="Click to expand"
                            >
                              {truncated.text}
                              {truncated.isTruncated ? (
                                <span
                                  className={`ml-2 text-[11px] font-semibold ${darkMode ? "text-blue-300" : "text-blue-600"}`}
                                >
                                  View more
                                </span>
                              ) : null}
                            </button>
                          );
                        })()
                      ) : editingDescriptionId === item.id ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            value={editingDescriptionValue}
                            onChange={(e) => setEditingDescriptionValue(e.target.value)}
                            rows={3}
                            className={`w-full rounded-lg p-2 text-xs sm:text-sm border ${darkMode ? "bg-[#111827] border-[#374151] text-white" : "bg-white border-[#E5E7EB] text-black"}`}
                            placeholder="Type a description..."
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isSavingDescription}
                              onClick={() => saveEditingDescription(item.id)}
                              className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold ${
                                isSavingDescription
                                  ? darkMode
                                    ? "bg-[#374151] text-[#9CA3AF] cursor-not-allowed"
                                    : "bg-[#E5E7EB] text-[#6B7280] cursor-not-allowed"
                                  : "bg-[#16A34A] text-white hover:bg-[#15803D]"
                              }`}
                            >
                              <Check className="w-4 h-4" /> Save
                            </button>
                            <button
                              type="button"
                              disabled={isSavingDescription}
                              onClick={cancelEditingDescription}
                              className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold ${
                                darkMode
                                  ? "bg-[#374151] text-[#D1D5DB] hover:bg-[#4B5563]"
                                  : "bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
                              }`}
                            >
                              <X className="w-4 h-4" /> Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2">
                          <button
                            type="button"
                            className={`text-left break-words leading-relaxed ${darkMode ? "text-gray-200 hover:text-white" : "text-gray-800 hover:text-black"}`}
                            onClick={() => {
                              if (!rawDescription) return;
                              toggleDescriptionExpanded(rowId);
                            }}
                            title={isExpanded ? "Click to collapse" : "Click to expand"}
                          >
                            {(() => {
                              if (!rawDescription) {
                                return (
                                  <span className={darkMode ? "text-gray-500" : "text-gray-400"}>
                                    No description
                                  </span>
                                );
                              }

                              if (isExpanded) {
                                return <span className="whitespace-pre-wrap">{rawDescription}</span>;
                              }

                              const truncated = truncateText(rawDescription, descriptionLimit);
                              return (
                                <span>
                                  {truncated.text}
                                  {truncated.isTruncated ? (
                                    <span
                                      className={`ml-2 text-[11px] font-semibold ${darkMode ? "text-blue-300" : "text-blue-600"}`}
                                    >
                                      View more
                                    </span>
                                  ) : null}
                                </span>
                              );
                            })()}
                          </button>
                          {isAdmin ? (
                            <button
                              type="button"
                              onClick={() => startEditingDescription(item)}
                              className={`p-2 rounded-lg border transition ${darkMode ? "border-[#374151] hover:bg-[#374151]/60" : "border-[#E5E7EB] hover:bg-[#F3F4F6]"}`}
                              title="Edit description"
                            >
                              <PencilLine className="w-4 h-4" />
                            </button>
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {isAdmin ? (
                        <div className="flex flex-col gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getCategoryColor(item.category)}`}
                          >
                            <span>{getCategoryIcon(item.category)}</span>
                            {item.category || "Others"}
                          </span>
                          <select
                            value={item.category || defaultCategory}
                            onChange={(e) =>
                              transferCategory({
                                type: kind,
                                id: item.id,
                                nextCategory: e.target.value,
                              })
                            }
                            disabled={isUpdatingCategoryId === item.id}
                            className={`w-fit text-xs rounded-lg px-2 py-1 border focus:outline-none focus:ring-2 ${
                              darkMode
                                ? "bg-[#111827] border-[#374151] text-white focus:ring-[#3B82F6]"
                                : "bg-white border-[#D1D5DB] text-black focus:ring-[#1E3A8A]"
                            }`}
                            aria-label="Transfer category"
                          >
                            {categoryOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.value}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getCategoryColor(item.category)}`}
                        >
                          <span>{getCategoryIcon(item.category)}</span>
                          {item.category || "Others"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">{qty} units</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(qty, darkMode, threshold)}`}
                      >
                        {getStatusIcon(qty, threshold)}
                        {getStatusLabel(qty, threshold)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{item.date}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        {canViewHistory ? (
                          <button
                            type="button"
                            onClick={() => openHistoryModal(kind, item)}
                            className={`inline-flex items-center justify-center p-2 rounded-lg border transition ${
                              darkMode
                                ? "border-[#374151] hover:bg-[#374151] text-blue-300"
                                : kind === "parcel"
                                  ? "border-[#D1D5DB] hover:bg-[#EFF6FF] text-[#1D4ED8]"
                                  : "border-[#D1D5DB] hover:bg-[#F5F3FF] text-[#6D28D9]"
                            }`}
                            title="View stock history"
                            aria-label="View stock history"
                          >
                            <Search className="w-4 h-4" />
                          </button>
                        ) : null}
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() => openThresholdModal(kind, item)}
                            className={`inline-flex items-center justify-center p-2 rounded-lg border transition ${
                              darkMode
                                ? "border-[#374151] hover:bg-[#374151] text-amber-300"
                                : "border-[#D1D5DB] hover:bg-[#FFFBEB] text-[#B45309]"
                            }`}
                            title="Set stock thresholds"
                            aria-label="Set stock thresholds"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </button>
                        ) : null}
                        {item.quantity === 0 ? (
                          <Link href={getAddStockHref(item)}>
                            <div className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded cursor-pointer w-fit">
                              Add Stock
                            </div>
                          </Link>
                        ) : null}
                        {!canViewHistory && item.quantity !== 0 ? "-" : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {sortedItems.length > 0 && (
        <div
          className={`flex items-center justify-between px-4 py-3 border-t ${
            darkMode ? "border-[#374151]" : "border-[#E5E7EB]"
          }`}
        >
          <div className={`text-sm ${darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"}`}>
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, sortedItems.length)} of
            {" "}
            {sortedItems.length} entries
          </div>

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
                    key={`${kind}-ellipsis-${idx}`}
                    className={`px-3 py-2 ${darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"}`}
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={`${kind}-page-${pageNum}`}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 rounded-lg font-medium transition-all ${
                      currentPage === pageNum
                        ? `${pageActiveClass} text-white shadow-md`
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
      )}
    </div>
  );
}
