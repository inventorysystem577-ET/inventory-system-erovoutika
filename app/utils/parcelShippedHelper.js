// utils/parcelHelper.js
import axios from "axios";

// Fetch all parcel-in items
export const fetchParcelItems = async () => {
  try {
    const res = await axios.get("/api/parcelShipped");
    return res.data.map((item) => ({
      id: item.id,
      name: item.item_name,
      date: item.date,
      quantity: item.quantity,
      timeIn: item.time_in,
      shipping_mode: item.shipping_mode,
      client_name: item.client_name,
      price: item.price,
      category: item.category,
    }));
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
      category: category || 'Others',
    });
    const data = res.data;
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
