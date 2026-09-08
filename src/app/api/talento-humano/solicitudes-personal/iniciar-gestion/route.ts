import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

const REQUIRED_PERMISSION = "PERSONAL_APPROVE";

function handleError(error: unknown) {
  console.error(
    "API Talento Humano · Iniciar gestión de solicitud de personal:",
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

    // =====================================================
    // 3. INICIAR GESTIÓN
    //
    // Solo permitimos:
    // Aprobada → En gestión
    // =====================================================

    const now = new Date().toISOString();

    const {
      data: updatedRequest,
      error: updateError,
    } = await supabaseAdmin
      .from("employee_requests")
      .update({
        status: "En gestión",
        in_progress_at: now,
        updated_at: now,
      })
      .eq("id", requestId)
      .eq("status", "Aprobada")
      .select(
        `
          id,
          request_number,
          status,
          in_progress_at
        `,
      )
      .maybeSingle();

    if (updateError) {
      throw new Error(
        `Error iniciando la gestión: ${updateError.message}`,
      );
    }

    if (!updatedRequest) {
      return NextResponse.json(
        {
          error:
            "Solo una solicitud en estado Aprobada puede pasar a En gestión.",
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
      `Solicitud ${updatedRequest.request_number} puesta En gestión por ${systemUser.email}.`,
    );

    return NextResponse.json({
      data: updatedRequest,
    });
  } catch (error) {
    return handleError(error);
  }
}