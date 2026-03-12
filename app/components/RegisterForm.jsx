"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegisterComponents({
  name,
  setName,
  email,
  setEmail,
  role,
  setRole,
  reason,
  setReason,
  onSubmit,
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 md:text-gray-700 mb-2">
          Name
        </label>
        <input
          type="text"
          placeholder="Enter your full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 border rounded-lg
            border-gray-600 md:border-gray-300
            bg-gray-800 md:bg-white
            text-white md:text-black
            focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100
            transition-all"
          required
        />
      </div>

      {/* Role */}
      <div>
        <label className="block text-sm font-medium text-gray-300 md:text-gray-700 mb-2">
          Role
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full px-4 py-3 border rounded-lg
            border-gray-600 md:border-gray-300
            bg-gray-800 md:bg-white
            text-white md:text-black
            focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100
            transition-all"
          required
        >
          <option value="">Select a role</option>
          <option value="staff">Staff</option>
        </select>
      </div>

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
            focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100
            transition-all"
          required
        />
      </div>

      {/* Reason for Access */}
      <div>
        <label className="block text-sm font-medium text-gray-300 md:text-gray-700 mb-2">
          Reason for Access
        </label>
        <textarea
          placeholder="Please describe why you need access to the inventory system"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-4 py-3 border rounded-lg
            border-gray-600 md:border-gray-300
            bg-gray-800 md:bg-white
            text-white md:text-black
            focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100
            transition-all resize-none"
          rows="4"
          required
        />
      </div>

      {/* Request Access button */}
      <button
        type="submit"
        className="w-full py-3 text-white font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 transition-all duration-200"
      >
        Request Access
      </button>

      {/* Already have an account link */}
      <p className="text-center text-sm text-gray-400 md:text-gray-600">
        Already have an account?{" "}
        <Link
          href="/"
          className="font-medium text-blue-400 md:text-blue-600 hover:text-blue-500 md:hover:text-blue-700"
        >
          Sign In
        </Link>
      </p>
    </form>
  );
}
