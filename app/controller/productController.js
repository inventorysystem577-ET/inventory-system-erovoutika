import {
  upsertProductIn,
  getProductIn,
  getProductInByName,
  deductProductIn,
  insertProductOut,
  getProductOut,
  reserveComponentsFromStock,
  rollbackReservedComponents,
  deleteAllProductInItems,
  deleteAllProductOutItems,
  updateProductInDescription,
  restoreProductInItems,
  restoreProductOutItems,
  updateProductIn,
  deleteProductIn,
  updateProductOut,
  deleteProductOut,
} from "../models/productModel";

/* =====================================
        PRODUCT IN CONTROLLER
=====================================*/

export const handleAddMultipleProductsIn = async (productsData) => {
  if (!Array.isArray(productsData) || productsData.length === 0) {
    return { success: false, message: "No products to add" };
  }

  const results = [];
  const errors = [];

  for (const product of productsData) {
    const { product_name, quantity, date, time_in, components, meta = {}, options = {} } = product;
    
    if (!product_name || !quantity) {
      errors.push({ product: product_name || 'Unknown', error: "Missing required fields" });
      continue;
    }

    const formattedComponents = Array.isArray(components)
      ? components
      : JSON.parse(components || "[]");

    const stockResult = await reserveComponentsFromStock({
      components: formattedComponents,
      date,
      time_out: time_in,
      allowAlternatives: Boolean(options.allowAlternatives),
    });

    if (!stockResult.success) {
      errors.push({
        product: product_name,
        error: stockResult.message,
        missingComponents: stockResult.missingComponents || [],
        alternativeOptions: stockResult.alternativeOptions || [],
      });
      continue;
    }

    const result = await upsertProductIn({
      product_name,
      quantity,
      date,
      time_in,
      components: formattedComponents,
      shipping_mode: meta.shipping_mode || null,
      client_name: meta.client_name || null,
      description: meta.description || null,
      price: meta.price,
      category: meta.category || 'Others',
      product_code: meta.product_code || null,
    });

    if (result?.__error || !result) {
      await rollbackReservedComponents(stockResult);
      errors.push({ product: product_name, error: result?.__error || "Error adding product" });
    } else {
      results.push({
        product: product_name,
        success: true,
        data: result,
        usedAlternatives: stockResult.usedAlternatives || [],
        deductedComponents: stockResult.stockDeductions || [],
      });
    }
  }

  return {
    success: errors.length === 0,
    results,
    errors,
    message: errors.length === 0 
      ? `Successfully added ${results.length} products`
      : `Added ${results.length} products with ${errors.length} errors`,
  };
};

// ADD / UPDATE PRODUCT IN
export const handleAddProductIn = async (
  product_name,
  quantity,
  date,
  time_in,
  components,
  meta = {},
  options = {},
) => {
  if (!product_name || !quantity) {
    return { success: false, message: "Fill all fields" };
  }

  const formattedComponents = Array.isArray(components)
    ? components
    : JSON.parse(components || "[]");

  const stockResult = await reserveComponentsFromStock({
    components: formattedComponents,
    date,
    time_out: time_in,
    allowAlternatives: Boolean(options.allowAlternatives),
  });

  if (!stockResult.success) {
    return {
      success: false,
      message: stockResult.message,
      missingComponents: stockResult.missingComponents || [],
      alternativeOptions: stockResult.alternativeOptions || [],
      usedAlternatives: stockResult.usedAlternatives || [],
      requiresAlternativeApproval: Boolean(
        stockResult.requiresAlternativeApproval,
      ),
    };
  }

  const result = await upsertProductIn({
    product_name,
    quantity,
    date,
    time_in,
    components: formattedComponents,
    shipping_mode: meta.shipping_mode || null,
    client_name: meta.client_name || null,
    description: meta.description || null,
    price: meta.price,
    category: meta.category || 'Others',
    product_code: meta.product_code || null,
  });

  if (result?.__error) {
    await rollbackReservedComponents(stockResult);
    return { success: false, message: result.__error };
  }

  if (!result) {
    await rollbackReservedComponents(stockResult);
    return { success: false, message: "Error adding/updating product" };
  }

  return {
    success: true,
    data: result,
    usedAlternatives: stockResult.usedAlternatives || [],
    deductedComponents: stockResult.stockDeductions || [],
  };
};

// FETCH PRODUCT IN
export const fetchProductInController = async () => {
  const data = await getProductIn();
  return data;
};

export const clearProductInInventory = async () => {
  return await deleteAllProductInItems();
};

export const updateProductInDescriptionController = async (id, description) => {
  return await updateProductInDescription(id, description);
};

export const restoreProductInInventory = async (rows) => {
  return await restoreProductInItems(rows);
};

/* =====================================
        PRODUCT OUT CONTROLLER
=====================================*/

// ADD PRODUCT OUT (with automatic deduction from Product IN)
export const handleAddProductOut = async (
  product_name,
  quantity,
  date,
  time_out,
  meta = {},
) => {
  if (!product_name || !quantity) {
    alert("Fill all fields");
    return;
  }

  // Step 1: Check and deduct from Product IN
  const deductResult = await deductProductIn(product_name, parseInt(quantity));

  if (!deductResult.success) {
    alert(deductResult.message);
    return;
  }

  // Step 2: Insert to Product OUT with deducted components
  const { data, error } = await insertProductOut({
    product_name,
    quantity: parseInt(quantity),
    date,
    time_out,
    components: deductResult.deductedComponents,
    shipping_mode: meta.shipping_mode || null,
    client_name: meta.client_name || null,
    description: deductResult.description || null,
    price: meta.price,
  });

  if (error) {
    console.error(error);
    alert("Error adding product OUT");
    return;
  }

  alert(
    `Product OUT added! Remaining stock: ${deductResult.remainingQuantity}`,
  );
  return data;
};

export const handleAddMultipleProductsOut = async (productsData = [], meta = {}) => {
  if (!Array.isArray(productsData) || productsData.length === 0) {
    return { success: false, message: "No products to add" };
  }

  const results = [];
  const errors = [];

  for (const product of productsData) {
    const { product_name, quantity, date, time_out, lineMeta = {} } = product || {};
    const qtyValue = Number(quantity || 0);

    if (!product_name || qtyValue <= 0 || !date || !time_out) {
      errors.push({
        product: product_name || "Unknown",
        error: "Missing required fields",
      });
      continue;
    }

    const deductResult = await deductProductIn(product_name, parseInt(qtyValue));
    if (!deductResult.success) {
      errors.push({
        product: product_name,
        error: deductResult.message || "Insufficient stock",
      });
      continue;
    }

    const combinedMeta = { ...meta, ...lineMeta };

    const { data: outRow, error: insertError } = await insertProductOut({
      product_name,
      quantity: parseInt(qtyValue),
      date,
      time_out,
      components: deductResult.deductedComponents,
      shipping_mode: combinedMeta.shipping_mode || null,
      client_name: combinedMeta.client_name || null,
      description: deductResult.description || null,
      price: combinedMeta.price,
    });

    if (insertError) {
      errors.push({
        product: product_name,
        error: insertError.message || "Failed to create Product OUT record",
      });
      continue;
    }

    results.push({
      product: product_name,
      success: true,
      data: outRow?.[0] || outRow,
      remainingQuantity: deductResult.remainingQuantity,
    });
  }

  return {
    success: errors.length === 0,
    results,
    errors,
    message:
      errors.length === 0
        ? `Successfully added ${results.length} products`
        : `Added ${results.length} products with ${errors.length} errors`,
  };
};

// FETCH PRODUCT OUT
export const fetchProductOutController = async () => {
  const data = await getProductOut();
  return data;
};

export const clearProductOutHistory = async () => {
  return await deleteAllProductOutItems();
};

export const restoreProductOutHistory = async (rows) => {
  return await restoreProductOutItems(rows);
};

/* =====================================
     INDIVIDUAL CRUD CONTROLLERS
=====================================*/

export const updateProductInController = async (id, updates) => {
  return await updateProductIn(id, updates);
};

export const deleteProductInController = async (id) => {
  return await deleteProductIn(id);
};

export const updateProductOutController = async (id, updates) => {
  return await updateProductOut(id, updates);
};

export const deleteProductOutController = async (id) => {
  return await deleteProductOut(id);
};
