import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireActiveSystemUser,
} from "@/lib/server/requireSystemPermission";

function handleError(error: unknown) {
  console.error(
    "API Usuario · Contexto laboral:",
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

    let employee: {
      id: string;
      full_name: string;
      email: string | null;
      area: string;
      position: string;
      area_id: string | null;
      position_id: string | null;
      employment_status: string;
    } | null = null;

    let positionName = "";

    if (systemUser.employee_id) {
      const {
        data: employeeData,
        error: employeeError,
      } = await supabaseAdmin
        .from("employees")
        .select(
          `
            id,
            full_name,
            email,
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
          `Error consultando el empleado vinculado: ${employeeError.message}`,
        );
      }

      if (!employeeData) {
        throw new ApiAuthorizationError(
          "El empleado vinculado al usuario ya no existe.",
          403,
        );
      }

      if (
        employeeData.employment_status !== "Activo"
      ) {
        throw new ApiAuthorizationError(
          "El empleado vinculado al usuario no se encuentra activo.",
          403,
        );
      }

      employee = employeeData;

      positionName =
        employeeData.position?.trim() ?? "";

      if (employeeData.position_id) {
        const {
          data: position,
          error: positionError,
        } = await supabaseAdmin
          .from("company_positions")
          .select("name")
          .eq(
            "id",
            employeeData.position_id,
          )
          .maybeSingle();

        if (positionError) {
          throw new Error(
            `Error consultando el cargo del empleado: ${positionError.message}`,
          );
        }

        positionName =
          position?.name?.trim() ||
          positionName;
      }
    }

    return NextResponse.json({
      user: {
        id: systemUser.id,
        full_name: systemUser.full_name,
        email: systemUser.email,
        is_super_admin:
          systemUser.is_super_admin,
      },
      employee,
      position_name: positionName,
    });
  } catch (error) {
    return handleError(error);
  }
}
