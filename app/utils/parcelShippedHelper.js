// utils/parcelHelper.js
import axios from "axios";
import { CATEGORIES, getCategoryDisplayName } from "./categoryUtils.js";

// Fetch all parcel-in items
export const fetchParcelItems = async () => {
  try {
    const res = await axios.get("/api/parcelShipped");
    return res.data.map((item) => {
      // Reverse mapping from database category to display category
      const reverseMap = {
        'Component': 'Electronics',
        'Product': 'Merchandise',
        'Tool': 'Tools',
        'Others': 'Others'
      };
      
      // For new categories, check if they're already in correct format
      const displayCategory = 
        item.category === 'EROV_PRODUCT' || 
        item.category === 'JSUMO_PRODUCT' || 
        item.category === 'ZM_ROBO_PRODUCT' ||
        item.category === 'Electronics' ||
        item.category === 'Merchandise' ||
        item.category === 'Components'
          ? item.category 
          : reverseMap[item.category] || item.category;
          
      return {
        id: item.id,
        name: item.item_name,
        date: item.date,
        quantity: item.quantity,
        timeIn: item.time_in,
        shipping_mode: item.shipping_mode,
        client_name: item.client_name,
        price: item.price,
        category: displayCategory,
        item_code: item.item_code,
      };
    });
  } catch (err) {
    console.error(err);
    return [];
  }
};

// Add a new parcel-in item
export const addParcelItem = async ({
  item_name,
  date,
  quantity,
  time_in,
  shipping_mode,
  client_name,
  price,
  category,
  item_code,
}) => {
  try {
    // Use category directly since we're now using the correct format
    const dbCategory = category;
    
    const res = await axios.post("/api/parcelShipped", {
      item_name,
      date,
      quantity,
      time_in,
      shipping_mode,
      client_name,
      price:
        price === "" || price === null || price === undefined
          ? null
          : Number(price),
      category: dbCategory, // Use mapped category for database
      item_code: item_code || null,
    });
    return {
      id: res.data.id,
      name: res.data.item_name,
      date: res.data.date,
      quantity: res.data.quantity,
      timeIn: res.data.time_in,
      shipping_mode: res.data.shipping_mode,
      client_name: res.data.client_name,
      price: res.data.price,
      category: category, // Keep original category for display
      item_code: res.data.item_code,
    };
  } catch (err) {
    console.error(err.response?.data || err.message);
    return null;
  }
};

// High-level handler moved out of page: accepts form pieces, creates time string and adds item
export const handleAddParcelIn = async ({
  name,
  date,
  quantity,
  timeHour,
  timeMinute,
  timeAMPM,
  shipping_mode,
  client_name,
  price,
  category,
  item_code,
}) => {
  const timeString = `${timeHour}:${timeMinute} ${timeAMPM}`;
  const newItem = await addParcelItem({
    item_name: name,
    date,
    quantity: Number(quantity),
    time_in: timeString,
    shipping_mode,
    client_name,
    price,
    category,
    item_code,
  });
  if (!newItem) return null;

  // Return newly added item and refreshed list
  const items = await fetchParcelItems();
  return { newItem, items };
};

export const updateParcelInItemHelper = async (id, updates = {}) => {
  try {
    const res = await axios.put("/api/parcelShipped", { id, updates });
    const data = res.data;
    if (!data || data.error) {
      throw new Error(data?.error || "Failed to update item");
    }

    return {
      id: data.id,
      name: data.item_name,
      date: data.date,
      quantity: data.quantity,
      timeIn: data.time_in,
      shipping_mode: data.shipping_mode,
      client_name: data.client_name,
      price: data.price,
      category: data.category,
      item_code: data.item_code,
    };
  } catch (err) {
    console.error(
      "updateParcelInItemHelper error:",
      err.response?.data || err.message,
    );
    return null;
  }
};
