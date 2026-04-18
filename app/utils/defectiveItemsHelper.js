// Defective Items Management Utility
// Handles marking items as defective and deducting from inventory

const DEFECTIVE_ITEMS_KEY = "defective-items-records-v1";

// Get all defective item records
export const getDefectiveItems = () => {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(DEFECTIVE_ITEMS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error loading defective items:", error);
    return [];
  }
};

// Save defective item records
export const saveDefectiveItems = (items) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DEFECTIVE_ITEMS_KEY, JSON.stringify(items));
  } catch (error) {
    console.error("Error saving defective items:", error);
  }
};

// Add a new defective item record
export const addDefectiveItem = async ({
  itemName,
  quantity,
  reason,
  date,
  category = "Others",
}) => {
  try {
    // Get current defective items
    const defectiveItems = getDefectiveItems();
    
    // Create new record
    const newRecord = {
      id: Date.now(),
      itemName,
      quantity: Number(quantity),
      reason,
      date,
      category,
      createdAt: new Date().toISOString(),
    };
    
    // Add to defective items
    const updatedDefectiveItems = [newRecord, ...defectiveItems];
    saveDefectiveItems(updatedDefectiveItems);
    
    // Update inventory - deduct the defective quantity
    // This updates the parcel shipped items (inventory)
    const { getParcelInItems, updateParcelInItem } = await import("../models/parcelShippedModel");
    const inventoryResult = await getParcelInItems();
    const inventoryItems = inventoryResult.data || [];
    
    if (inventoryResult.error) {
      return { success: false, error: inventoryResult.error.message };
    }
    
    // Find the item in inventory and deduct quantity
    // Note: database field is 'item_name' not 'name'
    console.log("Searching for item:", itemName, "in inventory of", inventoryItems.length, "items");
    console.log("First few items:", inventoryItems.slice(0, 3).map(i => ({ id: i.id, item_name: i.item_name, name: i.name })));
    
    const inventoryItem = inventoryItems.find(
      (item) => (item.item_name || item.name)?.toLowerCase() === itemName.toLowerCase()
    );
    
    console.log("Found inventory item:", inventoryItem);
    
    if (inventoryItem) {
      const currentQty = Number(inventoryItem.quantity) || 0;
      const defectiveQty = Number(quantity) || 0;
      const newQty = Math.max(0, currentQty - defectiveQty);
      
      // Update the inventory item with new quantity
      console.log("Updating inventory item:", inventoryItem.id, "from", currentQty, "to", newQty);
      const updateResult = await updateParcelInItem(inventoryItem.id, {
        ...inventoryItem,
        quantity: newQty,
      });
      console.log("Update result:", updateResult);
      
      return {
        success: true,
        record: newRecord,
        updatedInventory: {
          id: inventoryItem.id,
          name: inventoryItem.item_name || inventoryItem.name,
          previousQty: currentQty,
          newQty: newQty,
          deductedQty: defectiveQty,
        },
      };
    }
    
    console.log("Item not found in inventory:", itemName);
    return {
      success: true,
      record: newRecord,
      warning: "Item not found in inventory - record created but inventory not updated",
    };
  } catch (error) {
    console.error("Error adding defective item:", error);
    return { success: false, error: error.message };
  }
};

// Delete a defective item record (and optionally restore inventory)
export const deleteDefectiveItem = async (recordId, restoreInventory = false) => {
  try {
    const defectiveItems = getDefectiveItems();
    const record = defectiveItems.find((item) => item.id === recordId);
    
    if (!record) {
      return { success: false, error: "Record not found" };
    }
    
    // Remove from defective items
    const updatedItems = defectiveItems.filter((item) => item.id !== recordId);
    saveDefectiveItems(updatedItems);
    
    // Optionally restore inventory
    if (restoreInventory) {
      const { getParcelInItems, updateParcelInItem } = await import("../models/parcelShippedModel");
      const inventoryResult = await getParcelInItems();
      const inventoryItems = inventoryResult.data || [];
      
      if (inventoryResult.error) {
        return { success: false, error: inventoryResult.error.message };
      }
      
      const inventoryItem = inventoryItems.find(
        (item) => (item.item_name || item.name)?.toLowerCase() === record.itemName.toLowerCase()
      );
      
      if (inventoryItem) {
        const currentQty = Number(inventoryItem.quantity) || 0;
        const restoredQty = Number(record.quantity) || 0;
        
        await updateParcelInItem(inventoryItem.id, {
          ...inventoryItem,
          quantity: currentQty + restoredQty,
        });
        
        return {
          success: true,
          restoredQty: restoredQty,
          message: `Record deleted and ${restoredQty} units restored to inventory`,
        };
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting defective item:", error);
    return { success: false, error: error.message };
  }
};

// Get defective items statistics
export const getDefectiveItemsStats = () => {
  const items = getDefectiveItems();
  return {
    totalRecords: items.length,
    totalDefectiveQuantity: items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    uniqueItems: new Set(items.map((item) => item.itemName)).size,
    byCategory: items.reduce((acc, item) => {
      const cat = item.category || "Others";
      acc[cat] = (acc[cat] || 0) + (Number(item.quantity) || 0);
      return acc;
    }, {}),
  };
};
