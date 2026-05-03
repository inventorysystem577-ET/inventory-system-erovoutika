import { supabase } from "../../lib/supabaseClient";

export const addParcelInItem = async (item) => {
  let payload = {
    item_name: item.item_name,
    date: item.date,
    quantity: Number(item.quantity),
    time_in: item.time_in,
    shipping_mode: item.shipping_mode || null,
    client_name: item.client_name || null,
    price: item.price === "" || item.price === null || item.price === undefined
      ? null
      : Number(item.price),
    category: item.category || 'Others',
    item_code: item.item_code || null,
  };

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
