// Helper functions for parcel shipped data

// Mock data for parcel shipped items
const mockParcelShippedData = [
  {
    id: 1,
    name: "Laptop Package",
    quantity: 5,
    description: "Dell laptops for office use",
    date: "2024-01-15",
    status: "shipped"
  },
  {
    id: 2,
    name: "Monitor Package",
    quantity: 10,
    description: "24-inch monitors",
    date: "2024-01-16",
    status: "shipped"
  },
  {
    id: 3,
    name: "Keyboard Package",
    quantity: 15,
    description: "Mechanical keyboards",
    date: "2024-01-17",
    status: "shipped"
  }
];

// Fetch parcel items
export const fetchParcelItems = async () => {
  try {
    // In a real app, this would be an API call
    // For now, return mock data
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
    return mockParcelShippedData;
  } catch (error) {
    console.error('Error fetching parcel items:', error);
    return [];
  }
};

// Add parcel item
export const addParcelItem = async (item) => {
  try {
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 300));
    const newItem = {
      ...item,
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      status: "shipped"
    };
    mockParcelShippedData.push(newItem);
    return newItem;
  } catch (error) {
    console.error('Error adding parcel item:', error);
    throw error;
  }
};

// Update parcel item
export const updateParcelItem = async (id, updates) => {
  try {
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = mockParcelShippedData.findIndex(item => item.id === id);
    if (index !== -1) {
      mockParcelShippedData[index] = { ...mockParcelShippedData[index], ...updates };
      return mockParcelShippedData[index];
    }
    throw new Error('Item not found');
  } catch (error) {
    console.error('Error updating parcel item:', error);
    throw error;
  }
};

// Delete parcel item
export const deleteParcelItem = async (id) => {
  try {
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = mockParcelShippedData.findIndex(item => item.id === id);
    if (index !== -1) {
      mockParcelShippedData.splice(index, 1);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting parcel item:', error);
    throw error;
  }
};
