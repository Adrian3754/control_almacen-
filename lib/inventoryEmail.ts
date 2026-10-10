import "server-only";

type LowStockEmail = {
  material: string;
  area: string;
  stock: number;
  minimum: number;
  unit: string;
};

export async function sendLowStockEmail({
  material,
  area,
  stock,
  minimum,
  unit,
}: LowStockEmail): Promise<string> {
  const apiKey = process.env.RESEND_API_KEY;
  const sender = process.env.RESEND_FROM_EMAIL;
  const recipient = process.env.INVENTORY_PURCHASES_EMAIL;
  const missing = [
    !apiKey && "RESEND_API_KEY",
    !sender && "RESEND_FROM_EMAIL",
    !recipient && "INVENTORY_PURCHASES_EMAIL",
  ].filter(Boolean);

  if (!apiKey || !sender || !recipient) {
    throw new Error(`Falta configurar en el servidor: ${missing.join(", ")}.`);
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: sender,
      to: [recipient],
      subject: `Material por agotarse: ${material} (${area})`,
      text: [
        "Alerta de inventario de M. López",
        "",
        `Área: ${area}`,
        `Material: ${material}`,
        `Existencia actual: ${stock} ${unit}`,
        `Existencia mínima: ${minimum} ${unit}`,
        "",
        "Revisa el inventario y programa la compra o reposición.",
      ].join("\n"),
    }),
  });

  const responseBody: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof responseBody === "object" &&
      responseBody !== null &&
      "message" in responseBody &&
      typeof responseBody.message === "string"
        ? responseBody.message
        : `Resend respondió con HTTP ${response.status}.`;
    throw new Error(`No se pudo enviar el correo de alerta: ${message}`);
  }

  if (
    typeof responseBody !== "object" ||
    responseBody === null ||
    !("id" in responseBody) ||
    typeof responseBody.id !== "string"
  ) {
    throw new Error("Resend aceptó la solicitud sin devolver un identificador de correo.");
  }

  return responseBody.id;
}
