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
  console.error("API Crear Producto desde Solicitud:", error);

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
      "CODIFICACION_CREATE_PRODUCT",
    );

    const body = await request.json();

    const requestId =
      String(body?.request_id ?? "").trim();

    const product = body?.product;

    if (!requestId) {
      return NextResponse.json(
        { error: "La solicitud es obligatoria." },
        { status: 400 },
      );
    }

    if (
      !product ||
      typeof product !== "object" ||
      Array.isArray(product)
    ) {
      return NextResponse.json(
        { error: "La información del producto no es válida." },
        { status: 400 },
      );
    }

    const { data: result, error: rpcError } =
      await supabaseAdmin.rpc(
        "sc_create_product_from_request",
        {
          p_request_id: requestId,
          p_product: product,
          p_reviewed_by: systemUser.full_name,
        },
      );

    if (rpcError) {
      if (rpcError.code === "23505") {
        return NextResponse.json(
          {
            error:
              "Ya existe un producto con ese código oficial.",
          },
          { status: 409 },
        );
      }

      const message =
        rpcError.message ||
        "No se pudo crear el producto.";

      if (
        message.includes("ya fue gestionada") ||
        message.includes("Estado actual")
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

    if (!result) {
      throw new Error(
        "La creación terminó sin devolver información del producto.",
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
        created_product_code,
        created_product_name,
        status
      `)
      .eq("id", requestId)
      .maybeSingle();

    if (requestError) {
      console.error(
        "Producto creado, pero no se pudo consultar la solicitud para notificación:",
        requestError,
      );
    }

    let emailSent = false;

    if (
      codeRequest?.requester_email &&
      codeRequest.status === "Creado"
    ) {
      try {
        const safeRequesterName =
          escapeHtml(codeRequest.requester_name);

        const safeRequestNumber =
          escapeHtml(codeRequest.request_number);

        const safeProductCode =
          escapeHtml(
            codeRequest.created_product_code ?? "",
          );

        const safeProductName =
          escapeHtml(
            codeRequest.created_product_name ?? "",
          );

        const { error: emailError } =
          await resend.emails.send({
            from: "Sistema CLAP <notificaciones@mail.almultiformas.com>",
            to: [codeRequest.requester_email],
            subject: `Código creado - ${codeRequest.request_number}`,
            html: `
              <div style="font-family: Arial, sans-serif;">
                <h2>Código creado correctamente</h2>

                <p>Hola ${safeRequesterName},</p>

                <p>
                  La solicitud
                  <strong>${safeRequestNumber}</strong>
                  fue gestionada correctamente.
                </p>

                <p>
                  <strong>Código creado:</strong>
                  ${safeProductCode}
                </p>

                <p>
                  <strong>Producto:</strong>
                  ${safeProductName}
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
            "No se pudo enviar correo de código creado:",
            emailError,
          );
        }
      } catch (emailError) {
        console.error(
          "Error enviando correo de código creado:",
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
