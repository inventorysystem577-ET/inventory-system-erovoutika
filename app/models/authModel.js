import { supabase } from "../../lib/supabaseClient";
import { createClient } from "@supabase/supabase-js";

const PENDING_REQUESTS_TABLE = "access_requests_temp";
const APPROVED_USERS_TABLE = "user_profiles";

// ── Supabase Admin client (needed for deleteUser from Auth) ──
// Make sure SUPABASE_SERVICE_ROLE_KEY is in your .env.local
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const normalizeStatus = (status, fallback = "approved") => {
  if (!status) return fallback;
  const normalized = String(status).toLowerCase();
  if (
    normalized === "approved" ||
    normalized === "denied" ||
    normalized === "pending"
  ) {
    return normalized;
  }
  return fallback;
};

const resolveApprovalStatus = (profile) => {
  if (!profile) return "pending";
  if (profile.is_approved) return "approved";
  if (profile.rejected_at) return "denied";
  return "pending";
};

export async function login({ email, password }) {
  if (!email || !password) {
    throw new Error("Email and Password are required");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  const metadataRole = String(
    data?.user?.user_metadata?.role || "",
  ).toLowerCase();
  if (metadataRole === "admin") {
    return data;
  }

  const { data: profile } = await supabase
    .from(APPROVED_USERS_TABLE)
    .select("id, role, is_approved, rejected_at")
    .eq("id", data?.user?.id)
    .maybeSingle();

  if (String(profile?.role || "").toLowerCase() === "admin") {
    return data;
  }

  const metadataStatus = normalizeStatus(
    data?.user?.user_metadata?.status,
    "pending",
  );
  const effectiveStatus = profile
    ? resolveApprovalStatus(profile)
    : metadataStatus;

  if (effectiveStatus !== "approved") {
    await supabase.auth.signOut();
    if (effectiveStatus === "denied") {
      throw new Error("Your registration was denied by admin.");
    }
    throw new Error("Your account is pending admin approval.");
  }

  return data;
}

export async function registerUser({ name, email, password, role, reason }) {
  if (!name || !email || !password || !reason) {
    throw new Error("Missing fields");
  }

  const normalizedRole = role || "staff";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, role: normalizedRole, status: "pending" } },
  });

  if (error) throw error;

  const userId = data?.user?.id;
  if (!userId) {
    throw new Error("Unable to create user account");
  }

  const { error: pendingError } = await supabase
    .from(PENDING_REQUESTS_TABLE)
    .upsert({
      id: userId,
      name,
      email,
      role: normalizedRole,
      reason,
      is_approved: false,
      approved_at: null,
      approved_by: null,
      rejected_at: null,
      rejected_by: null,
    });

  if (pendingError) {
    throw new Error(`Unable to save pending request: ${pendingError.message}`);
  }

  return data;
}

export async function sendResetEmail(email) {
  if (!email || typeof email !== "string") {
    throw new Error("Valid email is required");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error("Invalid email format");
  }

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  });

  if (error) throw error;
  return data;
}

export async function updatePassword(password) {
  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  const { data, error } = await supabase.auth.updateUser({ password });

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────
// User Management additions
// ─────────────────────────────────────────────────────────────

export async function getAllUsers({
  role = null,
  search = null,
  status = "approved",
} = {}) {
  let query;

  if (status === "pending") {
    query = supabaseAdmin
      .from(PENDING_REQUESTS_TABLE)
      .select("id, name, email, role, reason, requested_at")
      .eq("is_approved", false)
      .is("rejected_at", null)
      .order("requested_at", { ascending: true });
  } else if (status === "denied") {
    query = supabaseAdmin
      .from(PENDING_REQUESTS_TABLE)
      .select(
        "id, name, email, role, reason, requested_at, rejected_at, rejected_by",
      )
      .eq("is_approved", false)
      .not("rejected_at", "is", null)
      .order("rejected_at", { ascending: false });
  } else {
    // approved
    query = supabaseAdmin
      .from(APPROVED_USERS_TABLE)
      .select("id, name, email, role, approved_at, approved_by")
      .eq("is_approved", true)
      .order("name", { ascending: true });
  }

  if (role) query = query.eq("role", role);
  if (search)
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function updateUserProfile(id, { name, role }) {
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from(APPROVED_USERS_TABLE)
    .update({ name, role, updated_at: now })
    .eq("id", id)
    .select("id, name, email, role")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteUserProfile(id) {
  // 1. Remove from user_profiles
  const { error: profileError } = await supabaseAdmin
    .from(APPROVED_USERS_TABLE)
    .delete()
    .eq("id", id);

  if (profileError) throw new Error(profileError.message);

  // 2. Remove from Supabase Auth — non-blocking if already gone
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (authError)
    console.warn(`Could not delete auth user ${id}:`, authError.message);
}

export async function approveAccessRequest(requestId, approvedBy) {
  const now = new Date().toISOString();

  // 1. Get the pending request first
  const { data: request, error: fetchError } = await supabaseAdmin
    .from(PENDING_REQUESTS_TABLE)
    .select("*")
    .eq("id", requestId)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  if (!request) throw new Error("Request not found");

  // 2. Upsert into user_profiles
  const { error: profileError } = await supabaseAdmin
    .from(APPROVED_USERS_TABLE)
    .upsert({
      id: request.id,
      name: request.name,
      email: request.email,
      role: request.role || "staff",
      reason: request.reason || "",
      is_approved: true,
      requested_at: request.requested_at || now,
      approved_at: now,
      approved_by: approvedBy || "admin",
      rejected_at: null,
      rejected_by: null,
      updated_at: now,
    });

  if (profileError) throw new Error(profileError.message);

  // 3. Remove from pending queue
  const { error: deleteError } = await supabaseAdmin
    .from(PENDING_REQUESTS_TABLE)
    .delete()
    .eq("id", requestId);

  if (deleteError) throw new Error(deleteError.message);

  return { success: true };
}

export async function rejectAccessRequest(requestId, rejectedBy) {
  const now = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from(PENDING_REQUESTS_TABLE)
    .update({
      is_approved: false,
      rejected_at: now,
      rejected_by: rejectedBy || "admin",
      updated_at: now,
    })
    .eq("id", requestId);

  if (error) throw new Error(error.message);

  return { success: true };
}