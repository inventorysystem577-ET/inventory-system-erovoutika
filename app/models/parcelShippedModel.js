import { supabase } from "../../lib/supabaseClient";

const normalizeItemName = (value = "") => value.toString().trim();

const findExistingParcelInItem = async (payload) => {
  const itemName = normalizeItemName(payload.item_name);
  if (!itemName) return { data: [], error: null };

  let query = supabase.from("parcel_in").select("*").limit(1);

  if (payload.item_code) {
    const { data, error } = await query.eq("item_code", payload.item_code);
    if (error) {
      if (error.message?.includes("item_code") || error.code === "42703") {
        // item_code column may not exist, ignore and fall back to name search
      } else {
        return { data: [], error };
      }
    } else if (data?.length) {
      return { data, error: null };
    }
  }

  const { data, error } = await supabase
    .from("parcel_in")
    .select("*")
    .ilike("item_name", itemName)
    .limit(1);

  return { data, error };
};

export const addParcelInItem = async (item) => {
  let payload = {
    item_name: item.item_name,
    date: item.date,
    quantity: Number(item.quantity),
    time_in: item.time_in,
    shipping_mode: item.shipping_mode || null,
    client_name: item.client_name || null,
    price:
      item.price === "" || item.price === null || item.price === undefined
        ? null
        : Number(item.price),
    category: item.category || 'Others',
    item_code: item.item_code || null,
    description: item.description || null,
  };

  const existingResult = await findExistingParcelInItem(payload);
  if (existingResult.error) {
    return { error: existingResult.error };
  }

  const existing = Array.isArray(existingResult.data)
    ? existingResult.data[0]
    : existingResult.data;

  if (existing) {
    const updatedPayload = {
      item_name: existing.item_name,
      date: payload.date || existing.date,
      quantity: Number(existing.quantity || 0) + Number(payload.quantity || 0),
      time_in: payload.time_in || existing.time_in,
      shipping_mode: payload.shipping_mode || existing.shipping_mode,
      client_name: payload.client_name || existing.client_name,
      price:
        (Number(existing.price || 0) + Number(payload.price || 0)) || null,
      category: payload.category || existing.category || 'Others',
      item_code: existing.item_code || payload.item_code || null,
      description: payload.description || existing.description || null,
    };

    let updateError;
    let updatePayload = { ...updatedPayload };
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data, error } = await supabase
        .from("parcel_in")
        .update(updatePayload)
        .eq("id", existing.id)
        .select();

      if (!error) return { data };
      updateError = error;

      if (error.message?.includes("item_code") || error.code === "42703") {
        const { item_code, ...payloadWithoutCode } = updatePayload;
        updatePayload = payloadWithoutCode;
        console.warn("item_code column not found, retrying update without it");
        continue;
      }

      break;
    }

    if (updateError) {
      return { error: updateError };
    }

    return { data: null };
  }

  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await supabase
      .from("parcel_in")
      .insert([payload])
      .select();

    if (!error) return { data };
    lastError = error;

    // If item_code column doesn't exist, retry without it
    if (error.message?.includes("item_code") || error.code === "42703") {
      const { item_code, ...payloadWithoutCode } = payload;
      payload = payloadWithoutCode;
      console.warn("item_code column not found, retrying without it");
      continue;
    }

    break;
  }

  return { error: lastError };
};

export const getParcelInItems = async () => {
  const { data, error } = await supabase
    .from("parcel_in")
    .select("*")
    .order("id", { ascending: false });

  if (error) return { error };
  return { data };
};

export const deleteParcelInItem = async (id) => {
  const { data, error } = await supabase
    .from("parcel_in")
    .delete()
    .eq("id", id);

  if (error) return { error };
  return { data };
};

export const updateParcelInItem = async (id, updates) => {
  const { data, error } = await supabase
    .from("parcel_in")
    .update(updates)
    .eq("id", id)
    .select();

  if (error) return { error };
  return { data };
};

export const deleteAllParcelInItems = async () => {
  const { data, error } = await supabase
    .from("parcel_in")
    .delete()
    .not("id", "is", null)
    .select("id");

  if (error) return { error };
  return { success: true, deletedCount: Array.isArray(data) ? data.length : 0 };
};

export const restoreParcelInItems = async (rows = []) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { success: true, insertedCount: 0 };
  }

  let payload = rows.map((row) => ({
    item_name: row.item_name,
    date: row.date,
    quantity: Number(row.quantity ?? 0),
    time_in: row.time_in,
    shipping_mode: row.shipping_mode || null,
    client_name: row.client_name || null,
    price:
      row.price === "" || row.price === null || row.price === undefined
        ? null
        : Number(row.price),
    item_code: row.item_code || null,
    description: row.description || null,
  }));

  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await supabase
      .from("parcel_in")
      .insert(payload)
      .select("id");

    if (!error) return { success: true, insertedCount: Array.isArray(data) ? data.length : 0 };
    lastError = error;

    // If item_code column doesn't exist, retry without it
    if (error.message?.includes("item_code") || error.code === "42703") {
      payload = payload.map(({ item_code, ...rest }) => rest);
      console.warn("item_code column not found, retrying without it");
      continue;
    }

    break;
  }

  return { success: false, error: lastError };
};
