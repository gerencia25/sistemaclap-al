import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

const REQUIRED_PERMISSION = "PERSONAL_APPROVE";

function handleError(error: unknown) {
  console.error(
    "API Talento Humano · Rechazar solicitud de personal:",
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

    const rejectionReason = String(
      body.rejection_reason ?? "",
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

    if (!rejectionReason) {
      return NextResponse.json(
        {
          error:
            "El motivo del rechazo es obligatorio.",
        },
        {
          status: 400,
        },
      );
    }

    // =====================================================
    // 3. RECHAZAR
    //
    // Solo permitimos:
    // Pendiente → Rechazada
    // =====================================================

    const now = new Date().toISOString();

    const {
      data: updatedRequest,
      error: updateError,
    } = await supabaseAdmin
      .from("employee_requests")
      .update({
        status: "Rechazada",
        rejection_reason: rejectionReason,
        rejected_at: now,
        updated_at: now,
      })
      .eq("id", requestId)
      .eq("status", "Pendiente")
      .select(
        `
          id,
          request_number,
          status,
          rejection_reason,
          rejected_at
        `,
      )
      .maybeSingle();

    if (updateError) {
      throw new Error(
        `Error rechazando solicitud: ${updateError.message}`,
      );
    }

    if (!updatedRequest) {
      return NextResponse.json(
        {
          error:
            "Solo una solicitud en estado Pendiente puede ser rechazada.",
        },
        {
          status: 409,
        },
      );
    }

    // =====================================================
    // 4. RESULTADO
    // =====================================================

    console.info(
      `Solicitud ${updatedRequest.request_number} rechazada por ${systemUser.email}.`,
    );

    return NextResponse.json({
      data: updatedRequest,
    });
  } catch (error) {
    return handleError(error);
  }
}