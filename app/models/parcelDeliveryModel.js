import { supabase } from "../../lib/supabaseClient";

export const addParcelOutItem = async ({
  item_name,
  date,
  quantity,
  time_out,
  shipping_mode,
  client_name,
  price,
  category,
}) => {
  try {
    // Check available stock across all matching stock-in rows
    const { data: inItems, error: inError } = await supabase
      .from("parcel_in")
      .select("id, quantity, item_name")
      .eq("item_name", item_name);

    if (inError) throw inError;
    if (!inItems || inItems.length === 0) throw new Error("Item not found in stock");

    const available = inItems.reduce(
      (sum, row) => sum + Number(row.quantity || 0),
      0,
    );
    if (available < Number(quantity)) {
      throw new Error(
        `Not enough stock available. Available: ${available}, Requested: ${quantity}`,
      );
    }

    // Insert parcel-out
    const { data: outData, error: outError } = await supabase
      .from("parcel_out")
      .insert([
        {
          item_name,
          date,
          quantity: Number(quantity),
          time_out,
          shipping_mode: shipping_mode || null,
          client_name: client_name || null,
          price:
            price === "" || price === null || price === undefined
              ? null
              : Number(price),
          category: category || 'Others',
        },
      ])
      .select()
      .single();
    if (outError) throw outError;

    // Decrement parcel-in stock across rows (FIFO by id)
    let remaining = Number(quantity);
    const sortedRows = [...inItems].sort((a, b) => a.id - b.id);
    for (const row of sortedRows) {
      if (remaining <= 0) break;
      const rowQty = Number(row.quantity || 0);
      if (rowQty <= 0) continue;
      const consumed = Math.min(rowQty, remaining);
      const newQty = rowQty - consumed;
      const { error: updateError } = await supabase
        .from("parcel_in")
        .update({ quantity: newQty })
        .eq("id", row.id);

      if (updateError) throw updateError;
      remaining -= consumed;
    }

    return { data: outData };
  } catch (err) {
    return { error: err };
  }
};

export const getParcelOutItems = async () => {
  const { data, error } = await supabase
    .from("parcel_out")
    .select("*")
    .order("id", { ascending: false });
  return error ? { error } : { data };
};

export const updateParcelOutItem = async (id, updates) => {
  const { data, error } = await supabase
    .from("parcel_out")
    .update(updates)
    .eq("id", id)
    .select();
  return error ? { error } : { data };
};

export const deleteParcelOutItem = async (id) => {
  const { data, error } = await supabase
    .from("parcel_out")
    .delete()
    .eq("id", id);
  return error ? { error } : { data };
};

export const deleteAllParcelOutItems = async () => {
  const { data, error } = await supabase
    .from("parcel_out")
    .delete()
    .not("id", "is", null)
    .select("id");

  if (error) return { success: false, error };
  return { success: true, deletedCount: Array.isArray(data) ? data.length : 0 };
};
