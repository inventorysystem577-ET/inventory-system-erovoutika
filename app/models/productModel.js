import { supabase } from "../../lib/supabaseClient";

const normalizeName = (value = "") =>
  value.toString().trim().toLowerCase().replace(/\s+/g, " ");

const toNumber = (value) => Number(value || 0);

const formatSupabaseError = (
  error,
  fallback = "Database operation failed.",
) => {
  if (!error) return fallback;
  const code = error.code || "";
  const message = error.message || "";
  const details = error.details || "";
  const hint = error.hint || "";
  const raw = `${code} ${message} ${details} ${hint}`.toLowerCase();

  if (
    code === "PGRST204" ||
    code === "42703" ||
    (raw.includes("description") &&
      (raw.includes("schema cache") || raw.includes("column")))
  ) {
    return "Missing 'description' column in DB. Run the SQL migration for product_in and products_out.";
  }

  return [code, message, details, hint].filter(Boolean).join(" | ") || fallback;
};

const parseComponentCandidates = (componentName) => {
  const raw = (componentName || "")
    .split(/\s+or\s+/i)
    .map((item) => item.trim());
  return raw.filter(Boolean);
};

const cloneStockRows = (rows) =>
  rows.map((row) => ({
    ...row,
    quantity: toNumber(row.quantity),
    original_quantity: toNumber(row.quantity),
    price:
      row.price === null || row.price === undefined
        ? null
        : toNumber(row.price),
  }));

const totalAvailableForCandidate = (rows, candidateName) => {
  const candidateKey = normalizeName(candidateName);
  return rows
    .filter((row) => normalizeName(row.item_name) === candidateKey)
    .reduce((sum, row) => sum + toNumber(row.quantity), 0);
};

// ===============================
//   UPDATE PRODUCT IN QUANTITY
// ===============================
export const updateProductInQuantity = async (id, quantity) => {
  const { data, error } = await supabase
    .from("product_in")
    .update({ quantity: Number(quantity) })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("updateProductInQuantity error:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return { success: false, error };
  }
  return { success: true, data };
};

// ===============================
//   DELETE PRODUCT IN BY NAME
// ===============================
export const deleteProductInByName = async (product_name) => {
  const { error } = await supabase
    .from("product_in")
    .delete()
    .eq("product_name", product_name);

  if (error) {
    console.error("deleteProductInByName error:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return { success: false, error };
  }
  return { success: true };
};

const consumeCandidateStock = (rows, candidateName, requiredQty) => {
  const candidateKey = normalizeName(candidateName);
  let remaining = toNumber(requiredQty);
  const operations = [];

  for (const row of rows) {
    if (remaining <= 0) break;
    if (normalizeName(row.item_name) !== candidateKey) continue;
    if (row.quantity <= 0) continue;

    const consumed = Math.min(row.quantity, remaining);
    const unitPrice =
      toNumber(row.original_quantity) > 0 && row.price !== null
        ? toNumber(row.price) / toNumber(row.original_quantity)
        : 0;
    const consumedPrice = unitPrice * consumed;
    row.quantity -= consumed;
    remaining -= consumed;
    operations.push({
      rowId: row.id,
      item_name: row.item_name,
      consumed,
      consumedPrice,
      newQuantity: row.quantity,
    });
  }

  return {
    consumed: toNumber(requiredQty) - remaining,
    remaining,
    operations,
  };
};

export const reserveComponentsFromStock = async ({
  components = [],
  date,
  time_out,
  allowAlternatives = false,
}) => {
  if (!Array.isArray(components) || components.length === 0) {
    return {
      success: true,
      usedAlternatives: [],
      alternativeOptions: [],
      missingComponents: [],
      stockDeductions: [],
    };
  }

  const { data: parcelInRows, error: parcelInError } = await supabase
    .from("parcel_in")
    .select("id, item_name, quantity, price")
    .gt("quantity", 0);

  if (parcelInError) {
    console.error("Supabase fetch error:", parcelInError);
    return {
      success: false,
      message: "Error checking stock-in components",
      missingComponents: [],
      alternativeOptions: [],
      usedAlternatives: [],
    };
  }

  const workingRows = cloneStockRows(parcelInRows || []);
  const stockDeductions = [];
  const usedAlternatives = [];
  const missingComponents = [];
  const alternativeOptions = [];

  for (const component of components) {
    const componentName = component?.name || "";
    const neededQty = toNumber(component?.quantity);
    if (!componentName || neededQty <= 0) continue;

    const candidates = parseComponentCandidates(componentName);
    if (candidates.length === 0) continue;

    const primaryName = candidates[0];
    const primaryAvailable = totalAvailableForCandidate(
      workingRows,
      primaryName,
    );

    const primaryConsumption = consumeCandidateStock(
      workingRows,
      primaryName,
      neededQty,
    );
    if (primaryConsumption.consumed > 0) {
      stockDeductions.push(...primaryConsumption.operations);
    }

    let remaining = primaryConsumption.remaining;
    let alternativeUsed = false;

    if (remaining > 0 && candidates.length > 1) {
      const suggestions = candidates
        .slice(1)
        .map((name) => ({
          name,
          available: totalAvailableForCandidate(workingRows, name),
        }))
        .filter((item) => item.available > 0);

      if (suggestions.length > 0 && !allowAlternatives) {
        alternativeOptions.push({
          component: componentName,
          needed: neededQty,
          primaryAvailable,
          suggestions,
        });
        continue;
      }

      if (allowAlternatives) {
        for (const candidateName of candidates.slice(1)) {
          if (remaining <= 0) break;
          const consumption = consumeCandidateStock(
            workingRows,
            candidateName,
            remaining,
          );
          if (consumption.consumed > 0) {
            stockDeductions.push(...consumption.operations);
            usedAlternatives.push({
              forComponent: componentName,
              alternative: candidateName,
              quantity: consumption.consumed,
            });
            remaining = consumption.remaining;
            alternativeUsed = true;
          }
        }
      }
    }

    if (remaining > 0) {
      missingComponents.push({
        component: componentName,
        needed: neededQty,
        available: neededQty - remaining,
      });
      continue;
    }

    if (
      !alternativeUsed &&
      primaryConsumption.consumed < neededQty &&
      candidates.length === 1
    ) {
      missingComponents.push({
        component: componentName,
        needed: neededQty,
        available: primaryConsumption.consumed,
      });
    }
  }

  if (missingComponents.length > 0) {
    return {
      success: false,
      message: "Not enough component stock in Stock In.",
      missingComponents,
      alternativeOptions,
      usedAlternatives,
    };
  }

  if (alternativeOptions.length > 0 && !allowAlternatives) {
    return {
      success: false,
      requiresAlternativeApproval: true,
      message: "Alternative materials are available.",
      alternativeOptions,
      missingComponents: [],
      usedAlternatives: [],
    };
  }

  const originalById = new Map(
    (parcelInRows || []).map((row) => [row.id, toNumber(row.quantity)]),
  );
  const updates = workingRows
    .filter((row) => originalById.get(row.id) !== toNumber(row.quantity))
    .map((row) =>
      supabase
        .from("parcel_in")
        .update({ quantity: toNumber(row.quantity) })
        .eq("id", row.id),
    );

  const updateResults = await Promise.all(updates);
  const failedUpdate = updateResults.find((result) => result.error);
  if (failedUpdate?.error) {
    console.error("Supabase update error:", failedUpdate.error);
    return {
      success: false,
      message: "Failed to update stock-in quantities.",
      missingComponents: [],
      alternativeOptions: [],
      usedAlternatives: [],
    };
  }

  const logsByItem = stockDeductions.reduce((acc, deduction) => {
    if (!deduction.item_name || deduction.consumed <= 0) return acc;
    const key = normalizeName(deduction.item_name);
    const current = acc.get(key) || {
      item_name: deduction.item_name,
      quantity: 0,
      price: 0,
    };
    current.quantity += deduction.consumed;
    current.price += toNumber(deduction.consumedPrice);
    acc.set(key, current);
    return acc;
  }, new Map());

  const logs = Array.from(logsByItem.values()).map((item) => ({
    item_name: item.item_name,
    date,
    quantity: item.quantity,
    time_out,
    price: item.price > 0 ? item.price : null,
  }));

  if (logs.length > 0) {
    const { error: parcelOutError } = await supabase
      .from("parcel_out")
      .insert(logs);
    if (parcelOutError) {
      console.error("Supabase insert error:", parcelOutError);
      return {
        success: false,
        message: "Component deducted but failed to log Stock Out.",
        missingComponents: [],
        alternativeOptions: [],
        usedAlternatives,
      };
    }
  }

  return {
    success: true,
    missingComponents: [],
    alternativeOptions: [],
    usedAlternatives,
    stockDeductions: logs,
  };
};

/* ===============================
        PRODUCT IN MODEL
================================*/

export const upsertProductIn = async (data) => {
  const payload = {
    product_name: data.product_name,
    quantity: Number(data.quantity ?? 0),
    date: data.date || new Date().toISOString().split("T")[0],
    time_in: data.time_in || new Date().toTimeString().split(" ")[0],
    components: JSON.stringify(
      Array.isArray(data.components) ? data.components : [],
    ),
    shipping_mode: data.shipping_mode || null,
    client_name: data.client_name || null,
    description: data.description
      ? data.description.toString().trim() || null
      : null,
    category: data.category || "Others",
    price:
      data.price === "" || data.price === null || data.price === undefined
        ? null
        : Number(data.price),
  };

  const { data: insertedData, error: insertError } = await supabase
    .from("product_in")
    .insert([payload])
    .select();

  if (insertError) {
    console.error("upsertProductIn error:", JSON.stringify(insertError));
    return {
      __error: formatSupabaseError(
        insertError,
        "Error adding/updating product",
      ),
    };
  }

  return insertedData[0];
};

export const getProductIn = async () => {
  const { data, error } = await supabase
    .from("product_in")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    console.error("Supabase fetch error:", error);
    return [];
  }
  return data.map((item) => ({
    ...item,
    components: Array.isArray(item.components)
      ? item.components
      : JSON.parse(item.components || "[]"),
  }));
};

export const deleteAllProductInItems = async () => {
  const { data, error } = await supabase
    .from("product_in")
    .delete()
    .not("id", "is", null)
    .select("id");

  if (error) return { success: false, error };
  return { success: true, deletedCount: Array.isArray(data) ? data.length : 0 };
};

export const updateProductInDescription = async (id, description) => {
  const cleaned = (description ?? "").toString().trim();
  const payload = { description: cleaned ? cleaned : null };

  const { data, error } = await supabase
    .from("product_in")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return {
      success: false,
      error,
      message: formatSupabaseError(error, "Failed to update description."),
    };
  }
  return { success: true, data };
};

export const restoreProductInItems = async (rows = []) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { success: true, insertedCount: 0 };
  }

  const payload = rows.map((row) => ({
    product_name: row.product_name,
    quantity: Number(row.quantity ?? 0),
    date: row.date,
    time_in: row.time_in,
    components: Array.isArray(row.components) ? row.components : [],
    shipping_mode: row.shipping_mode || null,
    client_name: row.client_name || null,
    description: (row.description || "").toString().trim() || null,
    price:
      row.price === "" || row.price === null || row.price === undefined
        ? null
        : Number(row.price),
  }));

  const { data, error } = await supabase
    .from("product_in")
    .insert(payload)
    .select("id");

  if (error) return { success: false, error };
  return {
    success: true,
    insertedCount: Array.isArray(data) ? data.length : 0,
  };
};

export const getProductInByName = async (product_name) => {
  const { data, error } = await supabase
    .from("product_in")
    .select("*")
    .eq("product_name", product_name)
    .order("id", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Supabase fetch error:", error);
    return null;
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;

  return {
    ...row,
    components: Array.isArray(row.components)
      ? row.components
      : JSON.parse(row.components || "[]"),
  };
};

export const deductProductIn = async (product_name, quantity) => {
  const requestedQty = toNumber(quantity);
  const { data: productRows, error } = await supabase
    .from("product_in")
    .select("*")
    .eq("product_name", product_name)
    .gt("quantity", 0)
    .order("id", { ascending: true });

  if (error) {
    console.error("Product not found in inventory:", error);
    return { success: false, message: "Product not found in inventory" };
  }

  const rows = productRows || [];
  const totalAvailable = rows.reduce(
    (sum, row) => sum + toNumber(row.quantity),
    0,
  );

  if (totalAvailable < requestedQty) {
    return {
      success: false,
      message: `Not enough stock! Available: ${totalAvailable}, Requested: ${requestedQty}`,
    };
  }

  let remainingToDeduct = requestedQty;
  const deductedComponentsMap = new Map();
  let carriedDescription = null;

  for (const row of rows) {
    if (remainingToDeduct <= 0) break;

    const rowQty = toNumber(row.quantity);
    if (rowQty <= 0) continue;

    const consumedQty = Math.min(rowQty, remainingToDeduct);
    const newQuantity = rowQty - consumedQty;
    if (!carriedDescription && consumedQty > 0) {
      const sourceDescription = (row.description || "").toString().trim();
      if (sourceDescription) carriedDescription = sourceDescription;
    }

    const existingComponents = Array.isArray(row.components)
      ? row.components
      : JSON.parse(row.components || "[]");

    const remainingComponents = existingComponents.map((comp) => {
      const componentQty = toNumber(comp.quantity);
      const perUnit = rowQty > 0 ? componentQty / rowQty : 0;
      const deductAmount = perUnit * consumedQty;
      const nextQty = Math.max(componentQty - deductAmount, 0);

      if (deductAmount > 0) {
        const previous = deductedComponentsMap.get(comp.name) || 0;
        deductedComponentsMap.set(comp.name, previous + deductAmount);
      }

      return { name: comp.name, quantity: nextQty };
    });

    const { error: updateError } = await supabase
      .from("product_in")
      .update({ quantity: newQuantity, components: remainingComponents })
      .eq("id", row.id);

    if (updateError) {
      console.error("Supabase update error:", updateError);
      return { success: false, message: "Error updating inventory" };
    }

    remainingToDeduct -= consumedQty;
  }

  const deductedComponents = Array.from(deductedComponentsMap.entries()).map(
    ([name, qty]) => ({ name, quantity: qty }),
  );

  return {
    success: true,
    deductedComponents,
    description: carriedDescription,
    remainingQuantity: totalAvailable - requestedQty,
  };
};

/* ===============================
        PRODUCT OUT MODEL
================================*/

export const insertProductOut = async (data) => {
  const payload = {
    ...data,
    shipping_mode: data.shipping_mode || null,
    client_name: data.client_name || null,
    description: data.description || null,
    price:
      data.price === "" || data.price === null || data.price === undefined
        ? null
        : Number(data.price),
  };

  const { data: insertedData, error } = await supabase
    .from("products_out")
    .insert([payload])
    .select();

  if (error) {
    console.error("Supabase insert error:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return { data: null, error };
  }

  return { data: insertedData, error: null };
};

export const getProductOut = async () => {
  const { data, error } = await supabase
    .from("products_out")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    console.error("Supabase fetch error:", error);
    return [];
  }

  return data.map((item) => ({
    ...item,
    components: Array.isArray(item.components)
      ? item.components
      : JSON.parse(item.components || "[]"),
  }));
};

export const deleteAllProductOutItems = async () => {
  const { data, error } = await supabase
    .from("products_out")
    .delete()
    .not("id", "is", null)
    .select("id");

  if (error) return { success: false, error };
  return { success: true, deletedCount: Array.isArray(data) ? data.length : 0 };
};

export const restoreProductOutItems = async (rows = []) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { success: true, insertedCount: 0 };
  }

  const payload = rows.map((row) => ({
    product_name: row.product_name,
    quantity: Number(row.quantity ?? 0),
    date: row.date,
    time_out: row.time_out,
    components: Array.isArray(row.components) ? row.components : [],
    shipping_mode: row.shipping_mode || null,
    client_name: row.client_name || null,
    description: (row.description || "").toString().trim() || null,
    price:
      row.price === "" || row.price === null || row.price === undefined
        ? null
        : Number(row.price),
  }));

  const { data, error } = await supabase
    .from("products_out")
    .insert(payload)
    .select("id");

  if (error) return { success: false, error };
  return {
    success: true,
    insertedCount: Array.isArray(data) ? data.length : 0,
  };
};

/* ===============================
     INDIVIDUAL CRUD OPERATIONS
================================*/

export const updateProductIn = async (id, updates) => {
  const { data, error } = await supabase
    .from("product_in")
    .update(updates)
    .eq("id", id)
    .select();
  if (error) return { error };
  return { data };
};

export const deleteProductIn = async (id) => {
  const { data, error } = await supabase
    .from("product_in")
    .delete()
    .eq("id", id);
  if (error) return { error };
  return { data };
};

export const updateProductOut = async (id, updates) => {
  const { data, error } = await supabase
    .from("products_out")
    .update(updates)
    .eq("id", id)
    .select();
  if (error) return { error };
  return { data };
};

export const deleteProductOut = async (id) => {
  const { data, error } = await supabase
    .from("products_out")
    .delete()
    .eq("id", id);
  if (error) return { error };
  return { data };
};
