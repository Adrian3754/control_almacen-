import { timingSafeEqual } from "node:crypto";
import { createServerSupabaseClient } from "@/lib/supabase";
import { notifyRequisitionReminder } from "@/lib/inventoryPush";

type RequisitionReminder = {
  id: string;
  departamento_solicitante: string;
  fecha_estimada: string;
  ultimo_recordatorio_en: string | null;
  detalles: Array<{ descripcion: string }>;
};

function mexicoDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function isAuthorized(request: Request, secret: string) {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const suppliedBuffer = Buffer.from(supplied);
  const secretBuffer = Buffer.from(secret);
  return suppliedBuffer.length === secretBuffer.length &&
    timingSafeEqual(suppliedBuffer, secretBuffer);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("No se ejecutó el recordatorio de requisiciones: falta configurar CRON_SECRET.");
    return Response.json({ error: "El servicio de recordatorios no está configurado." }, { status: 500 });
  }
  if (!isAuthorized(request, secret)) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();
  const today = mexicoDate();
  let lastId: string | null = null;
  let requisitionsConsidered = 0;
  let sent = 0;
  let failed = 0;
  let withoutSubscribers = 0;
  const errors: string[] = [];

  while (true) {
    let query = supabase
      .from("requisiciones_materiales")
      .select("id, departamento_solicitante, fecha_estimada, ultimo_recordatorio_en, detalles:requisicion_materiales_detalles(descripcion)")
      .eq("estado", "pendiente")
      .or(`ultimo_recordatorio_en.is.null,ultimo_recordatorio_en.lt.${today}`)
      .order("id", { ascending: true })
      .limit(100);
    if (lastId) query = query.gt("id", lastId);

    const { data, error } = await query;
    if (error) {
      console.error("No se pudieron cargar requisiciones para enviar recordatorios:", error.message);
      return Response.json(
        { error: `No se pudieron cargar las requisiciones: ${error.message}` },
        { status: 500 }
      );
    }

    const requisitions = (data ?? []) as unknown as RequisitionReminder[];
    if (requisitions.length === 0) break;
    lastId = requisitions[requisitions.length - 1].id;

    for (const requisition of requisitions) {
      requisitionsConsidered += 1;
      const result = await notifyRequisitionReminder(supabase, {
        id: requisition.id,
        departamento: requisition.departamento_solicitante,
        fechaEstimada: requisition.fecha_estimada,
        materiales: requisition.detalles.map((detail) => detail.descripcion),
        today,
      });

      if (result.sent > 0) {
        sent += result.sent;
        failed += result.failed;
        const { error: updateError } = await supabase
          .from("requisiciones_materiales")
          .update({ ultimo_recordatorio_en: today })
          .eq("id", requisition.id)
          .eq("estado", "pendiente");
        if (updateError) {
          console.error(`Se envió el recordatorio ${requisition.id}, pero no se pudo guardar su fecha:`, updateError.message);
          errors.push(`${requisition.id}: no se pudo guardar la fecha del recordatorio.`);
        }
      } else if (result.status === "no_subscribers") {
        withoutSubscribers += 1;
      } else if (result.status === "not_configured" || result.status === "error") {
        failed += 1;
        errors.push(`${requisition.id}: no se pudo enviar el recordatorio.`);
      }
    }

    if (requisitions.length < 100) break;
  }

  return Response.json(
    { date: today, requisitionsConsidered, sent, failed, withoutSubscribers, errors },
    { status: errors.length > 0 ? 500 : 200 }
  );
}
