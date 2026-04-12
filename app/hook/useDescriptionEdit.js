"use client";

import { useState } from "react";
import { updateProductInDescriptionController } from "../controller/productController";

export const useDescriptionEdit = ({ setProductItems }) => {
  const [descriptionUpdateError, setDescriptionUpdateError] = useState("");
  const [expandedDescriptionIds, setExpandedDescriptionIds] = useState(
    () => new Set(),
  );
  const [editingDescriptionId, setEditingDescriptionId] = useState(null);
  const [editingDescriptionValue, setEditingDescriptionValue] = useState("");
  const [isSavingDescription, setIsSavingDescription] = useState(false);

  const toggleDescriptionExpanded = (id) => {
    setExpandedDescriptionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startEditingDescription = (item) => {
    setDescriptionUpdateError("");
    setEditingDescriptionId(item.id);
    setEditingDescriptionValue((item.description || "").toString());
  };

  const cancelEditingDescription = () => {
    setEditingDescriptionId(null);
    setEditingDescriptionValue("");
  };

  const saveEditingDescription = async (id) => {
    setDescriptionUpdateError("");
    setIsSavingDescription(true);

    const result = await updateProductInDescriptionController(
      id,
      editingDescriptionValue,
    );

    if (!result?.success) {
      setDescriptionUpdateError(
        result?.message || "Failed to update description.",
      );
      setIsSavingDescription(false);
      return;
    }

    setProductItems((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              description: result?.data?.description ?? editingDescriptionValue,
            }
          : row,
      ),
    );
    cancelEditingDescription();
    setIsSavingDescription(false);
  };

  return {
    descriptionUpdateError,
    expandedDescriptionIds,
    editingDescriptionId,
    editingDescriptionValue,
    setEditingDescriptionValue,
    isSavingDescription,
    toggleDescriptionExpanded,
    startEditingDescription,
    cancelEditingDescription,
    saveEditingDescription,
  };
};
