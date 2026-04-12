"use client";

import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { parseExcelDate } from "../utils/importHelpers";
import { getStatusLabel } from "../utils/stockStatus";
import {
  addParcelInItem,
  getParcelInItems,
  deleteParcelInItem,
  updateParcelInItem,
} from "../models/parcelShippedModel";
import {
  upsertProductIn,
  getProductIn,
  updateProductInQuantity,
  deleteProductInByName,
} from "../models/productModel";

export const useImportExport = ({
  isAdmin,
  parcelItems,
  productItems,
  loadItems,
}) => {
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState({
    components: [],
    products: [],
  });
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportError, setExportError] = useState("");

  const handleImportFile = (file) => {
    if (!file) return;
    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: "array" });
      let components = [];
      let products = [];

      wb.SheetNames.forEach((sheetName) => {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
          defval: "",
          raw: true,
        });
        const key = sheetName.toLowerCase();
        if (key.includes("component") || key.includes("comp")) {
          components = rows.map((row) => ({
            name: row["Item Name"] || row["item_name"] || row["name"] || "",
            quantity: parseInt(row["Stock Quantity"] || row["quantity"] || 0),
            status: row["Status"] || "",
            date: parseExcelDate(row["Date Added"] || row["date"]),
            category: row["Category"] || row["category"] || "",
          }));
        } else if (key.includes("product") || key.includes("prod")) {
          products = rows.map((row) => ({
            product_name: row["Product Name"] || row["product_name"] || "",
            quantity: parseInt(row["Stock Quantity"] || row["quantity"] || 0),
            status: row["Status"] || "",
            date: parseExcelDate(row["Date Added"] || row["date"]),
            category: row["Category"] || row["category"] || "",
          }));
        } else {
          if (!components.length) {
            components = rows.map((row) => ({
              name: row["Item Name"] || row["item_name"] || row["name"] || "",
              quantity: parseInt(row["Stock Quantity"] || row["quantity"] || 0),
              status: row["Status"] || "",
              date: parseExcelDate(row["Date Added"] || row["date"]),
              category: row["Category"] || row["category"] || "",
            }));
          } else {
            products = rows.map((row) => ({
              product_name: row["Product Name"] || row["product_name"] || "",
              quantity: parseInt(row["Stock Quantity"] || row["quantity"] || 0),
              status: row["Status"] || "",
              date: parseExcelDate(row["Date Added"] || row["date"]),
              category: row["Category"] || row["category"] || "",
            }));
          }
        }
      });

      setImportPreview({ components, products });
      setShowImportModal(true);
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmImport = async () => {
    setImportLoading(true);
    setImportResult(null);

    const today = new Date().toISOString().split("T")[0];
    const timeNow = new Date().toTimeString().split(" ")[0];

    let compAdded = 0;
    let compUpdated = 0;
    let compDeleted = 0;
    let prodAdded = 0;
    let prodUpdated = 0;
    let prodDeleted = 0;
    const errors = [];

    const { data: existingParcels } = await getParcelInItems();
    const existingParcelList = existingParcels || [];

    const excelCompNames = new Set(
      importPreview.components
        .filter((i) => i.name)
        .map((i) => i.name.toLowerCase()),
    );

    const deletedCompNames = new Set();
    for (const existing of existingParcelList) {
      const nameKey = (existing.item_name || "").toLowerCase();
      if (!excelCompNames.has(nameKey) && !deletedCompNames.has(nameKey)) {
        const result = await deleteParcelInItem(existing.id);
        if (result.error) {
          errors.push(`Failed to delete component: ${existing.item_name}`);
        } else {
          deletedCompNames.add(nameKey);
          compDeleted++;
        }
      } else if (
        !excelCompNames.has(nameKey) &&
        deletedCompNames.has(nameKey)
      ) {
        await deleteParcelInItem(existing.id);
      }
    }

    for (const item of importPreview.components) {
      if (!item.name) continue;

      const match = existingParcelList.find(
        (e) => (e.item_name || "").toLowerCase() === item.name.toLowerCase(),
      );

      if (match) {
        const result = await updateParcelInItem(match.id, {
          quantity: Number(item.quantity),
        });
        if (result.error) {
          errors.push(`Failed to update component: ${item.name}`);
        } else {
          compUpdated++;
        }
      } else {
        const result = await addParcelInItem({
          item_name: item.name,
          quantity: Number(item.quantity),
          date: item.date || today,
          time_in: timeNow,
          category: item.category || "Others",
          shipping_mode: null,
          client_name: null,
          price: null,
        });
        if (result.error) {
          errors.push(
            `Failed to add component: ${item.name} — ${result.error.message || "unknown error"}`,
          );
        } else {
          compAdded++;
        }
      }
    }

    const allProducts = await getProductIn();
    const existingProductList = Array.isArray(allProducts) ? allProducts : [];

    const excelProdNames = new Set(
      importPreview.products
        .filter((i) => i.product_name)
        .map((i) => i.product_name.toLowerCase()),
    );

    const deletedProdNames = new Set();
    for (const existing of existingProductList) {
      const nameKey = (existing.product_name || "").toLowerCase();
      if (!excelProdNames.has(nameKey) && !deletedProdNames.has(nameKey)) {
        const result = await deleteProductInByName(existing.product_name);
        if (!result.success) {
          errors.push(`Failed to delete product: ${existing.product_name}`);
        } else {
          deletedProdNames.add(nameKey);
          prodDeleted++;
        }
      }
    }

    for (const item of importPreview.products) {
      if (!item.product_name) continue;

      const existing = existingProductList.find(
        (e) =>
          (e.product_name || "").toLowerCase() ===
          item.product_name.toLowerCase(),
      );

      if (existing) {
        const result = await updateProductInQuantity(existing.id, item.quantity);
        if (!result.success) {
          errors.push(`Failed to update product: ${item.product_name}`);
        } else {
          prodUpdated++;
        }
      } else {
        const result = await upsertProductIn({
          product_name: item.product_name,
          quantity: Number(item.quantity),
          date: item.date || today,
          time_in: timeNow,
          category: item.category || "Others",
          components: [],
          shipping_mode: null,
          client_name: null,
          description: null,
          price: null,
        });
        if (result?.__error) {
          errors.push(
            `Failed to add product: ${item.product_name} — ${result.__error}`,
          );
        } else {
          prodAdded++;
        }
      }
    }

    await loadItems();

    setImportLoading(false);
    setImportResult({
      compAdded,
      compUpdated,
      compDeleted,
      prodAdded,
      prodUpdated,
      prodDeleted,
      errors,
    });

    if (errors.length === 0) {
      setTimeout(() => {
        setShowImportModal(false);
        setImportFile(null);
        setImportPreview({ components: [], products: [] });
        setImportResult(null);
      }, 2500);
    }
  };

  const exportToPDF = (parcelData = [], productData = []) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Inventory Report", 14, 18);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);

    doc.setFontSize(14);
    doc.text("Stock Status", 14, 40);
    autoTable(doc, {
      startY: 45,
      head: [["Item Name", "Stock Quantity", "Status", "Date Added"]],
      body: parcelData.map((item) => [
        item.name,
        `${item.quantity} units`,
        getStatusLabel(item.quantity),
        item.date,
      ]),
      theme: "grid",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [30, 64, 175] },
    });

    const finalY = doc.lastAutoTable.finalY || 45;
    doc.setFontSize(14);
    doc.text("EROVOUTIKA Product Status", 14, finalY + 15);
    autoTable(doc, {
      startY: finalY + 20,
      head: [["Product Name", "Stock Quantity", "Status", "Date Added"]],
      body: productData.map((item) => [
        item.product_name,
        `${item.quantity} units`,
        getStatusLabel(item.quantity),
        item.date,
      ]),
      theme: "grid",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [124, 58, 237] },
    });

    doc.save("inventory-report.pdf");
  };

  const exportToExcel = (parcelData = [], productData = []) => {
    const wb = XLSX.utils.book_new();

    const parcelRows = parcelData.map((item) => ({
      "Item Name": item.name,
      "Stock Quantity": item.quantity,
      Status: getStatusLabel(item.quantity),
      "Date Added": item.date,
    }));
    const parcelSheet = XLSX.utils.json_to_sheet(parcelRows);
    XLSX.utils.book_append_sheet(wb, parcelSheet, "Components Stock");

    const productRows = productData.map((item) => ({
      "Product Name": item.product_name,
      "Stock Quantity": item.quantity,
      Status: getStatusLabel(item.quantity),
      "Date Added": item.date,
    }));
    const productSheet = XLSX.utils.json_to_sheet(productRows);
    XLSX.utils.book_append_sheet(wb, productSheet, "Product Inventory");

    XLSX.writeFile(wb, "inventory-report.xlsx");
  };

  const exportToCSV = (parcelData = [], productData = []) => {
    const parcelRows = parcelData.map(
      (item) =>
        `"${item.name}","${item.quantity}","${getStatusLabel(item.quantity)}","${item.date}"`,
    );
    const productRows = productData.map(
      (item) =>
        `"${item.product_name}","${item.quantity}","${getStatusLabel(item.quantity)}","${item.date}"`,
    );

    const csv = [
      "STOCK STATUS",
      "Item Name,Stock Quantity,Status,Date Added",
      ...parcelRows,
      "",
      "EROVOUTIKA PRODUCT STATUS",
      "Product Name,Stock Quantity,Status,Date Added",
      ...productRows,
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToJSON = (parcelData = [], productData = []) => {
    const data = {
      generated: new Date().toLocaleString(),
      components_stock: parcelData.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        status: getStatusLabel(item.quantity),
        date: item.date,
      })),
      product_inventory: productData.map((item) => ({
        product_name: item.product_name,
        quantity: item.quantity,
        status: getStatusLabel(item.quantity),
        date: item.date,
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory-report.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToWord = (parcelData = [], productData = []) => {
    const parcelRows = parcelData
      .map(
        (item) =>
          `<tr><td>${item.name}</td><td>${item.quantity} units</td><td>${getStatusLabel(item.quantity)}</td><td>${item.date}</td></tr>`,
      )
      .join("");

    const productRows = productData
      .map(
        (item) =>
          `<tr><td>${item.product_name}</td><td>${item.quantity} units</td><td>${getStatusLabel(item.quantity)}</td><td>${item.date}</td></tr>`,
      )
      .join("");

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
      <head><meta charset="utf-8"><title>Inventory Report</title>
      <style>
        body { font-family: Calibri, sans-serif; }
        h1 { color: #1e40af; }
        h2 { color: #374151; margin-top: 24px; }
        table { border-collapse: collapse; width: 100%; margin-top: 8px; }
        th { background-color: #1e40af; color: white; padding: 8px; text-align: left; }
        td { border: 1px solid #d1d5db; padding: 8px; }
        tr:nth-child(even) { background-color: #f9fafb; }
        .generated { color: #6b7280; font-size: 12px; }
      </style>
      </head>
      <body>
        <h1>Inventory Report</h1>
        <p class="generated">Generated: ${new Date().toLocaleString()}</p>
        <h2>Stock Status</h2>
        <table>
          <thead><tr><th>Item Name</th><th>Stock Quantity</th><th>Status</th><th>Date Added</th></tr></thead>
          <tbody>${parcelRows}</tbody>
        </table>
        <h2>EROVOUTIKA Product Status</h2>
        <table>
          <thead><tr><th>Product Name</th><th>Stock Quantity</th><th>Status</th><th>Date Added</th></tr></thead>
          <tbody>${productRows}</tbody>
        </table>
      </body></html>
    `;

    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory-report.doc";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportClick = () => {
    if (!isAdmin) {
      setExportError("Only admin can run export and delete controls.");
      return;
    }
    setExportError("");
    setShowExportModal(true);
  };

  const handleExport = (format) => {
    const parcelSnapshot = [...parcelItems];
    const productSnapshot = [...productItems];

    switch (format) {
      case "pdf":
        exportToPDF(parcelSnapshot, productSnapshot);
        break;
      case "excel":
        exportToExcel(parcelSnapshot, productSnapshot);
        break;
      case "csv":
        exportToCSV(parcelSnapshot, productSnapshot);
        break;
      case "json":
        exportToJSON(parcelSnapshot, productSnapshot);
        break;
      case "word":
        exportToWord(parcelSnapshot, productSnapshot);
        break;
    }
    setShowExportModal(false);
  };

  return {
    showImportModal,
    setShowImportModal,
    importPreview,
    setImportPreview,
    importFile,
    setImportFile,
    importLoading,
    importResult,
    setImportResult,
    showExportModal,
    setShowExportModal,
    exportError,
    handleImportFile,
    confirmImport,
    handleExportClick,
    handleExport,
  };
};
