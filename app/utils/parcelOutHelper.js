import axios from "axios";
import { fetchParcelItems } from "./parcelShippedHelper";

/**
 * Fetch all parcel-out items
 */
export const fetchParcelOutItems = async () => {
  try {
    const res = await axios.get("/api/parcelDelivery");
    if (res.data.error) return [];
    return res.data.map((item) => ({
      id: item.id,
      name: item.item_name,
      date: item.date,
      quantity: item.quantity,
      timeOut: item.time_out,
      shipping_mode: item.shipping_mode,
      client_name: item.client_name,
      price: item.price,
      category: item.category,
    }));
  } catch (err) {
    console.error(
      "Failed to fetch parcel-out items:",
      err.response?.data || err.message,
    );
    return [];
  }
};

/**
 * Add a parcel-out item (with stock validation and decrement)
 */
export const addParcelOutItemHelper = async ({
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
    // Delegate validation and DB updates to server model via API
    const res = await axios.post("/api/parcelDelivery", {
      item_name,
      date,
      quantity: Number(quantity),
      time_out,
      shipping_mode,
      client_name,
      price:
        price === "" || price === null || price === undefined
          ? null
          : Number(price),
      category: category || 'Others',
    });

    // API should return the created parcel_out row
    const data = res.data;
    if (!data || data.error) {
      const msg = data?.error || "Failed to create parcel out record";
      throw new Error(msg);
    }

    return {
      id: data.id,
      name: data.item_name,
      date: data.date,
      quantity: data.quantity,
      timeOut: data.time_out,
      shipping_mode: data.shipping_mode,
      client_name: data.client_name,
      price: data.price,
      category: data.category,
    };
  } catch (err) {
    console.error("Error in addParcelOutItemHelper:", err.response?.data || err.message || err);
    alert(err.response?.data?.error || err.message || "Failed to create parcel out");
    return null;
  }
};

// High-level handler moved out of page: accepts form pieces, creates time string, adds parcel out, and returns updated lists
export const handleAddParcelOut = async ({
  item_name,
  date,
  quantity,
  timeHour,
  timeMinute,
  timeAMPM,
  shipping_mode,
  client_name,
  price,
  category,
}) => {
  const time_out = `${timeHour}:${timeMinute} ${timeAMPM}`;
  const newItem = await addParcelOutItemHelper({
    item_name,
    date,
    quantity: Number(quantity),
    time_out,
    shipping_mode,
    client_name,
    price,
    category,
  });
  if (!newItem) return null;

  // Refresh both lists for UI update
  const updatedOut = await fetchParcelOutItems();
  const updatedIn = await fetchParcelItems();

  return { newItem, updatedOut, updatedIn };
};
