"use client";

import { useEffect } from "react";

// Global error handler for auth issues
function AuthErrorHandler() {
  useEffect(() => {
    const handleAuthError = (event) => {
      const error = event.error || event.message;
      if (typeof error === 'string' && 
          (error.includes('Refresh Token Not Found') || 
           error.includes('Invalid Refresh Token'))) {
        // Clear auth data and redirect to login
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('supabase.auth.refreshToken');
        window.location.href = '/login';
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
