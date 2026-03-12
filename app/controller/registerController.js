import axios from "axios";

export const handleSubmitRegister = async (formData) => {
  console.log("Register Data:", formData);

  try {
    const response = await axios.post("/api/auth/register", {
      name: formData.name,
      email: formData.email,
      role: formData.role,
      reason: formData.reason,
    });

    return response.data; // ✅ Return data for onSuccess callback
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data);
    } else if (error.request) {
      throw new Error("No Response From Server. Please Try Again");
    } else {
      throw new Error(error.message);
    }
  }
};
