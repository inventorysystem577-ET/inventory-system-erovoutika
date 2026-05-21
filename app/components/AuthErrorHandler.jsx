"use client";

import { useEffect } from "react";

// Global error handler for auth issues
function AuthErrorHandler() {
  useEffect(() => {
    const handleAuthError = (event) => {
      // Normalize error message from different event shapes
      let msg = null;
      try {
        if (event && typeof event === 'string') msg = event;
        else if (event && event.reason && event.reason.message) msg = event.reason.message;
        else if (event && event.error && event.error.message) msg = event.error.message;
        else if (event && event.message) msg = event.message;
      } catch (e) {
        msg = null;
      }

      if (typeof msg === 'string' && (msg.includes('Refresh Token Not Found') || msg.includes('Invalid Refresh Token'))) {
        // Clear auth data and redirect to the login page, but avoid redirect loops.
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('supabase.auth.refreshToken');
        try {
          if (typeof window !== 'undefined') {
            const REDIRECT_KEY = 'auth_redirected_at';
            const last = Number(sessionStorage.getItem(REDIRECT_KEY) || 0);
            const now = Date.now();
            // Only redirect if we haven't redirected in the last 5 seconds
            if (now - last > 5000) {
              sessionStorage.setItem(REDIRECT_KEY, String(now));
              if (window.location.pathname !== '/') {
                window.location.href = '/';
              }
            }
          }
        } catch (e) {
          // best-effort
        }
      }
    };

    window.addEventListener('error', handleAuthError);
    window.addEventListener('unhandledrejection', handleAuthError);

    return () => {
      window.removeEventListener('error', handleAuthError);
      window.removeEventListener('unhandledrejection', handleAuthError);
    };
  }, []);

  return null;
}

export default AuthErrorHandler;
