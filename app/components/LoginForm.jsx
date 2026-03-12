import { useState } from "react";
import Link from "next/link";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";

export default function LoginComponents({
  email,
  setEmail,
  password,
  setPassword,
  onSubmit,
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-300 md:text-gray-700 mb-2">
          Email
        </label>
        <input
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

      {/* Password */}
      <div>
        <label className="block text-sm font-medium text-gray-300 md:text-gray-700 mb-2">
          Password
        </label>
        <div className="relative">
          <input
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

      {/* Forgot password */}
      <div className="flex justify-end">
        <Link
          href="/view/forgot-password"
          className="text-sm font-medium text-blue-400 md:text-blue-600 hover:text-blue-500 md:hover:text-blue-700"
        >
          Forgot password?
        </Link>
      </div>

      {/* Sign in button */}
      <button
        type="submit"
        className="w-full py-3 text-white font-semibold rounded-lg
          bg-blue-600 hover:bg-blue-700 transition-all cursor-pointer"
      >
        Sign in
      </button>

      {/* Register link */}
      <p className="text-center text-sm text-gray-400 md:text-gray-600">
        Don’t have an account?{" "}
        <Link
          href="/view/request-access"
          className="font-medium text-blue-400 md:text-blue-600 hover:text-blue-500 md:hover:text-blue-700"
        >
          Request Access
        </Link>
      </p>
    </form>
  );
}
