import React from "react";
import { ChevronDown, FileDown } from "lucide-react";

export default function ExportModal({
  open,
  darkMode,
  options,
  exportError,
  onExport,
  onClose,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative z-10 w-full max-w-md rounded-2xl border shadow-2xl p-6 ${darkMode ? "bg-[#1F2937] border-[#374151] text-white" : "bg-white border-[#E5E7EB] text-black"}`}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-[#7c3aed]/10">
            <FileDown className="w-5 h-5 text-[#7c3aed]" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Export Inventory</h3>
            <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              Choose your preferred format
            </p>
          </div>
        </div>

        <div className={`h-px my-4 ${darkMode ? "bg-[#374151]" : "bg-[#E5E7EB]"}`} />

        <div className="space-y-2">
          {options.map((option) => (
            <button
              key={option.format}
              onClick={() => onExport(option.format)}
              className={`w-full flex items-center gap-4 p-3 rounded-xl border transition-all duration-200 text-left group ${darkMode ? `border-[#374151] ${option.bg}` : `border-[#E5E7EB] ${option.bg} ${option.border}`}`}
            >
              <div
                className={`p-2 rounded-lg ${darkMode ? "bg-[#374151]" : "bg-gray-100"} group-hover:scale-110 transition-transform ${option.color}`}
              >
                {option.icon}
              </div>
              <div>
                <p className="text-sm font-semibold">{option.label}</p>
                <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  {option.description}
                </p>
              </div>
              <ChevronDown
                className={`w-4 h-4 ml-auto -rotate-90 ${darkMode ? "text-gray-500" : "text-gray-400"}`}
              />
            </button>
          ))}
        </div>

        {exportError && (
          <div
            className={`mt-3 rounded-lg border px-3 py-2 text-sm ${darkMode ? "bg-red-900/20 border-red-800 text-red-300" : "bg-red-50 border-red-200 text-red-700"}`}
          >
            {exportError}
          </div>
        )}

        <button
          onClick={onClose}
          className={`mt-4 w-full py-2 rounded-xl text-sm font-medium transition ${darkMode ? "bg-[#374151] hover:bg-[#4B5563] text-gray-300" : "bg-gray-100 hover:bg-gray-200 text-gray-600"}`}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
