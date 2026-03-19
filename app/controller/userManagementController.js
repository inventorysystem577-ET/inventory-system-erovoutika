import axios from "axios";

export const fetchAllUsers = async ({ role = null, search = null, status = "approved" } = {}) => {
  try {
    const params = new URLSearchParams();
    if (role) params.append("role", role);
    if (search) params.append("search", search);
    if (status) params.append("status", status);
    const query = params.toString() ? `?${params.toString()}` : "";
    const response = await axios.get(`/api/auth/user-management${query}`);
    return response.data.users || [];
  } catch (error) {
    if (error.response) throw new Error(error.response.data?.message || "Failed to fetch users");
    else if (error.request) throw new Error("No Response From Server. Please Try Again");
    else throw new Error(error.message);
  }
};

export const handleUpdateUser = async (id, { name, role }) => {
  try {
    const response = await axios.put("/api/auth/user-management", { id, name, role });
    return response.data;
  } catch (error) {
    if (error.response) throw new Error(error.response.data?.message || "Failed to update user");
    else if (error.request) throw new Error("No Response From Server. Please Try Again");
    else throw new Error(error.message);
  }
};

export const handleDeleteUser = async (id) => {
  try {
    const response = await axios.delete("/api/auth/user-management", { data: { id } });
    return response.data;
  } catch (error) {
    if (error.response) throw new Error(error.response.data?.message || "Failed to delete user");
    else if (error.request) throw new Error("No Response From Server. Please Try Again");
    else throw new Error(error.message);
  }
};

// Re-use your existing approve/deny from accessRequestController
export { handleApproveRequest } from "./accessRequestController";