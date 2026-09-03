import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";
import { sendPersonalCoveredEmail } from "@/lib/server/sendPersonalCoveredEmail";

const REQUIRED_PERMISSION = "PERSONAL_APPROVE";

function handleError(error: unknown) {
  console.error(
    "API Talento Humano · Cierre parcial solicitud de personal:",
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

    const closureReason = String(
      body.closure_reason ?? "",
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

    if (!closureReason) {
      return NextResponse.json(
        {
          error:
            "El motivo del cierre parcial es obligatorio.",
        },
        {
          status: 400,
        },
      );
    }

    // =====================================================
    // 3. CIERRE TRANSACCIONAL
    // =====================================================

    const {
      data,
      error,
    } = await supabaseAdmin.rpc(
      "close_employee_request_partial",
      {
        p_request_id:
          requestId,

        p_closure_reason:
          closureReason,

        p_closed_by_user_id:
          systemUser.id,
      },
    );

    if (error) {
      const message =
        error.message ?? "";

      const businessErrors = [
        "La solicitud de personal no existe",
        "Solo una solicitud En gestión puede cerrarse parcialmente",
        "La solicitud no tiene personas vinculadas",
        "La solicitud ya alcanzó la cantidad requerida",
        "El motivo del cierre parcial es obligatorio",
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
        `Error cerrando solicitud parcialmente: ${message}`,
      );
    }

    // =====================================================
    // 4. CONSULTAR SOLICITUD PARA EL CORREO
    // =====================================================

    const {
      data: employeeRequest,
      error: requestError,
    } = await supabaseAdmin
      .from("employee_requests")
      .select(
        `
          id,
          request_number,
          requester_name,
          requester_email,
          request_reason,
          area,
          position,
          requested_quantity,
          status,
          closure_type,
          closure_reason
        `,
      )
      .eq("id", requestId)
      .single();

    if (requestError) {
      throw new Error(
        `La solicitud se cerró, pero no fue posible consultar sus datos para el correo: ${requestError.message}`,
      );
    }

    // =====================================================
    // 5. CONSULTAR PERSONAS VINCULADAS
    // =====================================================

    const {
      data: fulfillmentRows,
      error: fulfillmentError,
    } = await supabaseAdmin
      .from("employee_request_fulfillments")
      .select(
        `
          employee_id,
          created_at
        `,
      )
      .eq("request_id", requestId)
      .order("created_at", {
        ascending: true,
      });

    if (fulfillmentError) {
      throw new Error(
        `La solicitud se cerró, pero no fue posible consultar el personal vinculado: ${fulfillmentError.message}`,
      );
    }

    const employeeIds =
      (fulfillmentRows ?? [])
        .map(
          (row) =>
            row.employee_id,
        )
        .filter(Boolean);

    let emailEmployees: {
      fullName: string;
      documentType: string;
      documentNumber: string;
      area: string;
      position: string;
      hireDate: string | null;
    }[] = [];

    if (employeeIds.length > 0) {
      const {
        data: employees,
        error: employeesError,
      } = await supabaseAdmin
        .from("employees")
        .select(
          `
            id,
            full_name,
            document_type,
            document_number,
            area,
            position,
            hire_date
          `,
        )
        .in(
          "id",
          employeeIds,
        );

      if (employeesError) {
        throw new Error(
          `La solicitud se cerró, pero no fue posible consultar los empleados vinculados: ${employeesError.message}`,
        );
      }

      const employeesById =
        new Map(
          (employees ?? []).map(
            (employee) => [
              employee.id,
              employee,
            ],
          ),
        );

      emailEmployees =
        employeeIds
          .map(
            (employeeId) =>
              employeesById.get(
                employeeId,
              ),
          )
          .filter(
            (
              employee,
            ): employee is NonNullable<typeof employee> =>
              Boolean(employee),
          )
          .map(
            (employee) => ({
              fullName:
                employee.full_name,

              documentType:
                employee.document_type,

              documentNumber:
                employee.document_number,

              area:
                employee.area,

              position:
                employee.position,

              hireDate:
                employee.hire_date,
            }),
          );
    }

    // =====================================================
    // 6. CORREO FINAL
    // =====================================================

    let emailSent = false;
    let emailWarning: string | null = null;

    try {
      await sendPersonalCoveredEmail({
        to:
          employeeRequest.requester_email,

        requesterName:
          employeeRequest.requester_name,

        requestNumber:
          employeeRequest.request_number,

        requestReason:
          employeeRequest.request_reason,

        area:
          employeeRequest.area,

        position:
          employeeRequest.position,

        requestedQuantity:
          employeeRequest.requested_quantity,

        fulfilledQuantity:
          emailEmployees.length,

        closureType:
          "Parcial",

        closureReason:
          employeeRequest.closure_reason,

        employees:
          emailEmployees,
      });

      emailSent = true;
    } catch (emailError) {
      emailWarning =
        emailError instanceof Error
          ? emailError.message
          : "No fue posible enviar el correo de cierre parcial.";

      console.error(
        `Solicitud ${employeeRequest.request_number} cerrada parcialmente, pero falló el correo:`,
        emailError,
      );
    }

    // =====================================================
    // 7. AUDITORÍA
    // =====================================================

    console.info(
      `Solicitud ${employeeRequest.request_number} cerrada parcialmente por ${systemUser.email}:`,
      data,
    );

    // =====================================================
    // 8. RESPUESTA
    // =====================================================

    return NextResponse.json(
      {
        data,

        notification: {
          required: true,
          sent: emailSent,
          warning: emailWarning,
        },
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    return handleError(error);
  }
}