import { supabase } from "../../lib/supabaseClient";
import { createClient } from "@supabase/supabase-js";

const PENDING_REQUESTS_TABLE = "access_requests_temp";
const APPROVED_USERS_TABLE = "user_profiles";

// ── Supabase Admin client (needed for deleteUser from Auth) ──
// Make sure SUPABASE_SERVICE_ROLE_KEY is in your .env.local
let supabaseAdminInstance = null;
const getSupabaseAdmin = () => {
  if (!supabaseAdminInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Missing Supabase admin credentials. Please check your .env file.');
    }
    supabaseAdminInstance = createClient(url, key);
  }
  return supabaseAdminInstance;
};

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
  if (status === "approved") {
    let approvedProfilesQuery = getSupabaseAdmin()
      .from(APPROVED_USERS_TABLE)
      .select("id, name, email, role, approved_at, approved_by")
      .eq("is_approved", true)
      .order("name", { ascending: true });

    let approvedRequestsQuery = getSupabaseAdmin()
      .from(PENDING_REQUESTS_TABLE)
      .select("id, name, email, role, approved_at, approved_by")
      .eq("is_approved", true)
      .is("rejected_at", null)
      .order("approved_at", { ascending: false });

    if (role) {
      approvedProfilesQuery = approvedProfilesQuery.eq("role", role);
      approvedRequestsQuery = approvedRequestsQuery.eq("role", role);
    }

    if (search) {
      const searchFilter = `name.ilike.%${search}%,email.ilike.%${search}%`;
      approvedProfilesQuery = approvedProfilesQuery.or(searchFilter);
      approvedRequestsQuery = approvedRequestsQuery.or(searchFilter);
    }

    const [profilesResult, requestsResult] = await Promise.all([
      approvedProfilesQuery,
      approvedRequestsQuery,
    ]);

    if (profilesResult.error) throw new Error(profilesResult.error.message);
    if (requestsResult.error) throw new Error(requestsResult.error.message);

    const mergedByEmail = new Map();

    (profilesResult.data || []).forEach((row) => {
      const key = String(row.email || "").toLowerCase();
      mergedByEmail.set(key, { ...row, source: "profile" });
    });

    (requestsResult.data || []).forEach((row) => {
      const key = String(row.email || "").toLowerCase();
      if (!mergedByEmail.has(key)) {
        mergedByEmail.set(key, {
          ...row,
          source: "access_request",
        });
      }
    });

    return Array.from(mergedByEmail.values()).sort((a, b) =>
      String(a.name || a.email || "").localeCompare(String(b.name || b.email || "")),
    );
  }

  let query;

  if (status === "pending") {
    query = getSupabaseAdmin()
      .from(PENDING_REQUESTS_TABLE)
      .select("id, name, email, role, reason, requested_at")
      .eq("is_approved", false)
      .is("rejected_at", null)
      .order("requested_at", { ascending: true });
  } else if (status === "denied") {
    query = getSupabaseAdmin()
      .from(PENDING_REQUESTS_TABLE)
      .select(
        "id, name, email, role, reason, requested_at, rejected_at, rejected_by",
      )
      .eq("is_approved", false)
      .not("rejected_at", "is", null)
      .order("rejected_at", { ascending: false });
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

  const { data, error } = await getSupabaseAdmin()
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
  const { error: profileError } = await getSupabaseAdmin()
    .from(APPROVED_USERS_TABLE)
    .delete()
    .eq("id", id);

  if (profileError) throw new Error(profileError.message);

  // 2. Remove from Supabase Auth — non-blocking if already gone
  const { error: authError } = await getSupabaseAdmin().auth.admin.deleteUser(id);
  if (authError)
    console.warn(`Could not delete auth user ${id}:`, authError.message);
}

export async function approveAccessRequest(requestId, approvedBy) {
  const now = new Date().toISOString();

  const { error } = await getSupabaseAdmin()
    .from(PENDING_REQUESTS_TABLE)
    .update({
      is_approved: true,
      approved_at: now,
      approved_by: approvedBy || "admin",
      rejected_at: null,
      rejected_by: null,
      updated_at: now,
    })
    .eq("id", requestId);

  if (error) throw new Error(error.message);

  return { success: true };
}

export async function rejectAccessRequest(requestId, rejectedBy) {
  const now = new Date().toISOString();

  const { error } = await getSupabaseAdmin()
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