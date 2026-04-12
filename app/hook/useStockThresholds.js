"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_STOCK_THRESHOLDS,
  STOCK_THRESHOLDS_STORAGE_KEY,
  getThresholdKey,
  sanitizeThresholds,
} from "../utils/stockStatus";

export const useStockThresholds = () => {
  const [itemThresholds, setItemThresholds] = useState({});
  const [isThresholdsHydrated, setIsThresholdsHydrated] = useState(false);
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [thresholdTarget, setThresholdTarget] = useState(null);

  const getItemThreshold = (type, item) => {
    const key = getThresholdKey(type, item);
    return sanitizeThresholds(itemThresholds[key]);
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STOCK_THRESHOLDS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setItemThresholds(parsed);
        }
      }
    } catch (error) {
      console.error("Failed to load stock thresholds:", error);
    } finally {
      setIsThresholdsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isThresholdsHydrated) return;
    try {
      localStorage.setItem(
        STOCK_THRESHOLDS_STORAGE_KEY,
        JSON.stringify(itemThresholds || {}),
      );
    } catch (error) {
      console.error("Failed to save stock thresholds:", error);
    }
  }, [itemThresholds, isThresholdsHydrated]);

  const openThresholdModal = (type, item) => {
    setThresholdTarget({ type, item });
    setShowThresholdModal(true);
  };

  const closeThresholdModal = () => {
    setShowThresholdModal(false);
    setThresholdTarget(null);
  };

  const saveThresholdForTarget = ({ critical, low }) => {
    if (!thresholdTarget?.item) return;
    const key = getThresholdKey(thresholdTarget.type, thresholdTarget.item);
    const safe = sanitizeThresholds({ critical, low });
    setItemThresholds((prev) => ({
      ...prev,
      [key]: safe,
    }));
    closeThresholdModal();
  };

  const resetThresholdForTarget = () => {
    if (!thresholdTarget?.item) return;
    const key = getThresholdKey(thresholdTarget.type, thresholdTarget.item);
    setItemThresholds((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    closeThresholdModal();
  };

  return {
    showThresholdModal,
    thresholdTarget,
    openThresholdModal,
    closeThresholdModal,
    saveThresholdForTarget,
    resetThresholdForTarget,
    getItemThreshold,
    defaultThresholds: DEFAULT_STOCK_THRESHOLDS,
  };
};
