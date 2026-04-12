/* eslint-disable react/prop-types */
import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

const getLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const MissingComponentsModal = ({
  show,
  onClose,
  missingComponents,
  darkMode,
  onAddToStockIn,
  isAdding,
  onRetryProductIn,
  hasPendingProductIn,
  isRetryingProductIn,
}) => {
  const today = useMemo(() => getLocalDate(), []);
  const [date, setDate] = useState(today);
  const [timeHour, setTimeHour] = useState("1");
  const [timeMinute, setTimeMinute] = useState("00");
  const [timeAMPM, setTimeAMPM] = useState("AM");
  const [shippingMode, setShippingMode] = useState("");
  const [clientName, setClientName] = useState("");
  const [prices, setPrices] = useState({});
  const [quantities, setQuantities] = useState({});
  const [showAlternativeBuilder, setShowAlternativeBuilder] = useState(false);
  const [altName, setAltName] = useState("");
  const [altQuantity, setAltQuantity] = useState(1);
  const [altPrice, setAltPrice] = useState(0);
  const [alternativeRows, setAlternativeRows] = useState([]);

  useEffect(() => {
    if (!show) return;
    const nextQuantities = {};
    (missingComponents || []).forEach((item) => {
      const needed = Number(item?.needed || 0);
      const available = Number(item?.available || 0);
      nextQuantities[item.component] = Math.max(needed - available, 1);
    });
    setQuantities(nextQuantities);
    setPrices({});
    const now = new Date();
    let hour = now.getHours();
    const minute = now.getMinutes();
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    setTimeHour(hour.toString());
    setTimeMinute(minute < 10 ? `0${minute}` : `${minute}`);
    setTimeAMPM(ampm);
    setDate(today);
    setShowAlternativeBuilder(false);
    setAltName("");
    setAltQuantity(1);
    setAltPrice(0);
    setAlternativeRows([]);
  }, [show, missingComponents, today]);

  if (!show) {
    return null;
  }

  const time_in = `${timeHour}:${timeMinute} ${timeAMPM}`;

  const addOne = async (componentName) => {
    if (!onAddToStockIn) return;
    await onAddToStockIn({
      item_name: componentName,
      date,
      quantity: Number(quantities[componentName] || 0),
      time_in,
      shipping_mode: shippingMode,
      client_name: clientName,
      price:
        prices[componentName] === "" ||
        prices[componentName] === null ||
        prices[componentName] === undefined
          ? null
          : Number(prices[componentName]),
    });
  };

  const addAll = async () => {
    if (!onAddToStockIn) return;
    for (const item of missingComponents || []) {
      const quantity = Number(quantities[item.component] || 0);
      if (quantity <= 0) continue;
      await onAddToStockIn({
        item_name: item.component,
        date,
        quantity,
        time_in,
        shipping_mode: shippingMode,
        client_name: clientName,
        price:
          prices[item.component] === "" ||
          prices[item.component] === null ||
          prices[item.component] === undefined
            ? null
            : Number(prices[item.component]),
      });
    }

      if (hasPendingProductIn && onRetryProductIn) {
        await onRetryProductIn();
      }
  };

  const addAlternativeRow = () => {
    const name = altName.trim();
    const quantity = Number(altQuantity || 0);
    const price = Number(altPrice || 0);
    if (!name || quantity <= 0 || price < 0) return;
    setAlternativeRows((prev) => [...prev, { name, quantity, price }]);
    setAltName("");
    setAltQuantity(1);
    setAltPrice(0);
  };

  const removeAlternativeRow = (index) => {
    setAlternativeRows((prev) => prev.filter((_, i) => i !== index));
  };

  const addAlternativeToStockIn = async (row) => {
    if (!onAddToStockIn) return;
    await onAddToStockIn({
      item_name: row.name,
      date,
      quantity: Number(row.quantity || 0),
      time_in,
      shipping_mode: shippingMode,
      client_name: clientName,
      price: Number(row.price || 0),
    });
  };

  const addAllAlternativesToStockIn = async () => {
    for (const row of alternativeRows) {
      await addAlternativeToStockIn(row);
    }

    if (hasPendingProductIn && onRetryProductIn) {
      await onRetryProductIn();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${
        show ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div
        className={`relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border shadow-2xl transition-transform duration-300 ${
          darkMode
            ? "bg-[#1F2937] border-[#374151]"
            : "bg-white border-[#E5E7EB]"
        } ${show ? "scale-100" : "scale-95"}`}
      >
        <div
          className={`flex items-center justify-between p-4 border-b ${
            darkMode ? "border-[#374151]" : "border-[#E5E7EB]"
          }`}
        >
          <div className="flex items-center gap-3">
            <img
              src={darkMode ? "/logo.png" : "/logo2.png"}
              alt="Logo"
              className="w-9 h-9 object-contain rounded-md"
            />
            <h2
              className={`text-xl font-bold ${
                darkMode ? "text-white" : "text-[#111827]"
              }`}
            >
              Add Missing Components
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${
              darkMode
                ? "hover:bg-[#374151] text-white"
                : "hover:bg-gray-200 text-black"
            }`}
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <p
            className={`mb-4 text-sm ${
              darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
            }`}
          >
            Missing components detected. You can directly add them to Stock In below.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`border rounded-lg px-3 py-2 text-sm ${
                darkMode
                  ? "border-[#374151] bg-[#111827] text-white"
                  : "border-[#D1D5DB] bg-white text-black"
              }`}
            />
            <div className="flex gap-2">
              <select
                value={timeHour}
                onChange={(e) => setTimeHour(e.target.value)}
                className={`border rounded-lg px-3 py-2 text-sm w-full ${
                  darkMode
                    ? "border-[#374151] bg-[#111827] text-white"
                    : "border-[#D1D5DB] bg-white text-black"
                }`}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
              <select
                value={timeMinute}
                onChange={(e) => setTimeMinute(e.target.value)}
                className={`border rounded-lg px-3 py-2 text-sm w-full ${
                  darkMode
                    ? "border-[#374151] bg-[#111827] text-white"
                    : "border-[#D1D5DB] bg-white text-black"
                }`}
              >
                {Array.from({ length: 60 }, (_, i) => {
                  const val = i < 10 ? `0${i}` : `${i}`;
                  return (
                    <option key={i} value={val}>
                      {val}
                    </option>
                  );
                })}
              </select>
              <select
                value={timeAMPM}
                onChange={(e) => setTimeAMPM(e.target.value)}
                className={`border rounded-lg px-3 py-2 text-sm w-full ${
                  darkMode
                    ? "border-[#374151] bg-[#111827] text-white"
                    : "border-[#D1D5DB] bg-white text-black"
                }`}
              >
                <option>AM</option>
                <option>PM</option>
              </select>
            </div>
            <input
              type="text"
              value={shippingMode}
              onChange={(e) => setShippingMode(e.target.value)}
              placeholder="Shipping Mode"
              className={`border rounded-lg px-3 py-2 text-sm ${
                darkMode
                  ? "border-[#374151] bg-[#111827] text-white"
                  : "border-[#D1D5DB] bg-white text-black"
              }`}
            />
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Client Name"
              className={`border rounded-lg px-3 py-2 text-sm md:col-span-2 ${
                darkMode
                  ? "border-[#374151] bg-[#111827] text-white"
                  : "border-[#D1D5DB] bg-white text-black"
              }`}
            />
          </div>

          <div className="space-y-3">
            {(missingComponents || []).map((item, index) => (
              <div
                key={`${item.component}-${index}`}
                className={`border rounded-lg p-3 ${
                  darkMode ? "border-[#374151]" : "border-[#E5E7EB]"
                }`}
              >
                <div
                  className={`font-medium mb-2 ${
                    darkMode ? "text-white" : "text-[#111827]"
                  }`}
                >
                  {item.component}
                </div>
                <div
                  className={`text-xs mb-3 ${
                    darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                  }`}
                >
                  Needed: {item.needed} | Available: {item.available}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="number"
                    min="1"
                    value={quantities[item.component] ?? 1}
                    onChange={(e) =>
                      setQuantities((prev) => ({
                        ...prev,
                        [item.component]: e.target.value,
                      }))
                    }
                    placeholder="Quantity"
                    className={`border rounded-lg px-3 py-2 text-sm ${
                      darkMode
                        ? "border-[#374151] bg-[#111827] text-white"
                        : "border-[#D1D5DB] bg-white text-black"
                    }`}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={prices[item.component] ?? ""}
                    onChange={(e) =>
                      setPrices((prev) => ({
                        ...prev,
                        [item.component]: e.target.value,
                      }))
                    }
                    placeholder="Unit Price"
                    className={`border rounded-lg px-3 py-2 text-sm ${
                      darkMode
                        ? "border-[#374151] bg-[#111827] text-white"
                        : "border-[#D1D5DB] bg-white text-black"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => addOne(item.component)}
                    disabled={isAdding}
                    className="px-3 py-2 rounded-lg bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-sm disabled:opacity-50"
                  >
                    Add This to Stock In
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-4">
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={addAll}
                disabled={isAdding}
                className="px-4 py-2 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-sm disabled:opacity-50"
              >
                Add All Missing to Stock In
              </button>
              {hasPendingProductIn && (
                <button
                  type="button"
                  onClick={onRetryProductIn}
                  disabled={isAdding || isRetryingProductIn}
                  className="px-4 py-2 rounded-lg bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-sm disabled:opacity-50"
                >
                  {isRetryingProductIn ? "Retrying Product In..." : "Retry Product In"}
                </button>
              )}
            </div>
          </div>

          <div
            className={`mt-5 pt-5 border-t ${
              darkMode ? "border-[#374151]" : "border-[#E5E7EB]"
            }`}
          >
            <button
              type="button"
              onClick={() => setShowAlternativeBuilder((prev) => !prev)}
              className="px-3 py-2 rounded-lg bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-sm font-medium"
            >
              Add Alternative Components
            </button>

            {showAlternativeBuilder && (
              <div className="mt-4">
                <p
                  className={`text-sm mb-3 ${
                    darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                  }`}
                >
                  Add components manually, then send them to Stock In.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <input
                    type="text"
                    placeholder="Component name"
                    value={altName}
                    onChange={(e) => setAltName(e.target.value)}
                    className={`border rounded-lg px-3 py-2 text-sm ${
                      darkMode
                        ? "border-[#374151] bg-[#111827] text-white"
                        : "border-[#D1D5DB] bg-white text-black"
                    }`}
                  />
                  <input
                    type="number"
                    min="1"
                    value={altQuantity}
                    onChange={(e) => setAltQuantity(e.target.value)}
                    className={`border rounded-lg px-3 py-2 text-sm ${
                      darkMode
                        ? "border-[#374151] bg-[#111827] text-white"
                        : "border-[#D1D5DB] bg-white text-black"
                    }`}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Price"
                    value={altPrice}
                    onChange={(e) => setAltPrice(e.target.value)}
                    className={`border rounded-lg px-3 py-2 text-sm ${
                      darkMode
                        ? "border-[#374151] bg-[#111827] text-white"
                        : "border-[#D1D5DB] bg-white text-black"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={addAlternativeRow}
                    className="px-3 py-2 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-sm"
                  >
                    Add Row
                  </button>
                </div>

                {alternativeRows.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {alternativeRows.map((row, index) => (
                      <div
                        key={`${row.name}-${index}`}
                        className={`rounded-lg border px-3 py-2 flex items-center justify-between text-sm ${
                          darkMode ? "border-[#374151]" : "border-[#E5E7EB]"
                        }`}
                      >
                        <span className={darkMode ? "text-white" : "text-[#111827]"}>
                          {row.name} ({row.quantity}) - ₱
                          {Number(row.price || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => addAlternativeToStockIn(row)}
                            disabled={isAdding}
                            className="px-2 py-1 rounded bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-xs disabled:opacity-50"
                          >
                            Add to Stock In
                          </button>
                          <button
                            type="button"
                            onClick={() => removeAlternativeRow(index)}
                            className="text-red-500 hover:text-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={addAllAlternativesToStockIn}
                        disabled={isAdding}
                        className="px-4 py-2 rounded-lg bg-[#0EA5E9] hover:bg-[#0284C7] text-white text-sm disabled:opacity-50"
                      >
                        Add All Alternative Components
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MissingComponentsModal;
