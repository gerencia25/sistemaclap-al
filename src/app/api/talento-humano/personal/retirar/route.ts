import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

const REQUIRED_PERMISSION = "PERSONAL_RETIRE_EMPLOYEE";

function handleError(error: unknown) {
  console.error(
    "API Talento Humano · Retirar empleado:",
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
    // 1. PERMISO
    // =====================================================

    const systemUser = await requireSystemPermission(
      request,
      REQUIRED_PERMISSION,
    );

    // =====================================================
    // 2. DATOS DE ENTRADA
    // =====================================================

    const body = await request.json();

    const employeeId = String(
      body.employee_id ?? "",
    ).trim();

    const retirementDate = String(
      body.retirement_date ?? "",
    ).trim();

    const terminationType = String(
      body.termination_type ?? "",
    ).trim();

    const terminationReason = String(
      body.termination_reason ?? "",
    ).trim();

    // =====================================================
    // 3. VALIDACIONES
    // =====================================================

    if (!employeeId) {
      return NextResponse.json(
        {
          error:
            "El empleado es obligatorio.",
        },
        {
          status: 400,
        },
      );
    }

    if (!retirementDate) {
      return NextResponse.json(
        {
          error:
            "La fecha de retiro es obligatoria.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        retirementDate,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "La fecha de retiro no tiene un formato válido.",
        },
        {
          status: 400,
        },
      );
    }

    if (!terminationType) {
      return NextResponse.json(
        {
          error:
            "El tipo de retiro es obligatorio.",
        },
        {
          status: 400,
        },
      );
    }

    if (!terminationReason) {
      return NextResponse.json(
        {
          error:
            "El motivo del retiro es obligatorio.",
        },
        {
          status: 400,
        },
      );
    }

    // =====================================================
    // 4. VALIDAR EMPLEADO
    // =====================================================

    const {
      data: employee,
      error: employeeError,
    } = await supabaseAdmin
      .from("employees")
      .select(
        `
          id,
          employee_code,
          full_name,
          employment_status,
          area,
          position
        `,
      )
      .eq("id", employeeId)
      .maybeSingle();

    if (employeeError) {
      throw new Error(
        `Error consultando empleado: ${employeeError.message}`,
      );
    }

    if (!employee) {
      return NextResponse.json(
        {
          error:
            "El empleado no existe.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      employee.employment_status ===
      "Retirado"
    ) {
      return NextResponse.json(
        {
          error:
            "El empleado ya se encuentra retirado.",
        },
        {
          status: 409,
        },
      );
    }

    // =====================================================
    // 5. RETIRO TRANSACCIONAL
    // =====================================================

    const {
      data,
      error,
    } = await supabaseAdmin.rpc(
      "retire_employee",
      {
        p_employee_id:
          employeeId,

        p_retirement_date:
          retirementDate,

        p_termination_type:
          terminationType,

        p_termination_reason:
          terminationReason,

        p_retired_by_user_id:
          systemUser.id,
      },
    );

    if (error) {
      const message =
        error.message ?? "";

      const businessErrors = [
        "El empleado ya se encuentra retirado",
        "El empleado no tiene un periodo laboral vigente",
        "La fecha de retiro no puede ser anterior",
        "La fecha de retiro no puede ser futura",
        "No se encontró un salario aplicable",
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
        `Error retirando empleado: ${message}`,
      );
    }

    // =====================================================
    // 6. AUDITORÍA DE SERVIDOR
    // =====================================================

    console.info(
      `Empleado retirado por ${systemUser.email}:`,
      data,
    );

    // =====================================================
    // 7. RESPUESTA
    // =====================================================

    return NextResponse.json(
      {
        data,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    return handleError(error);
  }
}