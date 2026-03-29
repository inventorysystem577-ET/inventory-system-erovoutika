// utils/parcelHelper.js
import axios from "axios";
import { DATABASE_CATEGORY_MAP } from "./categoryUtils.js";

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
}) => {
  try {
    // Map category to database-compatible value
    const dbCategory = DATABASE_CATEGORY_MAP[category] || category;
    
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
  });
  if (!newItem) return null;

  // Return newly added item and refreshed list
  const items = await fetchParcelItems();
  return { newItem, items };
};
