// Usa Resend (https://resend.com) porque su API es una sola llamada HTTP sin SDK
// pesado. Si no configuras RESEND_API_KEY, la acción "Enviar correo" queda
// registrada en el historial como "sin proveedor configurado" — nunca finge
// que se envió cuando no se envió.
export async function sendEmail(input: { to: string; subject: string; body: string }): Promise<{ sent: boolean; detail: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTOMATIONS_EMAIL_FROM;

  if (!apiKey || !from) {
    return { sent: false, detail: "Sin proveedor de correo configurado (RESEND_API_KEY / AUTOMATIONS_EMAIL_FROM)" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        text: input.body,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { sent: false, detail: `Resend respondió ${res.status}: ${text.slice(0, 200)}` };
    }

    return { sent: true, detail: `Enviado a ${input.to}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return { sent: false, detail: `Error de red: ${message}` };
  }
}
