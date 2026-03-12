import { supabase } from "../../lib/supabaseClient";

export const addParcelInItem = async (item) => {
  const payload = {
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
  };

  const { data, error } = await supabase
    .from("parcel_in")
    .insert([payload])
    .select();

  if (error) return { error };
  return { data };
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
