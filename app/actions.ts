'use server';

export async function sendWatiMessage(phoneNumber: string) {
  // 1. Get the token from secure environment variables
  const token = process.env.WATI_ACCESS_TOKEN;
  const tenantId = '466818'; // Your Tenant ID

  if (!token) {
    console.error('Missing WATI Token');
    return { success: false, error: 'System config error: Missing Token' };
  }

  console.log(`[WATI] Attempting to send to ${phoneNumber}...`);
  // 2. WATI API Endpoint
  const url = `https://live-mt-server.wati.io/${tenantId}/api/v1/sendTemplateMessage?whatsappNumber=${phoneNumber}`;

  // 3. The exact body format WATI expects
  const payload = {
    template_name: 'youtube_reminder', // CHANGE THIS to your actual template name in WATI
    broadcast_name: 'youtube_reminder', // CHANGE THIS to match above
    channel_number: '+15558061622', // CHANGE THIS to your WATI phone number (e.g. 919876543210)
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const responseText = await res.text();
    console.log('[WATI] Response:', responseText); // <--- LOOK AT YOUR TERMINAL FOR THIS

    if (!res.ok) {
      const errText = await res.text();
      console.error('WATI Error:', errText);
      return { success: false, error: responseText };
    }

    return { success: true, data: responseText };
  } catch (error) {
    console.error('WATI Network Error:', error);
    return { success: false, error: 'Network Failed' };
  }
}
