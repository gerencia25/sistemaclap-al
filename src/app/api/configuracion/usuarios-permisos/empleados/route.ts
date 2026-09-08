import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

function handleError(error: unknown) {
  console.error(
    "API Configuración · Empleados para usuarios y permisos:",
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
    await requireSystemPermission(
      request,
      "USUARIOS_PERMISOS_MANAGE",
    );

    const {
      data: employees,
      error: employeesError,
    } = await supabaseAdmin
      .from("employees")
      .select(
        `
          id,
          full_name,
          email,
          area,
          position,
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
        `Error consultando empleados: ${employeesError.message}`,
      );
    }

    return NextResponse.json({
      employees: employees ?? [],
    });
  } catch (error) {
    return handleError(error);
  }
}
