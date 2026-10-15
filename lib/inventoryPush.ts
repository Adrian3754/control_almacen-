import "server-only";

import webpush, { WebPushError, type PushSubscription } from "web-push";
import type { createServerSupabaseClient } from "@/lib/supabase";

type SupabaseServerClient = ReturnType<typeof createServerSupabaseClient>;

export type InventoryPushResult = {
  status: "sent" | "partial" | "no_subscribers" | "not_configured" | "error";
  sent: number;
  failed: number;
};

type PushMessage = {
  title: string;
  body: string;
  tag: string;
  url: string;
};

async function sendInventoryPush(
  supabase: SupabaseServerClient,
  message: PushMessage
): Promise<InventoryPushResult> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    console.error("No se enviaron notificaciones push: falta configurar NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY o VAPID_SUBJECT.");
    return { status: "not_configured", sent: 0, failed: 0 };
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("La configuración VAPID para notificaciones push no es válida:", message);
    return { status: "error", sent: 0, failed: 0 };
  }

  const { data: administrators, error: administratorError } = await supabase
    .from("perfiles")
    .select("numero_empleado")
    .lte("nivel_jerarquia", 2);
  if (administratorError) {
    console.error("No se pudieron consultar los administradores para notificaciones push:", administratorError.message);
    return { status: "error", sent: 0, failed: 0 };
  }

  const employeeNumbers = (administrators ?? []).map((admin) => String(admin.numero_empleado));
  if (employeeNumbers.length === 0) {
    return { status: "no_subscribers", sent: 0, failed: 0 };
  }

  const { data: subscriptions, error: subscriptionError } = await supabase
    .from("inventory_push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("employee_number", employeeNumbers)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
  if (subscriptionError) {
    console.error("No se pudieron consultar las suscripciones push:", subscriptionError.message);
    return { status: "error", sent: 0, failed: 0 };
  }
  if (!subscriptions?.length) {
    return { status: "no_subscribers", sent: 0, failed: 0 };
  }

  const expiredEndpoints: string[] = [];
  let sent = 0;
  let failed = 0;
  const results = await Promise.allSettled(
    subscriptions.map((subscription) => {
      const pushSubscription: PushSubscription = {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      };
      return webpush.sendNotification(
        pushSubscription,
        JSON.stringify(message),
        { TTL: 60 * 60 * 24, urgency: "high" }
      );
    })
  );

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      sent += 1;
      return;
    }
    failed += 1;
    if (result.reason instanceof WebPushError && (result.reason.statusCode === 404 || result.reason.statusCode === 410)) {
      expiredEndpoints.push(subscriptions[index].endpoint);
      return;
    }
    const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
    console.error("Falló el envío de una notificación push de inventario:", reason);
  });

  if (expiredEndpoints.length > 0) {
    const { error } = await supabase
      .from("inventory_push_subscriptions")
      .delete()
      .in("endpoint", expiredEndpoints);
    if (error) {
      console.error("No se pudieron eliminar suscripciones push vencidas:", error.message);
    }
  }

  return {
    status: failed === 0 ? "sent" : sent > 0 ? "partial" : "error",
    sent,
    failed,
  };
}

export async function notifyInventoryAdministrators(
  supabase: SupabaseServerClient,
  payload: { id: string; nombre: string; area: string; stock: number; minimo: number; unidad: string }
): Promise<InventoryPushResult> {
  return sendInventoryPush(supabase, {
    title: "Reabastecimiento requerido",
    body: `${payload.nombre} · ${payload.area}: ${payload.stock} ${payload.unidad} (mínimo ${payload.minimo}).`,
    tag: `stock-alert-${payload.id}`,
    url: "/inventario",
  });
}

export async function notifyRequisitionReminder(
  supabase: SupabaseServerClient,
  payload: {
    id: string;
    departamento: string;
    fechaEstimada: string;
    materiales: string[];
    today: string;
  }
): Promise<InventoryPushResult> {
  const daysRemaining = Math.round(
    (Date.parse(`${payload.fechaEstimada}T00:00:00Z`) -
      Date.parse(`${payload.today}T00:00:00Z`)) /
      86_400_000
  );
  const deadline = daysRemaining > 0
    ? `Faltan ${daysRemaining} día${daysRemaining === 1 ? "" : "s"} para la fecha estimada.`
    : daysRemaining === 0
      ? "La fecha estimada vence hoy."
      : `Venció hace ${Math.abs(daysRemaining)} día${daysRemaining === -1 ? "" : "s"}.`;
  const materials = payload.materiales.slice(0, 2).join(", ");
  const extraMaterials = payload.materiales.length > 2
    ? ` y ${payload.materiales.length - 2} más`
    : "";

  return sendInventoryPush(supabase, {
    title: "Requisición pendiente",
    body: `${deadline} ${payload.departamento}: ${materials}${extraMaterials}.`,
    tag: `requisition-reminder-${payload.id}`,
    url: "/inventario?module=requisiciones",
  });
}
