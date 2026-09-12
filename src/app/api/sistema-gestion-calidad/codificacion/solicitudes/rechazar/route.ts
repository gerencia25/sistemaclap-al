import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

function handleError(error: unknown) {
  console.error("API Rechazar Solicitud Codificación:", error);

  if (error instanceof ApiAuthorizationError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  const message =
    error instanceof Error
      ? error.message
      : "Ocurrió un error inesperado.";

  return NextResponse.json(
    { error: message },
    { status: 500 },
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function POST(request: Request) {
  try {
    const systemUser = await requireSystemPermission(
      request,
      "CODIFICACION_APPROVE",
    );

    const body = await request.json();

    const requestId =
      String(body?.request_id ?? "").trim();

    const rejectionReason =
      String(body?.rejection_reason ?? "").trim();

    if (!requestId) {
      return NextResponse.json(
        { error: "La solicitud es obligatoria." },
        { status: 400 },
      );
    }

    if (!rejectionReason) {
      return NextResponse.json(
        { error: "Debes registrar el motivo del rechazo." },
        { status: 400 },
      );
    }

    const {
      data: codeRequest,
      error: requestError,
    } = await supabaseAdmin
      .from("item_code_requests")
      .select(`
        id,
        request_number,
        requester_name,
        requester_email,
        status
      `)
      .eq("id", requestId)
      .maybeSingle();

    if (requestError) {
      throw new Error(
        `Error consultando la solicitud: ${requestError.message}`,
      );
    }

    if (!codeRequest) {
      return NextResponse.json(
        { error: "La solicitud no existe." },
        { status: 404 },
      );
    }

    if (codeRequest.status !== "Pendiente") {
      return NextResponse.json(
        {
          error:
            "La solicitud ya fue gestionada y no puede rechazarse nuevamente.",
        },
        { status: 409 },
      );
    }

    const now = new Date().toISOString();

    const {
      data: rejectedRequest,
      error: updateError,
    } = await supabaseAdmin
      .from("item_code_requests")
      .update({
        status: "Rechazado",
        rejection_reason: rejectionReason,
        rejected_at: now,
        reviewed_at: now,
        reviewed_by: systemUser.full_name,
        updated_at: now,
      })
      .eq("id", requestId)
      .eq("status", "Pendiente")
      .select(`
        id,
        request_number,
        status,
        rejection_reason,
        rejected_at,
        reviewed_at,
        reviewed_by
      `)
      .maybeSingle();

    if (updateError) {
      throw new Error(
        `No se pudo rechazar la solicitud: ${updateError.message}`,
      );
    }

    if (!rejectedRequest) {
      return NextResponse.json(
        {
          error:
            "La solicitud cambió de estado antes de completar el rechazo.",
        },
        { status: 409 },
      );
    }

    let emailSent = false;

    if (codeRequest.requester_email) {
      try {
        const safeRequestNumber =
          escapeHtml(codeRequest.request_number);

        const safeRequesterName =
          escapeHtml(codeRequest.requester_name);

        const safeReason =
          escapeHtml(rejectionReason);

        const { error: emailError } =
          await resend.emails.send({
            from: "Sistema CLAP <notificaciones@mail.almultiformas.com>",
            to: [codeRequest.requester_email],
            subject: `Solicitud ${codeRequest.request_number} rechazada`,
            html: `
              <div style="font-family: Arial, sans-serif;">
                <h2>Solicitud de código rechazada</h2>

                <p>Hola ${safeRequesterName},</p>

                <p>
                  La solicitud
                  <strong>${safeRequestNumber}</strong>
                  ha sido rechazada.
                </p>

                <p>
                  <strong>Motivo del rechazo:</strong>
                </p>

                <div style="
                  background:#fef2f2;
                  border:1px solid #fecaca;
                  padding:12px;
                  border-radius:8px;
                  margin:12px 0;
                ">
                  ${safeReason}
                </div>

                <p>
                  Si consideras necesario, puedes generar una nueva solicitud
                  incluyendo la información requerida.
                </p>

                <br />

                <p>Sistema CLAP</p>
              </div>
            `,
          });

        if (!emailError) {
          emailSent = true;
        } else {
          console.error(
            "No se pudo enviar correo de rechazo:",
            emailError,
          );
        }
      } catch (emailError) {
        console.error(
          "Error enviando correo de rechazo:",
          emailError,
        );
      }
    }

    return NextResponse.json({
      success: true,
      request: rejectedRequest,
      email_sent: emailSent,
    });
  } catch (error) {
    return handleError(error);
  }
}
