import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

const REQUIRED_PERMISSION =
  "PERSONAL_CREATE_EMPLOYEE";

function handleError(error: unknown) {
  console.error(
    "API Talento Humano · Consultar solicitud vinculada:",
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
    // 2. REQUEST ID
    // =====================================================

    const url = new URL(request.url);

    const requestId =
      String(
        url.searchParams.get("request_id") ?? "",
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
    // 3. CONSULTAR SOLICITUD
    // =====================================================

    const {
      data: employeeRequest,
      error: requestError,
    } = await supabaseAdmin
      .from("employee_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();

    if (requestError) {
      throw new Error(
        `Error consultando la solicitud de personal: ${requestError.message}`,
      );
    }

    if (!employeeRequest) {
      return NextResponse.json(
        {
          error:
            "La solicitud de personal no existe.",
        },
        {
          status: 404,
        },
      );
    }

    // =====================================================
    // 4. VALIDAR ESTADO
    // =====================================================

    if (
      employeeRequest.status !==
      "En gestión"
    ) {
      return NextResponse.json(
        {
          error:
            `La solicitud ${employeeRequest.request_number} no está en estado En gestión.`,
        },
        {
          status: 409,
        },
      );
    }

    // =====================================================
    // 5. COBERTURA ACTUAL
    // =====================================================

    const {
      count,
      error: countError,
    } = await supabaseAdmin
      .from("employee_request_fulfillments")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "request_id",
        employeeRequest.id,
      );

    if (countError) {
      throw new Error(
        `Error consultando la cobertura de la solicitud: ${countError.message}`,
      );
    }

    const fulfilledCount =
      count ?? 0;

    if (
      fulfilledCount >=
      employeeRequest.requested_quantity
    ) {
      return NextResponse.json(
        {
          error:
            `La solicitud ${employeeRequest.request_number} ya tiene cubierta la cantidad solicitada.`,
        },
        {
          status: 409,
        },
      );
    }

    // =====================================================
    // 6. RESULTADO
    // =====================================================

    return NextResponse.json({
      data: {
        request: employeeRequest,
        fulfilled_count:
          fulfilledCount,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}