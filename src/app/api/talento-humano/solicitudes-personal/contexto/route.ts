import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireActiveSystemUser,
} from "@/lib/server/requireSystemPermission";

function handleError(error: unknown) {
  console.error(
    "API Talento Humano · Contexto solicitud de personal:",
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
    const systemUser =
      await requireActiveSystemUser(request);

    let requesterEmployee: {
      id: string;
      full_name: string;
      area: string;
      position: string;
      area_id: string | null;
      position_id: string | null;
    } | null = null;

    if (systemUser.employee_id) {
      const {
        data: employee,
        error: employeeError,
      } = await supabaseAdmin
        .from("employees")
        .select(
          `
            id,
            full_name,
            area,
            position,
            area_id,
            position_id,
            employment_status
          `,
        )
        .eq(
          "id",
          systemUser.employee_id,
        )
        .maybeSingle();

      if (employeeError) {
        throw new Error(
          `Error consultando el empleado vinculado al usuario: ${employeeError.message}`,
        );
      }

      if (!employee) {
        throw new ApiAuthorizationError(
          "El usuario CLAP tiene un empleado vinculado que ya no existe.",
          403,
        );
      }

      if (
        employee.employment_status !== "Activo"
      ) {
        throw new ApiAuthorizationError(
          "El empleado vinculado al usuario no se encuentra activo.",
          403,
        );
      }

      requesterEmployee = {
        id: employee.id,
        full_name: employee.full_name,
        area: employee.area,
        position: employee.position,
        area_id: employee.area_id,
        position_id: employee.position_id,
      };
    } else if (!systemUser.is_super_admin) {
      throw new ApiAuthorizationError(
        "Tu usuario CLAP debe estar vinculado a un empleado activo para crear solicitudes de personal.",
        403,
      );
    }

    const {
      data: employees,
      error: employeesError,
    } = await supabaseAdmin
      .from("employees")
      .select(
        `
          id,
          full_name,
          area_id,
          position_id,
          employment_status
        `,
      )
      .eq(
        "employment_status",
        "Activo",
      )
      .order(
        "full_name",
        {
          ascending: true,
        },
      );

    if (employeesError) {
      throw new Error(
        `Error consultando empleados activos: ${employeesError.message}`,
      );
    }

    return NextResponse.json({
      requester: {
        employee: requesterEmployee,
        full_name: systemUser.full_name,
        email: systemUser.email,
        is_super_admin:
          systemUser.is_super_admin,
      },
      employees: employees ?? [],
    });
  } catch (error) {
    return handleError(error);
  }
}
