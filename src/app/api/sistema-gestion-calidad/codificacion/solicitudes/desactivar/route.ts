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
  console.error(
    "API Desactivar Producto desde Solicitud:",
    error,
  );

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

function isObject(
  value: unknown,
): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value),
  );
}

export async function POST(request: Request) {
  try {
    const systemUser = await requireSystemPermission(
      request,
      "CODIFICACION_DEACTIVATE_PRODUCT",
    );

    const body = await request.json();

    const requestId =
      String(body?.request_id ?? "").trim();

    if (!requestId) {
      return NextResponse.json(
        {
          error:
            "La solicitud es obligatoria.",
        },
        { status: 400 },
      );
    }

    const {
      data: result,
      error: rpcError,
    } = await supabaseAdmin.rpc(
      "sc_deactivate_product_from_request",
      {
        p_request_id: requestId,
        p_reviewed_by:
          systemUser.full_name,
      },
    );

    if (rpcError) {
      const message =
        rpcError.message ||
        "No se pudo desactivar el producto.";

      if (
        message.includes(
          "ya fue gestionada",
        ) ||
        message.includes(
          "Estado actual",
        ) ||
        message.includes(
          "no está activo",
        )
      ) {
        return NextResponse.json(
          { error: message },
          { status: 409 },
        );
      }

      return NextResponse.json(
        { error: message },
        { status: 400 },
      );
    }

    if (!result || !isObject(result)) {
      throw new Error(
        "La desactivación terminó sin devolver información.",
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
      console.error(
        "Producto desactivado, pero no se pudo consultar la solicitud para notificación:",
        requestError,
      );
    }

    let emailSent = false;

    if (
      codeRequest?.requester_email &&
      codeRequest.status === "Desactivado"
    ) {
      try {
        const safeRequesterName =
          escapeHtml(
            codeRequest.requester_name,
          );

        const safeRequestNumber =
          escapeHtml(
            codeRequest.request_number,
          );

        const safeProductCode =
          escapeHtml(
            String(
              result.product_code ?? "",
            ),
          );

        const safeProductName =
          escapeHtml(
            String(
              result.product_name ?? "",
            ),
          );

        const {
          error: emailError,
        } = await resend.emails.send({
          from:
            "Sistema CLAP <notificaciones@mail.almultiformas.com>",
          to: [
            codeRequest.requester_email,
          ],
          subject:
            `Producto desactivado - ${codeRequest.request_number}`,
          html: `
            <div style="font-family: Arial, sans-serif;">
              <h2>Producto desactivado correctamente</h2>

              <p>Hola ${safeRequesterName},</p>

              <p>
                La solicitud
                <strong>${safeRequestNumber}</strong>
                fue gestionada correctamente.
              </p>

              <p>
                <strong>Código:</strong>
                ${safeProductCode}
              </p>

              <p>
                <strong>Producto:</strong>
                ${safeProductName}
              </p>

              <p>
                El producto quedó en estado
                <strong>Inactivo</strong>.
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
            "No se pudo enviar correo de desactivación:",
            emailError,
          );
        }
      } catch (emailError) {
        console.error(
          "Error enviando correo de desactivación:",
          emailError,
        );
      }
    }

    return NextResponse.json({
      success: true,
      result,
      email_sent: emailSent,
    });
  } catch (error) {
    return handleError(error);
  }
}
