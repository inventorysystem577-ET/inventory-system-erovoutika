export async function logActivity({
  userId,
  userName,
  userType,
  action,
  module,
  details,
  ipAddress = "",
}) {
  try {
    const response = await fetch("/api/activity-log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        userName,
        userType,
        action,
        module,
        details,
        ipAddress,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Activity log failed:", data);
    }
  } catch (error) {
    console.error("Activity log error:", error);
  }
}