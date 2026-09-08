import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireActiveSystemUser,
} from "@/lib/server/requireSystemPermission";

function handleError(error: unknown) {
  console.error(
    "API Talento Humano · Crear solicitud de personal:",
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
    // 1. USUARIO CLAP ACTIVO
    // =====================================================

    const systemUser =
      await requireActiveSystemUser(request);

    // =====================================================
    // 2. ENTRADA
    // =====================================================

    const body = await request.json();

    const requestReason = String(
      body.request_reason ?? "",
    ).trim();

    const areaId = String(
      body.area_id ?? "",
    ).trim();

    const positionId = String(
      body.position_id ?? "",
    ).trim();

    const requestedQuantity = Number(
      body.requested_quantity,
    );

    const requiredDate =
      String(
        body.required_date ?? "",
      ).trim() || null;

    const contractType =
      String(
        body.contract_type ?? "",
      ).trim() || null;

    const replacementEmployeeId =
      String(
        body.replacement_employee_id ?? "",
      ).trim() || null;

    const detailedDescription =
      String(
        body.detailed_description ?? "",
      ).trim();

    if (!requestReason) {
      return NextResponse.json(
        {
          error:
            "El motivo de la solicitud es obligatorio.",
        },
        {
          status: 400,
        },
      );
    }

    if (!areaId) {
      return NextResponse.json(
        {
          error:
            "El área donde se requiere el personal es obligatoria.",
        },
        {
          status: 400,
        },
      );
    }

    if (!positionId) {
      return NextResponse.json(
        {
          error:
            "El cargo requerido es obligatorio.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isInteger(requestedQuantity) ||
      requestedQuantity <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "La cantidad solicitada debe ser un número entero mayor a cero.",
        },
        {
          status: 400,
        },
      );
    }

    // =====================================================
    // 3. IDENTIDAD REAL DEL SOLICITANTE
    //
    // Si el usuario está vinculado a un empleado,
    // nombre, área y cargo salen de la base de datos.
    // El navegador no puede decidirlos.
    // =====================================================

    let requesterName =
      systemUser.full_name;

    let requesterEmail =
      systemUser.email;

    let requesterArea = "";
    let requesterPosition = "";

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

      requesterName =
        employee.full_name;

      requesterArea =
        employee.area;

      requesterPosition =
        employee.position;
    } else {
      // ===================================================
      // EXCEPCIÓN DE SUPERADMINISTRADOR
      //
      // El usuario técnico administrador actualmente
      // no está vinculado a un empleado.
      // ===================================================

      if (!systemUser.is_super_admin) {
        throw new ApiAuthorizationError(
          "Tu usuario CLAP debe estar vinculado a un empleado activo para crear solicitudes de personal.",
          403,
        );
      }

      requesterArea =
        String(
          body.requester_area ?? "",
        ).trim();

      requesterPosition =
        String(
          body.requester_position ?? "",
        ).trim() ||
        "Sin cargo registrado";

      if (!requesterArea) {
        return NextResponse.json(
          {
            error:
              "El área solicitante es obligatoria.",
          },
          {
            status: 400,
          },
        );
      }
    }

    // =====================================================
    // 4. CREACIÓN TRANSACCIONAL
    // =====================================================

    const {
      data,
      error,
    } = await supabaseAdmin.rpc(
      "create_employee_request",
      {
        p_requester_area:
          requesterArea,

        p_requester_name:
          requesterName,

        p_requester_position:
          requesterPosition,

        p_requester_email:
          requesterEmail,

        p_request_reason:
          requestReason,

        p_area_id:
          areaId,

        p_position_id:
          positionId,

        p_requested_quantity:
          requestedQuantity,

        p_required_date:
          requiredDate,

        p_contract_type:
          contractType,

        p_replacement_employee_id:
          replacementEmployeeId,

        p_detailed_description:
          detailedDescription,
      },
    );

    if (error) {
      const message =
        error.message ?? "";

      const businessErrors = [
        "El área solicitante es obligatoria",
        "El nombre del solicitante es obligatorio",
        "El cargo del solicitante es obligatorio",
        "El correo del solicitante es obligatorio",
        "El motivo de la solicitud es obligatorio",
        "El área donde se requiere el personal es obligatoria",
        "El cargo requerido es obligatorio",
        "La cantidad solicitada debe ser mayor a cero",
        "El área seleccionada no existe o no está activa",
        "El cargo seleccionado no existe",
        "El empleado seleccionado para reemplazo no existe",
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
        `Error creando solicitud de personal: ${message}`,
      );
    }

    // =====================================================
    // 5. RESULTADO
    // =====================================================

    console.info(
      `Solicitud ${data?.request_number ?? ""} creada por ${systemUser.email}.`,
    );

    return NextResponse.json({
      data,
      requester: {
        name: requesterName,
        email: requesterEmail,
        area: requesterArea,
        position: requesterPosition,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}