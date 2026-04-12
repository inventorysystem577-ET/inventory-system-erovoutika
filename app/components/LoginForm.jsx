import { useState } from "react";
import Link from "next/link";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";

export default function LoginComponents({
  mode = "login",
  onModeChange,
  email,
  setEmail,
  reason = "",
  setReason,
  password,
  setPassword,
  onSubmit,
  loading,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isRequestMode = mode === "request";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-300 md:text-gray-700 mb-2">
          Email
        </label>
        <input
          key="email-input"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 border rounded-lg 
            border-gray-600 md:border-gray-300 
            bg-gray-800 md:bg-white 
            text-white md:text-black
            focus:outline-none 
            focus:border-blue-500 focus:ring-3 focus:ring-blue-100
            transition-all"
          required
        />
      </div>

      {!isRequestMode && (
        <div>
          <label className="block text-sm font-medium text-gray-300 md:text-gray-700 mb-2">
            Password
          </label>
          <div className="relative">
            <input
              key="password-input"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 pr-12 border rounded-lg
                border-gray-600 md:border-gray-300 
                bg-gray-800 md:bg-white 
                text-white md:text-black
                focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100
                transition-all"
              required
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 hover:text-blue-400 md:text-gray-600 md:hover:text-blue-600"
            >
              {showPassword ? <FaRegEyeSlash /> : <FaRegEye />}
            </button>
          </div>
        </div>
      )}

      {isRequestMode && (
        <div>
          <label className="block text-sm font-medium text-gray-300 md:text-gray-700 mb-2">
            Reason for Access (optional)
          </label>
          <textarea
            key="reason-textarea"
            placeholder="Tell the admin why you need access"
            value={reason}
            onChange={(e) => setReason?.(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border rounded-lg
              border-gray-600 md:border-gray-300
              bg-gray-800 md:bg-white
              text-white md:text-black
              focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100
              transition-all resize-none"
          />
        </div>
      )}

      {/* {!isRequestMode && (
        <div className="flex justify-end">
          <Link
            href="/view/forgot-password"
            className="text-sm font-medium text-blue-400 md:text-blue-600 hover:text-blue-500 md:hover:text-blue-700"
          >
            Forgot password?
          </Link>
        </div>
      )} */}

      <button
        key="submit-button"
        type="submit"
        disabled={Boolean(loading)}
        className="w-full py-3 text-white font-semibold rounded-lg
          bg-blue-600 hover:bg-blue-700 transition-all cursor-pointer disabled:opacity-70"
      >
        {loading
          ? "Please wait..."
          : isRequestMode
            ? "Request Access"
            : "Sign in"}
      </button>

      <button
        key="mode-toggle-button"
        type="button"
        onClick={() => onModeChange?.(isRequestMode ? "login" : "request")}
        className="w-full py-3 font-semibold rounded-lg border border-blue-500 text-blue-300 md:text-blue-600 hover:bg-blue-500/10 transition-all"
      >
        {isRequestMode ? "Back to Login" : "Request Access"}
      </button>
    </form>
  );
}
