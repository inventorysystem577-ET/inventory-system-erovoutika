import { createAccessRequest } from "../../../models/authModel";

export async function POST(req) {
  try {
    const { name, email, role, reason } = await req.json();

    // Generate a random password for the user
    const generateRandomPassword = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
      let password = "";
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };

    const password = generateRandomPassword();

    const data = await createAccessRequest({ name, email, password, role, reason });

    return new Response(
      JSON.stringify({ 
        message: "Access request submitted successfully! Your request will be reviewed by an admin.",
        user: data 
      }),
      { status: 201 },
    );
  } catch (error) {
    return new Response(error.message || "Server error", { status: 400 });
  }
}
