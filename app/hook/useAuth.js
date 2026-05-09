"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

const APPROVED_USERS_TABLE = "user_profiles";

const normalizeStatus = (status, fallback = "approved") => {
  if (!status) return fallback;
  const normalized = String(status).toLowerCase();
  if (normalized === "approved" || normalized === "denied" || normalized === "pending") {
    return normalized;
  }
  return fallback;
};

const mapRowToStatus = (row) => {
  if (!row) return "pending";
  if (row.is_approved) return "approved";
  if (row.rejected_at) return "denied";
  return "pending";
};

export const useAuth = () => {
  const [userEmail, setUserEmail] = useState(null);
  const [displayName, setDisplayName] = useState(null);
  const [role, setRole] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const resolveProfile = async (userId) => {
      const { data, error } = await supabase
        .from(APPROVED_USERS_TABLE)
        .select("name, role, is_approved, rejected_at")
        .eq("id", userId)
        .maybeSingle();

      if (!error && data) {
        data.status = mapRowToStatus(data);
        return data;
      }
      return null;
    };

    const applySession = async (session) => {
      if (!mounted) return;

      if (!session) {
        setUserEmail(null);
        setDisplayName(null);
        setRole(null);
        setStatus(null);
        setLoading(false);
        // Clear any remaining auth data
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('supabase.auth.refreshToken');
        sessionStorage.clear();
        router.replace("/");
        return;
      }

      const metadataName =
        session.user?.user_metadata?.display_name ||
        session.user?.user_metadata?.name ||
        null;
      const metadataRole = session.user?.user_metadata?.role || "staff";
      const metadataStatus = normalizeStatus(session.user?.user_metadata?.status);
      const profile = await resolveProfile(session.user?.id);
      const isMetadataAdmin = String(metadataRole).toLowerCase() === "admin";

      setUserEmail(session.user?.email || null);
      setDisplayName(profile?.name || metadataName);
      const effectiveRole = profile?.role || metadataRole;
      const isEffectiveAdmin = String(effectiveRole).toLowerCase() === "admin";
      setRole(effectiveRole);
      setStatus(isMetadataAdmin || isEffectiveAdmin ? "approved" : normalizeStatus(profile?.status || metadataStatus, "pending"));
      setLoading(false);
    };

    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        await applySession(session);
      } catch (error) {
        console.error("Error checking session:", error.message);
        // Handle refresh token errors specifically
        if (error.message?.includes('Refresh Token Not Found') || 
            error.message?.includes('Invalid Refresh Token')) {
          // Clear all auth data and redirect to login
          await supabase.auth.signOut();
          localStorage.clear();
          sessionStorage.clear();
        }
        await applySession(null);
      }
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        await applySession(session);
      } catch (error) {
        console.error("Error in auth state change:", error.message);
        if (error.message?.includes('Refresh Token Not Found') || 
            error.message?.includes('Invalid Refresh Token')) {
          await supabase.auth.signOut();
          localStorage.clear();
          sessionStorage.clear();
        }
        await applySession(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  return { userEmail, displayName, role, status, loading };
};
