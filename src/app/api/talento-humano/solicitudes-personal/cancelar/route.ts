import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

const REQUIRED_PERMISSION = "PERSONAL_APPROVE";

function handleError(error: unknown) {
  console.error(
    "API Talento Humano · Cancelar solicitud de personal:",
    error,
  );

  if (error instanceof ApiAuthorizationError) {
    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: error.status,
      },
    );
  }

  const message =
    error instanceof Error
      ? error.message
      : "Ocurrió un error inesperado.";

  return NextResponse.json(
    {
      error: message,
    },
    {
      status: 500,
    },
  );
}

export async function POST(request: Request) {
  try {
    // =====================================================
    // 1. AUTORIZACIÓN
    // =====================================================

    const systemUser = await requireSystemPermission(
      request,
      REQUIRED_PERMISSION,
    );

    // =====================================================
    // 2. ENTRADA
    // =====================================================

    const body = await request.json();

    const requestId = String(
      body.request_id ?? "",
    ).trim();

    const cancellationReason = String(
      body.cancellation_reason ?? "",
    ).trim();

    if (!requestId) {
      return NextResponse.json(
        {
          error:
            "La solicitud de personal es obligatoria.",
        },
        {
          status: 400,
        },
      );
    }

    if (!cancellationReason) {
      return NextResponse.json(
        {
          error:
            "El motivo de la cancelación es obligatorio.",
        },
        {
          status: 400,
        },
      );
    }

    // =====================================================
    // 3. CANCELACIÓN TRANSACCIONAL
    // =====================================================

    const {
      data,
      error,
    } = await supabaseAdmin.rpc(
      "cancel_employee_request",
      {
        p_request_id:
          requestId,

        p_cancellation_reason:
          cancellationReason,
      },
    );

    if (error) {
      const message =
        error.message ?? "";

      const businessErrors = [
        "La solicitud de personal es obligatoria",
        "El motivo de la cancelación es obligatorio",
        "La solicitud de personal no existe",
        "Solo una solicitud Aprobada o En gestión puede ser cancelada",
        "La solicitud ya tiene personas vinculadas",
      ];

      const isBusinessError =
        businessErrors.some(
          (text) =>
            message.includes(text),
        );

      if (isBusinessError) {
        return NextResponse.json(
          {
            error: message,
          },
          {
            status: 409,
          },
        );
      }

      throw new Error(
        `Error cancelando solicitud: ${message}`,
      );
    }

    // =====================================================
    // 4. RESULTADO
    // =====================================================

    console.info(
      `Solicitud ${data?.request_number ?? requestId} cancelada por ${systemUser.email}.`,
    );

    return NextResponse.json({
      data,
    });
  } catch (error) {
    return handleError(error);
  }
}