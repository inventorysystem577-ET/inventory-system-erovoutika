-- Create temporary access_requests table for testing (bypasses RLS issues)
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_access_requests_temp_email ON access_requests_temp(email);
CREATE INDEX IF NOT EXISTS idx_access_requests_temp_is_approved ON access_requests_temp(is_approved);
CREATE INDEX IF NOT EXISTS idx_access_requests_temp_requested_at ON access_requests_temp(requested_at);

-- Grant necessary permissions (adjust based on your Supabase setup)
-- Note: You may need to run this with appropriate permissions in Supabase dashboard
-- or use the service role key in your application
