"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, BarChart3 } from "lucide-react";
import ActionModal from "./ActionModal";

const toIntOr = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  // Allow 0 as valid value for manual input mode
  return Math.max(0, Math.floor(parsed));
};

export default function StockThresholdModal({
  open,
  darkMode,
  thresholdTarget,
  defaultThresholds,
  currentThreshold,
  onClose,
  onSave,
  onReset,
}) {
  // Default to 0-0 (manual input mode)
  const [critical, setCritical] = useState(defaultThresholds?.critical ?? 0);
  const [low, setLow] = useState(defaultThresholds?.low ?? 0);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!open) return;
    // Default to 0-0 if no values set
    setCritical(toIntOr(currentThreshold?.critical, defaultThresholds?.critical ?? 0));
    setLow(toIntOr(currentThreshold?.low, defaultThresholds?.low ?? 0));
    setFormError("");
  }, [open, currentThreshold, defaultThresholds]);

  if (!open || !thresholdTarget) return null;

  const itemName =
    thresholdTarget.type === "parcel"
      ? thresholdTarget.item?.name
      : thresholdTarget.item?.product_name;

  const handleSave = () => {
    const safeCritical = toIntOr(critical, defaultThresholds?.critical ?? 0);
    const safeLow = toIntOr(low, defaultThresholds?.low ?? 0);

    // Only enforce low > critical if both are > 0
    if (safeCritical > 0 && safeLow > 0 && safeLow <= safeCritical) {
      setFormError("Low stock threshold must be greater than critical threshold.");
      return;
    }

    setFormError("");
    onSave?.({ critical: safeCritical, low: safeLow });
  };

  return (
    <ActionModal
      open={open}
      darkMode={darkMode}
      title="Stock Threshold Settings"
      subtitle={`${thresholdTarget.type === "parcel" ? "Component" : "Product"}: ${itemName}`}
      onClose={onClose}
      icon={<BarChart3 className="w-5 h-5 text-amber-500" />}
      maxWidthClass="max-w-2xl"
      footer={
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onReset}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              darkMode
                ? "bg-[#1F2937] border border-[#374151] text-gray-300 hover:bg-[#374151]"
                : "bg-white border border-[#D1D5DB] text-gray-700 hover:bg-gray-50"
            }`}
          >
            Reset to 0-0
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                darkMode
                  ? "bg-[#374151] hover:bg-[#4B5563] text-gray-300"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#b45309] to-[#d97706] hover:shadow-lg"
            >
              Save Thresholds
            </button>
          </div>
        </div>
      }
    >
      <div
        className={`rounded-xl border p-3 mb-4 ${
          darkMode
            ? "border-[#374151] bg-[#111827]"
            : "border-[#E5E7EB] bg-[#F8FAFC]"
        }`}
      >
        <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
          Set manual thresholds for this item. Default is
          <span className="font-semibold"> 0-0</span> (no alerts).
        </p>
        <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
          Leave both at 0 to disable low/critical alerts. Out of stock is always triggered at 0.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            className={`block text-sm font-medium mb-2 ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            Critical Level (&lt;=)
          </label>
          <input
            type="number"
            min={0}
            value={critical}
            onChange={(e) => setCritical(e.target.value)}
            className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all text-sm ${
              darkMode
                ? "border-[#374151] focus:ring-[#F59E0B] focus:border-[#F59E0B] bg-[#111827] text-white"
                : "border-[#D1D5DB] focus:ring-[#B45309] focus:border-[#B45309] bg-white text-black"
            }`}
          />
        </div>
        <div>
          <label
            className={`block text-sm font-medium mb-2 ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            Low Stock Level (&lt;)
          </label>
          <input
            type="number"
            min={0}
            value={low}
            onChange={(e) => setLow(e.target.value)}
            className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all text-sm ${
              darkMode
                ? "border-[#374151] focus:ring-[#F59E0B] focus:border-[#F59E0B] bg-[#111827] text-white"
                : "border-[#D1D5DB] focus:ring-[#B45309] focus:border-[#B45309] bg-white text-black"
            }`}
          />
        </div>
      </div>

      {formError ? (
        <div
          className={`mt-4 rounded-xl border p-3 text-sm flex items-start gap-2 ${
            darkMode
              ? "bg-red-900/20 border-red-800 text-red-300"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          <AlertTriangle className="w-4 h-4 mt-0.5" />
          <span>{formError}</span>
        </div>
      ) : null}
    </ActionModal>
  );
}
