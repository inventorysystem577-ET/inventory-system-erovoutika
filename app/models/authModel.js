import { supabase } from "../../lib/supabaseClient";

export async function login({ email, password }) {
  if (!email || !password) {
    throw new Error("Email and Password are required");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  
  // Check if user is approved
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('is_approved')
    .eq('id', data.user.id)
    .single();
    
  if (profileError || !profile) {
    throw new Error("User profile not found");
  }
    
  if (!profile.is_approved) {
    throw new Error("Your account is pending approval. Please contact an administrator.");
  }
  
  return data;
}

export async function registerUser({ name, email, password, role }) {
  if (!name || !email || !password || !role) {
    throw new Error("Missing fields");
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, role } },
  });

  if (error) throw error;
  return data;
}

export async function createAccessRequest({ name, email, password, role, reason }) {
  if (!name || !email || !password || !role || !reason) {
    throw new Error("All fields are required");
  }

  // First create the auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, role } },
  });

  if (authError) throw authError;

  // Create user profile with approval status
  const { data: profileData, error: profileError } = await supabase
    .from('user_profiles')
    .insert({
      id: authData.user.id,
      name,
      email,
      role,
      reason,
      is_approved: false,
      requested_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (profileError) throw profileError;

  return profileData;
}

export async function getAccessRequests(status = null) {
  let query = supabase
    .from('user_profiles')
    .select('*')
    .order('requested_at', { ascending: false });
    
  if (status) {
    query = query.eq('is_approved', status === 'approved');
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data;
}

export async function approveAccessRequest(requestId, approvedBy) {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      is_approved: true,
      approved_at: new Date().toISOString(),
      approved_by: approvedBy,
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function rejectAccessRequest(requestId, rejectedBy) {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      is_approved: false,
      rejected_at: new Date().toISOString(),
      rejected_by: rejectedBy,
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function sendResetEmail(email) {
  if (!email || typeof email !== "string") {
    throw new Error("Valid email is required");
  }

  // Basic format validation
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
