import { getAllUsers, updateUserProfile, deleteUserProfile } from "../../../models/authModel";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role") || null;
    const search = searchParams.get("search") || null;
    const status = searchParams.get("status") || "approved";

    const users = await getAllUsers({ role, search, status });
    return new Response(JSON.stringify({ users }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ message: error.message || "Failed to fetch users" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function PUT(req) {
  try {
    const { id, name, role } = await req.json();
    if (!id || !name || !role)
      return new Response(JSON.stringify({ message: "id, name, and role are required" }), { status: 400 });
    const updated = await updateUserProfile(id, { name, role });
    return new Response(JSON.stringify({ message: "User updated successfully", user: updated }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ message: error.message || "Failed to update user" }), { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { id } = await req.json();
    if (!id)
      return new Response(JSON.stringify({ message: "User id is required" }), { status: 400 });
    await deleteUserProfile(id);
    return new Response(JSON.stringify({ message: "User deleted successfully" }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ message: error.message || "Failed to delete user" }), { status: 500 });
  }
}