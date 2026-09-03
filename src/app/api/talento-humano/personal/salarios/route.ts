import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

const VIEW_PERMISSION = "SALARY_VIEW";
const MANAGE_PERMISSION = "SALARY_MANAGE";

function handleError(error: unknown) {
  console.error(
    "API Talento Humano · Historial salarial:",
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

// =========================================================
// GET · Consultar historial salarial de un empleado
// =========================================================

export async function GET(request: Request) {
  try {
    await requireSystemPermission(
      request,
      VIEW_PERMISSION,
    );

    const url = new URL(request.url);

    const employeeId = String(
      url.searchParams.get("employeeId") ?? "",
    ).trim();

    if (!employeeId) {
      return NextResponse.json(
        {
          error:
            "El ID del empleado es obligatorio.",
        },
        { status: 400 },
      );
    }

    // =====================================================
    // EMPLEADO
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
          document_type,
          document_number,
          area,
          position,
          hire_date,
          employment_status
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
          error: "El empleado no existe.",
        },
        { status: 404 },
      );
    }

    // =====================================================
    // HISTORIAL SALARIAL
    // =====================================================

    const {
      data: salaryHistory,
      error: salaryError,
    } = await supabaseAdmin
      .from("employee_salary_history")
      .select(
  `
    id,
    employee_id,
    employment_period_id,

    monthly_salary,

    effective_from,
    effective_to,

    change_reason,

    status,
    cancelled_at,
    cancellation_reason,
    cancelled_by_user_id,

    created_by_user_id,

    created_at,
    updated_at
  `,
)
      .eq("employee_id", employeeId)
      .order("effective_from", {
        ascending: false,
      });

    if (salaryError) {
      throw new Error(
        `Error consultando historial salarial: ${salaryError.message}`,
      );
    }

    return NextResponse.json({
      data: {
        employee,
        salary_history: salaryHistory ?? [],
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

// =========================================================
// POST · Registrar cambio salarial
// =========================================================

export async function POST(request: Request) {
  try {
    const systemUser = await requireSystemPermission(
      request,
      MANAGE_PERMISSION,
    );

    const body = await request.json();

    const employeeId = String(
      body.employee_id ?? "",
    ).trim();

    const effectiveFrom = String(
      body.effective_from ?? "",
    ).trim();

    const changeReason = String(
      body.change_reason ?? "",
    ).trim();

    const newMonthlySalary = Number(
      body.new_monthly_salary,
    );

    // =====================================================
    // VALIDACIONES
    // =====================================================

    if (!employeeId) {
      return NextResponse.json(
        {
          error:
            "El empleado es obligatorio.",
        },
        { status: 400 },
      );
    }

    if (
      !Number.isFinite(newMonthlySalary) ||
      newMonthlySalary <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "El nuevo salario debe ser mayor a cero.",
        },
        { status: 400 },
      );
    }

    if (!effectiveFrom) {
      return NextResponse.json(
        {
          error:
            "La fecha de vigencia es obligatoria.",
        },
        { status: 400 },
      );
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        effectiveFrom,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "La fecha de vigencia no tiene un formato válido.",
        },
        { status: 400 },
      );
    }

    if (!changeReason) {
      return NextResponse.json(
        {
          error:
            "El motivo del cambio salarial es obligatorio.",
        },
        { status: 400 },
      );
    }

    // =====================================================
    // VALIDAR EMPLEADO Y PERIODO LABORAL VIGENTE
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
          employment_status
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
          error: "El empleado no existe.",
        },
        { status: 404 },
      );
    }

    const {
      data: activePeriod,
      error: activePeriodError,
    } = await supabaseAdmin
      .from("employee_employment_periods")
      .select(
        `
          id,
          start_date,
          end_date
        `,
      )
      .eq("employee_id", employeeId)
      .is("end_date", null)
      .maybeSingle();

    if (activePeriodError) {
      throw new Error(
        `Error consultando periodo laboral: ${activePeriodError.message}`,
      );
    }

    if (!activePeriod) {
      return NextResponse.json(
        {
          error:
            "El empleado no tiene un periodo laboral vigente.",
        },
        { status: 409 },
      );
    }

    if (
      effectiveFrom < activePeriod.start_date
    ) {
      return NextResponse.json(
        {
          error:
            "La fecha del cambio salarial no puede ser anterior al inicio del periodo laboral vigente.",
        },
        { status: 400 },
      );
    }

    // =====================================================
    // REGISTRAR CAMBIO SALARIAL
    // =====================================================

    const {
      data,
      error,
    } = await supabaseAdmin.rpc(
      "register_employee_salary_change",
      {
        p_employee_id: employeeId,
        p_new_monthly_salary:
          newMonthlySalary,
        p_effective_from: effectiveFrom,
        p_change_reason: changeReason,
        p_created_by_user_id:
          systemUser.id,
      },
    );

    if (error) {
      const message = error.message ?? "";

      if (
        message.includes(
          "no tiene un salario vigente",
        ) ||
        message.includes(
          "La nueva vigencia debe ser posterior",
        )
      ) {
        return NextResponse.json(
          {
            error: message,
          },
          { status: 409 },
        );
      }

      throw new Error(
        `Error registrando cambio salarial: ${message}`,
      );
    }

    console.info(
      `Cambio salarial registrado por ${systemUser.email}:`,
      data,
    );

    return NextResponse.json(
      {
        data,
      },
      { status: 201 },
    );
  } catch (error) {
    return handleError(error);
  }
}