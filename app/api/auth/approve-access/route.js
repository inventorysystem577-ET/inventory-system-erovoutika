import { approveAccessRequest, rejectAccessRequest } from "../../../models/authModel";

export async function POST(req) {
  try {
    const { requestId, action, approvedBy } = await req.json();

    if (!requestId || !action || !approvedBy) {
      return new Response(
        JSON.stringify({ message: "Request ID, action, and approved by are required" }),
        { status: 400 }
      );
    }

    let result;
    if (action === 'approve') {
      result = await approveAccessRequest(requestId, approvedBy);
    } else if (action === 'reject') {
      result = await rejectAccessRequest(requestId, approvedBy);
    } else {
      return new Response(
        JSON.stringify({ message: "Invalid action. Must be 'approve' or 'reject'" }),
        { status: 400 }
      );
    }

    return new Response(
      JSON.stringify({ 
        message: `Access request ${action}d successfully`,
        result 
      }),
      { status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ message: error.message || "Server error" }),
      { status: 400 }
    );
  }
}
