import { NextResponse } from "next/server";
import { supabase } from "../../utils/supabaseClient";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userType = searchParams.get("userType");
    const search = searchParams.get("search");

    let query = supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (userType && userType !== "all") {
      query = query.eq("user_type", userType);
    }

    if (search && search.trim()) {
      const safeSearch = search.trim();
      query = query.or(
        `user_name.ilike.%${safeSearch}%,action.ilike.%${safeSearch}%,module.ilike.%${safeSearch}%,details.ilike.%${safeSearch}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, data: data || [] },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Could not fetch activity logs" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    const { userId, userName, userType, action, module, details, ipAddress } =
      body;

    const { data, error } = await supabase
      .from("activity_logs")
      .insert([
        {
          user_id: userId || null,
          user_name: userName || "Unknown User",
          user_type: userType || "staff",
          action: action || "UNKNOWN_ACTION",
          module: module || "Unknown Module",
          details: details || "",
          ip_address: ipAddress || "",
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, data },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Could not create activity log" },
      { status: 500 }
    );
  }
}