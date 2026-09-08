import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

const REQUIRED_PERMISSION = "PERSONAL_VIEW";

function handleError(error: unknown) {
  console.error(
    "API Talento Humano · Consultar solicitudes de personal:",
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

export async function GET(request: Request) {
  try {
    // =====================================================
    // 1. AUTORIZACIÓN
    // =====================================================

    await requireSystemPermission(
      request,
      REQUIRED_PERMISSION,
    );

    // =====================================================
    // 2. SOLICITUDES
    // =====================================================

    const {
      data: requestsData,
      error: requestsError,
    } = await supabaseAdmin
      .from("employee_requests")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (requestsError) {
      throw new Error(
        `Error cargando solicitudes de personal: ${requestsError.message}`,
      );
    }

    // =====================================================
    // 3. COBERTURA
    // =====================================================

    const {
      data: fulfillmentData,
      error: fulfillmentError,
    } = await supabaseAdmin
      .from("employee_request_fulfillments")
      .select("request_id");

    if (fulfillmentError) {
      throw new Error(
        `Error cargando cobertura de solicitudes: ${fulfillmentError.message}`,
      );
    }

    const fulfillmentCounts: Record<string, number> = {};

    for (const row of fulfillmentData ?? []) {
      const requestId = row.request_id;

      if (!requestId) {
        continue;
      }

      fulfillmentCounts[requestId] =
        (fulfillmentCounts[requestId] ?? 0) + 1;
    }

    // =====================================================
    // 4. RESULTADO
    // =====================================================

    return NextResponse.json({
      data: {
        requests: requestsData ?? [],
        fulfillment_counts: fulfillmentCounts,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}