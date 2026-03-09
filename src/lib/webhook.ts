export interface EmergencyPayload {
  name: string;
  message: string;
  location: string;
  hospital: string;
  distance: string;
  eta: string;
  emergency_contacts: Array<{ name: string; email: string; phone: string }>;
}

export async function sendEmergencyWebhook(
  webhookUrl: string,
  payload: EmergencyPayload
): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch (error) {
    console.error("Webhook failed:", error);
    return false;
  }
}
