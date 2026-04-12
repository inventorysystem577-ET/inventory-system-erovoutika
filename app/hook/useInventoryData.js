"use client";

import { useEffect, useState } from "react";
import {
  fetchProductInController,
  fetchProductOutController,
} from "../controller/productController";
import { fetchParcelItems } from "../utils/parcelShippedHelper";
import { fetchParcelOutItems } from "../utils/parcelOutHelper";
import { updateParcelInItem } from "../models/parcelShippedModel";
import { updateProductIn } from "../models/productModel";
import { CATEGORIES, PRODUCT_CATEGORIES } from "../utils/categoryUtils";

export const useInventoryData = () => {
  const [parcelItems, setParcelItems] = useState([]);
  const [productItems, setProductItems] = useState([]);
  const [parcelOutItems, setParcelOutItems] = useState([]);
  const [productOutItems, setProductOutItems] = useState([]);
  const [isUpdatingCategoryId, setIsUpdatingCategoryId] = useState(null);
  const [categoryTransferError, setCategoryTransferError] = useState("");
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [timeframePreview, setTimeframePreview] = useState(null);

  const loadItems = async () => {
    const parcelData = await fetchParcelItems();
    const parcelOutData = await fetchParcelOutItems();
    const productData = await fetchProductInController();
    const productOutData = await fetchProductOutController();
    setParcelItems(parcelData || []);
    setParcelOutItems(parcelOutData || []);
    setProductItems(productData || []);
    setProductOutItems(productOutData || []);
  };

  useEffect(() => {
    loadItems();
  }, []);

  const openHistoryModal = (type, item) => {
    setHistoryTarget({ type, item });
    setShowHistoryModal(true);
  };

  const closeHistoryModal = () => {
    setShowHistoryModal(false);
    setHistoryTarget(null);
    setTimeframePreview(null);
  };

  const getDisplayedQuantity = (type, item) => {
    if (
      !timeframePreview ||
      timeframePreview.type !== type ||
      timeframePreview.id !== item?.id
    ) {
      return Number(item?.quantity || 0);
    }
    return timeframePreview.quantity;
  };

  const transferCategory = async ({ type, id, nextCategory }) => {
    setCategoryTransferError("");
    setIsUpdatingCategoryId(id);
    const categoryValue =
      nextCategory ||
      (type === "product" ? PRODUCT_CATEGORIES.OTHER : CATEGORIES.OTHERS);

    try {
      if (type === "parcel") {
        const result = await updateParcelInItem(id, { category: categoryValue });
        if (result?.error) throw result.error;
        setParcelItems((prev) =>
          prev.map((row) =>
            row.id === id ? { ...row, category: categoryValue } : row,
          ),
        );
      }

      if (type === "product") {
        const result = await updateProductIn(id, { category: categoryValue });
        if (result?.error) throw result.error;
        setProductItems((prev) =>
          prev.map((row) =>
            row.id === id ? { ...row, category: categoryValue } : row,
          ),
        );
      }
    } catch (err) {
      setCategoryTransferError(
        err?.message || "Failed to transfer category. Please try again.",
      );
    } finally {
      setIsUpdatingCategoryId(null);
    }
  };

  return {
    parcelItems,
    productItems,
    parcelOutItems,
    productOutItems,
    loadItems,
    setProductItems,
    setParcelItems,
    isUpdatingCategoryId,
    categoryTransferError,
    transferCategory,
    showHistoryModal,
    historyTarget,
    timeframePreview,
    setTimeframePreview,
    openHistoryModal,
    closeHistoryModal,
    getDisplayedQuantity,
  };
};
