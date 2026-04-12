"use client";

import { useEffect, useState } from "react";
import { buildProductCode, buildSku } from "../utils/inventoryMeta";
import {
  getStockStatus,
  matchesStatusFilter,
} from "../utils/stockStatus";
import { sortByHistoryDate } from "../utils/historyHelpers";

export const useInventoryFilters = ({
  parcelItems,
  productItems,
  getItemThreshold,
  statusParam,
  typeParam,
  focusParam,
  parcelTableRef,
  productTableRef,
}) => {
  const [filterParcelStatus, setFilterParcelStatus] = useState(
    statusParam && typeParam === "parcel" ? statusParam : "all",
  );
  const [filterProductStatus, setFilterProductStatus] = useState(
    statusParam && typeParam === "product" ? statusParam : "all",
  );
  const [parcelSearch, setParcelSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [parcelCategoryFilter, setParcelCategoryFilter] = useState("all");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [parcelSortOrder, setParcelSortOrder] = useState("default");
  const [productSortOrder, setProductSortOrder] = useState("default");
  const [parcelCurrentPage, setParcelCurrentPage] = useState(1);
  const [productCurrentPage, setProductCurrentPage] = useState(1);
  const [focusedSection, setFocusedSection] = useState(null);

  useEffect(() => {
    if (statusParam && typeParam === "parcel") {
      setFilterParcelStatus(statusParam);
      setFilterProductStatus("all");
    } else if (statusParam && typeParam === "product") {
      setFilterProductStatus(statusParam);
      setFilterParcelStatus("all");
    }
  }, [statusParam, typeParam]);

  useEffect(() => {
    const target =
      focusParam === "product-table" || typeParam === "product"
        ? "product"
        : focusParam === "parcel-table" || typeParam === "parcel"
          ? "parcel"
          : null;

    if (!target) return;

    const sectionRef = target === "product" ? productTableRef : parcelTableRef;
    if (!sectionRef.current) return;

    const scrollTimer = setTimeout(() => {
      sectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setFocusedSection(target);
    }, 120);

    const clearTimer = setTimeout(() => {
      setFocusedSection(null);
    }, 2400);

    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [
    focusParam,
    typeParam,
    parcelItems.length,
    productItems.length,
    parcelTableRef,
    productTableRef,
  ]);

  const filteredParcelItems = parcelItems.filter((item) => {
    const threshold = getItemThreshold("parcel", item);
    const statusMatch = matchesStatusFilter(
      item.quantity,
      threshold,
      filterParcelStatus,
    );
    const categoryMatch =
      parcelCategoryFilter === "all" ||
      (item.category || "").toLowerCase() ===
        parcelCategoryFilter.toLowerCase();
    const keyword = parcelSearch.trim().toLowerCase();
    if (!keyword) return statusMatch && categoryMatch;
    const code = buildProductCode(item, "CMP").toLowerCase();
    const sku = buildSku(item).toLowerCase();
    const name = (item.name || "").toLowerCase();
    return (
      statusMatch &&
      categoryMatch &&
      (name.includes(keyword) ||
        code.includes(keyword) ||
        sku.includes(keyword))
    );
  });

  const filteredProductItems = productItems.filter((item) => {
    const threshold = getItemThreshold("product", item);
    const statusMatch = matchesStatusFilter(
      item.quantity,
      threshold,
      filterProductStatus,
    );
    const categoryMatch =
      productCategoryFilter === "all" ||
      (item.category || "").toLowerCase() ===
        productCategoryFilter.toLowerCase();
    const keyword = productSearch.trim().toLowerCase();
    if (!keyword) return statusMatch && categoryMatch;
    const code = buildProductCode(item).toLowerCase();
    const sku = buildSku(item).toLowerCase();
    const name = (item.product_name || "").toLowerCase();
    return (
      statusMatch &&
      categoryMatch &&
      (name.includes(keyword) ||
        code.includes(keyword) ||
        sku.includes(keyword))
    );
  });

  const sortedParcelItems = sortByHistoryDate(filteredParcelItems, parcelSortOrder);
  const sortedProductItems = sortByHistoryDate(
    filteredProductItems,
    productSortOrder,
  );

  const PARCEL_ITEMS_PER_PAGE = 10;
  const PRODUCT_ITEMS_PER_PAGE = 5;

  const parcelTotalPages =
    Math.ceil(sortedParcelItems.length / PARCEL_ITEMS_PER_PAGE) || 1;
  const productTotalPages =
    Math.ceil(sortedProductItems.length / PRODUCT_ITEMS_PER_PAGE) || 1;

  const parcelIndexOfFirstItem =
    (parcelCurrentPage - 1) * PARCEL_ITEMS_PER_PAGE;
  const parcelIndexOfLastItem = parcelIndexOfFirstItem + PARCEL_ITEMS_PER_PAGE;
  const paginatedParcelItems = sortedParcelItems.slice(
    parcelIndexOfFirstItem,
    parcelIndexOfLastItem,
  );

  const productIndexOfFirstItem =
    (productCurrentPage - 1) * PRODUCT_ITEMS_PER_PAGE;
  const productIndexOfLastItem =
    productIndexOfFirstItem + PRODUCT_ITEMS_PER_PAGE;
  const paginatedProductItems = sortedProductItems.slice(
    productIndexOfFirstItem,
    productIndexOfLastItem,
  );

  useEffect(() => {
    setParcelCurrentPage(1);
  }, [filterParcelStatus, parcelCategoryFilter, parcelSearch, parcelSortOrder]);

  useEffect(() => {
    setProductCurrentPage(1);
  }, [
    filterProductStatus,
    productCategoryFilter,
    productSearch,
    productSortOrder,
  ]);

  useEffect(() => {
    if (parcelCurrentPage > parcelTotalPages) setParcelCurrentPage(parcelTotalPages);
  }, [parcelCurrentPage, parcelTotalPages]);

  useEffect(() => {
    if (productCurrentPage > productTotalPages) {
      setProductCurrentPage(productTotalPages);
    }
  }, [productCurrentPage, productTotalPages]);

  const countByStatus = (items = [], type) => {
    return items.reduce(
      (acc, item) => {
        const qty = Number(item.quantity || 0);
        const threshold = getItemThreshold(type, item);
        const status = getStockStatus(qty, threshold);

        if (qty <= 0) acc.out += 1;
        if (qty > 0) acc.available += 1;
        if (status === "critical") acc.critical += 1;
        if (status === "low") acc.low += 1;

        return acc;
      },
      { out: 0, critical: 0, low: 0, available: 0 },
    );
  };

  const parcelStatusCounts = countByStatus(parcelItems, "parcel");
  const productStatusCounts = countByStatus(productItems, "product");

  return {
    filterParcelStatus,
    setFilterParcelStatus,
    filterProductStatus,
    setFilterProductStatus,
    parcelSearch,
    setParcelSearch,
    productSearch,
    setProductSearch,
    parcelCategoryFilter,
    setParcelCategoryFilter,
    productCategoryFilter,
    setProductCategoryFilter,
    parcelSortOrder,
    setParcelSortOrder,
    productSortOrder,
    setProductSortOrder,
    parcelCurrentPage,
    setParcelCurrentPage,
    productCurrentPage,
    setProductCurrentPage,
    sortedParcelItems,
    sortedProductItems,
    parcelTotalPages,
    productTotalPages,
    parcelIndexOfFirstItem,
    parcelIndexOfLastItem,
    productIndexOfFirstItem,
    productIndexOfLastItem,
    paginatedParcelItems,
    paginatedProductItems,
    parcelStatusCounts,
    productStatusCounts,
    focusedSection,
  };
};
