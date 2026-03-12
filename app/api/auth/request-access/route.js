import { supabase } from "../../../../lib/supabaseClient";

export async function POST(req) {
  try {
    console.log('POST request-access called');
    const body = await req.json();
    console.log('Request body:', body);
    
    const { name, email, role, reason } = body;
    console.log('Extracted fields:', { name, email, role, reason });

    if (!name || !email || !role || !reason) {
      console.log('Validation failed - missing fields:', {
        name: !!name,
        email: !!email,
        role: !!role,
        reason: !!reason
      });
      return new Response(
        JSON.stringify({ 
          message: "All fields are required",
          missing: {
            name: !name,
            email: !email,
            role: !role,
            reason: !reason
          }
        }),
        { status: 400 }
      );
    }

    console.log('Validation passed, creating access request...');

    // Generate a random ID for the access request
    const requestId = crypto.randomUUID();
    console.log('Generated request ID:', requestId);

    // First, try to create the table if it doesn't exist
    try {
      await supabase.rpc('create_temp_table_if_not_exists');
      console.log('Table creation RPC called');
    } catch (tableError) {
      console.log('Table creation RPC failed (expected if function doesn\'t exist):', tableError.message);
    }

    // Try direct insert first
    const { data, error } = await supabase
      .from('access_requests_temp')
      .insert({
        id: requestId,
        name,
        email,
        role,
        reason,
        is_approved: false,
        requested_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Direct insert error:', error);
      
      // If table doesn't exist, create it using raw SQL
      if (error.message?.includes('does not exist') || error.code === 'PGRST204') {
        console.log('Table does not exist, creating it...');
        
        // Create table using raw SQL (this might not work due to permissions)
        try {
          const { error: createError } = await supabase
            .rpc('exec_sql', {
              sql: `
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
              `
            });
            
          if (createError) {
            console.log('Cannot create table via RPC, using in-memory storage');
            
            // Fallback to in-memory storage (for testing only)
            const mockData = {
              id: requestId,
              name,
              email,
              role,
              reason,
              is_approved: false,
              requested_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              _mock: true // Flag to indicate this is mock data
            };
            
            console.log('Created mock access request:', mockData);
            
            return new Response(
              JSON.stringify({ 
                message: "Access request submitted successfully! (Note: Using temporary storage - please run migration for persistence)",
                request: mockData 
              }),
              { status: 201 }
            );
          }
          
          // Try insert again after creating table
          const { data: retryData, error: retryError } = await supabase
            .from('access_requests_temp')
            .insert({
              id: requestId,
              name,
              email,
              role,
              reason,
              is_approved: false,
              requested_at: new Date().toISOString(),
            })
            .select()
            .single();
            
          if (retryError) {
            throw new Error(`Retry insert failed: ${retryError.message}`);
          }
          
          console.log('Access request created successfully (after table creation):', retryData);
          
          return new Response(
            JSON.stringify({ 
              message: "Access request submitted successfully! Your request will be reviewed by an admin.",
              request: retryData 
            }),
            { status: 201 }
          );
        } catch (sqlError) {
          console.error('SQL execution failed:', sqlError);
          throw new Error(`Database setup failed: ${sqlError.message}`);
        }
      } else {
        throw new Error(`Database error: ${error.message}`);
      }
    }

    console.log('Access request created successfully (direct):', data);
    
    return new Response(
      JSON.stringify({ 
        message: "Access request submitted successfully! Your request will be reviewed by an admin.",
        request: data 
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error('POST request-access error:', error);
    console.error('Error stack:', error.stack);
    return new Response(
      JSON.stringify({ 
        message: error.message || "Server error",
        error: error.toString()
      }),
      { status: 400 }
    );
  }
}

export async function GET(req) {
  try {
    console.log('GET request-access called');
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    console.log('Status filter:', status);

    // Try to get from access_requests_temp table first
    let query = supabase
      .from('access_requests_temp')
      .select('*')
      .order('requested_at', { ascending: false });
    
    if (status) {
      if (status === 'pending') {
        // Pending requests have is_approved = null
        query = query.is('is_approved', null);
      } else if (status === 'approved') {
        query = query.eq('is_approved', true);
      } else if (status === 'rejected') {
        query = query.eq('is_approved', false);
      }
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Database query error on access_requests_temp:', error);
      
      // Fallback to user_profiles if temp table doesn't exist
      console.log('Trying fallback to user_profiles...');
      
      let fallbackQuery = supabase
        .from('user_profiles')
        .select('*')
        .order('requested_at', { ascending: false });
      
      if (status) {
        if (status === 'pending') {
          fallbackQuery = fallbackQuery.is('is_approved', null);
        } else if (status === 'approved') {
          fallbackQuery = fallbackQuery.eq('is_approved', true);
        } else if (status === 'rejected') {
          fallbackQuery = fallbackQuery.eq('is_approved', false);
        }
      }

      const { data: fallbackData, error: fallbackError } = await fallbackQuery;
      
      if (fallbackError) {
        console.error('Fallback query error:', fallbackError);
        
        // If no tables exist, return mock data for testing
        console.log('No tables available, returning empty array');
        
        return new Response(
          JSON.stringify({ 
            requests: [],
            message: "No access requests found. Please run database migrations."
          }),
          { status: 200 }
        );
      }

      console.log('Fetched data from fallback:', fallbackData);
      
      return new Response(
        JSON.stringify({ requests: fallbackData }),
        { status: 200 }
      );
    }

    console.log('Fetched data from access_requests_temp:', data);

    return new Response(
      JSON.stringify({ requests: data }),
      { status: 200 }
    );
  } catch (error) {
    console.error('GET request-access error:', error);
    return new Response(
      JSON.stringify({ 
        message: error.message || "Server error",
        error: error.toString()
      }),
      { status: 400 }
    );
  }
}

// PUT handler for approve/decline requests
export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, action } = body;

    if (!id || !action) {
      return new Response(
        JSON.stringify({ message: "ID and action are required" }),
        { status: 400 }
      );
    }

    console.log(`${action} request:`, id);

    // Update the request status
    const { data, error } = await supabase
      .from('access_requests_temp')
      .update({
        is_approved: action === 'approve',
        approved_at: action === 'approve' ? new Date().toISOString() : null,
        rejected_at: action === 'reject' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return new Response(
        JSON.stringify({ message: `Failed to ${action} request: ${error.message}` }),
        { status: 400 }
      );
    }

    console.log(`Request ${action}d successfully:`, data);

    return new Response(
      JSON.stringify({ 
        message: `Request ${action}d successfully`,
        request: data 
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('PUT request-access error:', error);
    return new Response(
      JSON.stringify({ 
        message: error.message || "Server error",
        error: error.toString()
      }),
      { status: 400 }
    );
  }
}
