import { useState } from "react";
import { handleAddParcelIn } from "../utils/parcelShippedHelper";
import { logActivity } from "../utils/logActivity";
import { CATEGORIES } from "../utils/categoryUtils";

const buildDefaultRow = () => {
  const now = new Date();
  let hour = now.getHours();
  const minute = now.getMinutes();
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  hour = hour ? hour : 12;

  return {
    name: "",
    date: now.toISOString().slice(0, 10),
    quantity: 1,
    timeHour: String(hour),
    timeMinute: minute < 10 ? `0${minute}` : String(minute),
    timeAMPM: ampm,
    shipping_mode: "",
    client_name: "",
    price: "",
    category: CATEGORIES.OTHERS,
  };
};

export default function useBulkStockInForm({ onSuccess, actor }) {
  const [bulkRows, setBulkRows] = useState([buildDefaultRow()]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const addRow = () => {
    setBulkRows((prev) => [...prev, buildDefaultRow()]);
  };

  const removeRow = (indexToRemove) => {
    setBulkRows((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const updateRow = (indexToUpdate, field, value) => {
    setBulkRows((prev) =>
      prev.map((row, index) =>
        index === indexToUpdate ? { ...row, [field]: value } : row,
      ),
    );
  };

  const validateAllRows = () => {
    if (!bulkRows.length) {
      return "Add at least one row.";
    }

    for (let i = 0; i < bulkRows.length; i += 1) {
      const row = bulkRows[i];
      if (!row.name?.trim()) return `Row ${i + 1}: Item Name is required.`;
      if (!row.date) return `Row ${i + 1}: Date is required.`;
      if (!Number(row.quantity) || Number(row.quantity) <= 0) {
        return `Row ${i + 1}: Quantity must be greater than 0.`;
      }
      if (!row.timeHour || !row.timeMinute || !row.timeAMPM) {
        return `Row ${i + 1}: Time is required.`;
      }
      if (!row.category) return `Row ${i + 1}: Category is required.`;
    }

    return "";
  };

  const handleBulkSubmit = async () => {
    setError("");
    setMessage("");

    const validationError = validateAllRows();
    if (validationError) {
      setError(validationError);
      return false;
    }

    const confirmed = window.confirm(
      `Confirm Stock In: Add ${bulkRows.length} rows?`,
    );
    if (!confirmed) return false;

    for (let i = 0; i < bulkRows.length; i += 1) {
      const row = bulkRows[i];
      const computedTotalPrice =
        (Number(row.price) || 0) * (Number(row.quantity) || 0);

      const result = await handleAddParcelIn({
        name: row.name.trim(),
        date: row.date,
        quantity: Number(row.quantity),
        timeHour: row.timeHour,
        timeMinute: row.timeMinute,
        timeAMPM: row.timeAMPM,
        shipping_mode: row.shipping_mode,
        client_name: row.client_name,
        price: computedTotalPrice,
        category: row.category || CATEGORIES.OTHERS,
      });

      if (!result || !result.newItem) {
        setError(`Failed while submitting row ${i + 1}. Nothing else was queued.`);
        return false;
      }
    }

    await logActivity({
      userId: actor?.userEmail || null,
      userName: actor?.displayName || actor?.userEmail || "Unknown User",
      userType: actor?.role || "staff",
      action: "Stock IN",
      module: "Inventory",
      details: `Added ${bulkRows.length} stock-in rows in multiple mode`,
    });

    setBulkRows([buildDefaultRow()]);
    setMessage(`Added ${bulkRows.length} rows to Stock In.`);
    if (typeof onSuccess === "function") {
      await onSuccess();
    }
    return true;
  };

  return {
    bulkRows,
    addRow,
    removeRow,
    updateRow,
    validateAllRows,
    handleBulkSubmit,
    error,
    message,
  };
}
