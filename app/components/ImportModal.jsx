import React from "react";
import { Upload } from "lucide-react";

export default function ImportModal({
  open,
  darkMode,
  importPreview,
  importResult,
  importLoading,
  onConfirm,
  onCancel,
  buildProductCode,
  getStatusColor,
  getStatusLabel,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div
        className={`relative z-10 w-full max-w-lg rounded-2xl border shadow-2xl p-6 max-h-[80vh] overflow-y-auto ${
          darkMode
            ? "bg-[#1F2937] border-[#374151] text-white"
            : "bg-white border-[#E5E7EB] text-black"
        }`}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-teal-500/10">
            <Upload className="w-5 h-5 text-teal-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Import Preview</h3>
            <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              Review data before importing
            </p>
          </div>
        </div>

        <div className={`h-px mb-4 ${darkMode ? "bg-[#374151]" : "bg-[#E5E7EB]"}`} />

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className={`p-3 rounded-xl ${darkMode ? "bg-[#374151]" : "bg-gray-50"}`}>
            <p className={`text-xs mb-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              Components
            </p>
            <p className="text-xl font-bold text-blue-500">
              {importPreview.components.length}
            </p>
            <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              items found
            </p>
          </div>
          <div className={`p-3 rounded-xl ${darkMode ? "bg-[#374151]" : "bg-gray-50"}`}>
            <p className={`text-xs mb-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              Products
            </p>
            <p className="text-xl font-bold text-purple-500">
              {importPreview.products.length}
            </p>
            <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              items found
            </p>
          </div>
        </div>

        {importPreview.components.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-semibold mb-2 text-blue-500">Components</p>
            <div
              className={`rounded-xl overflow-hidden border ${darkMode ? "border-[#374151]" : "border-[#E5E7EB]"}`}
            >
              <table className="w-full text-xs">
                <thead
                  className={
                    darkMode
                      ? "bg-[#374151] text-gray-300"
                      : "bg-[#1e40af] text-white"
                  }
                >
                  <tr>
                    <th className="px-3 py-2 text-left">Code</th>
                    <th className="px-3 py-2 text-left">Product</th>
                    <th className="px-3 py-2 text-left">Qty</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? "divide-[#374151]" : "divide-[#E5E7EB]"}`}>
                  {importPreview.components.slice(0, 5).map((item, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">
                        {item.product_name ? buildProductCode(item) : "-"}
                      </td>
                      <td className="px-3 py-2">
                        {item.name ? buildProductCode(item, "CMP") : "-"}
                      </td>
                      <td className="px-3 py-2">{item.name || "-"}</td>
                      <td className="px-3 py-2">{item.quantity}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(item.quantity, darkMode)}`}
                        >
                          {getStatusLabel(item.quantity)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {importPreview.components.length > 5 && (
                    <tr>
                      <td
                        colSpan={4}
                        className={`px-3 py-2 text-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                      >
                        +{importPreview.components.length - 5} more items
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {importPreview.products.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-semibold mb-2 text-purple-500">Products</p>
            <div
              className={`rounded-xl overflow-hidden border ${darkMode ? "border-[#374151]" : "border-[#E5E7EB]"}`}
            >
              <table className="w-full text-xs">
                <thead
                  className={
                    darkMode
                      ? "bg-[#374151] text-gray-300"
                      : "bg-[#7c3aed] text-white"
                  }
                >
                  <tr>
                    <th className="px-3 py-2 text-left">Code</th>
                    <th className="px-3 py-2 text-left">Product</th>
                    <th className="px-3 py-2 text-left">Qty</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? "divide-[#374151]" : "divide-[#E5E7EB]"}`}>
                  {importPreview.products.slice(0, 5).map((item, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{item.product_name || "-"}</td>
                      <td className="px-3 py-2">{item.quantity}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(item.quantity, darkMode)}`}
                        >
                          {getStatusLabel(item.quantity)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {importPreview.products.length > 5 && (
                    <tr>
                      <td
                        colSpan={4}
                        className={`px-3 py-2 text-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                      >
                        +{importPreview.products.length - 5} more items
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className={`text-xs mb-4 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
          Existing items will be updated. New items will be added.
        </p>

        {importResult && (
          <div
            className={`mb-4 p-3 rounded-xl text-sm ${
              importResult.errors.length > 0
                ? darkMode
                  ? "bg-red-900/20 border border-red-800 text-red-300"
                  : "bg-red-50 border border-red-200 text-red-700"
                : darkMode
                  ? "bg-green-900/20 border border-green-800 text-green-300"
                  : "bg-green-50 border border-green-200 text-green-700"
            }`}
          >
            {importResult.errors.length === 0 ? (
              <div>
                <p className="font-semibold mb-1">Import successful!</p>
                <p className="text-xs">
                  Components: {importResult.compAdded} added, {importResult.compUpdated} updated,
                  {" "}
                  {importResult.compDeleted} deleted
                </p>
                <p className="text-xs">
                  Products: {importResult.prodAdded} added, {importResult.prodUpdated} updated,
                  {" "}
                  {importResult.prodDeleted} deleted
                </p>
              </div>
            ) : (
              <div>
                <p className="font-semibold mb-1">Completed with errors:</p>
                {importResult.errors.map((err, i) => (
                  <p key={i} className="text-xs">
                    - {err}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={importLoading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#0f766e] to-[#0d9488] text-white hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {importLoading ? (
              <>
                <svg
                  className="animate-spin w-4 h-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Importing...
              </>
            ) : (
              "Confirm Import"
            )}
          </button>
          <button
            onClick={onCancel}
            disabled={importLoading}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-60 ${
              darkMode
                ? "bg-[#374151] hover:bg-[#4B5563] text-gray-300"
                : "bg-gray-100 hover:bg-gray-200 text-gray-600"
            }`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
