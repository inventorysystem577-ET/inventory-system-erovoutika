-- Simple script to create only the access_requests_temp table
-- This bypasses RLS issues and doesn't conflict with existing policies

CREATE TABLE IF NOT EXISTS access_requests_temp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  reason TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT FALSE,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by VARCHAR(255),
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejected_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance (these won't error if they exist)
CREATE INDEX IF NOT EXISTS idx_access_requests_temp_email ON access_requests_temp(email);
CREATE INDEX IF NOT EXISTS idx_access_requests_temp_is_approved ON access_requests_temp(is_approved);
CREATE INDEX IF NOT EXISTS idx_access_requests_temp_requested_at ON access_requests_temp(requested_at);

-- NOTE: No RLS policies on this table to avoid permission issues
-- This table is for temporary/testing purposes
