import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

const REQUIRED_PERMISSION =
  "PERSONAL_EDIT_EMPLOYEE";

const EDITABLE_EMPLOYMENT_STATUSES = [
  "Activo",
  "Inactivo",
  "Suspendido",
];

function handleError(error: unknown) {
  console.error(
    "API Talento Humano · Editar empleado:",
    error
  );

  if (error instanceof ApiAuthorizationError) {
    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: error.status,
      }
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
    }
  );
}

export async function PATCH(request: Request) {
  try {
    // =====================================================
    // 1. AUTORIZACIÓN
    // =====================================================

    const systemUser =
      await requireSystemPermission(
        request,
        REQUIRED_PERMISSION
      );

    // =====================================================
    // 2. ENTRADA
    // =====================================================

    const body = await request.json();

    const employeeId = String(
      body.employee_id ?? ""
    ).trim();

    const documentType = String(
      body.document_type ?? ""
    ).trim();

    const documentNumber = String(
      body.document_number ?? ""
    ).trim();

    const firstName = String(
      body.first_name ?? ""
    ).trim();

    const lastName = String(
      body.last_name ?? ""
    ).trim();

    const areaId = String(
      body.area_id ?? ""
    ).trim();

    const positionId = String(
      body.position_id ?? ""
    ).trim();

    const directManagerId =
      body.direct_manager_id
        ? String(body.direct_manager_id).trim()
        : null;

    const email =
      body.email &&
      String(body.email).trim()
        ? String(body.email).trim()
        : null;

    const phone =
      body.phone &&
      String(body.phone).trim()
        ? String(body.phone).trim()
        : null;

    const hireDate =
      body.hire_date &&
      String(body.hire_date).trim()
        ? String(body.hire_date).trim()
        : null;

    const contractType =
      body.contract_type &&
      String(body.contract_type).trim()
        ? String(body.contract_type).trim()
        : null;

    const requestedEmploymentStatus =
      String(
        body.employment_status ?? ""
      ).trim();

    const notes =
      body.notes &&
      String(body.notes).trim()
        ? String(body.notes).trim()
        : null;

    // =====================================================
    // 3. VALIDACIONES BÁSICAS
    // =====================================================

    if (!employeeId) {
      return NextResponse.json(
        {
          error:
            "El empleado es obligatorio.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !documentType ||
      !documentNumber ||
      !firstName ||
      !lastName ||
      !areaId ||
      !positionId
    ) {
      return NextResponse.json(
        {
          error:
            "Completa los campos obligatorios.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      directManagerId &&
      directManagerId === employeeId
    ) {
      return NextResponse.json(
        {
          error:
            "Un empleado no puede ser su propio jefe directo.",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // 4. CONSULTAR EMPLEADO ACTUAL
    // =====================================================

    const {
      data: currentEmployee,
      error: currentEmployeeError,
    } = await supabaseAdmin
      .from("employees")
      .select(
        `
          id,
          employee_code,
          full_name,
          employment_status
        `
      )
      .eq("id", employeeId)
      .maybeSingle();

    if (currentEmployeeError) {
      throw new Error(
        `Error consultando empleado: ${currentEmployeeError.message}`
      );
    }

    if (!currentEmployee) {
      return NextResponse.json(
        {
          error:
            "El empleado no existe.",
        },
        {
          status: 404,
        }
      );
    }

    // =====================================================
    // 5. CONTROL DEL ESTADO LABORAL
    // =====================================================

    let employmentStatus =
      requestedEmploymentStatus;

    if (
      currentEmployee.employment_status ===
      "Retirado"
    ) {
      employmentStatus = "Retirado";
    } else {
      if (
        !EDITABLE_EMPLOYMENT_STATUSES.includes(
          requestedEmploymentStatus
        )
      ) {
        return NextResponse.json(
          {
            error:
              "El estado laboral seleccionado no es válido. Un empleado solo puede pasar a Retirado mediante el flujo de retiro.",
          },
          {
            status: 409,
          }
        );
      }
    }

    // =====================================================
    // 6. VALIDAR ÁREA
    // =====================================================

    const {
      data: area,
      error: areaError,
    } = await supabaseAdmin
      .from("company_areas")
      .select(
        `
          id,
          name,
          status
        `
      )
      .eq("id", areaId)
      .maybeSingle();

    if (areaError) {
      throw new Error(
        `Error consultando el área: ${areaError.message}`
      );
    }

    if (!area) {
      return NextResponse.json(
        {
          error:
            "El área seleccionada no existe.",
        },
        {
          status: 400,
        }
      );
    }

    if (area.status !== "Activa") {
      return NextResponse.json(
        {
          error:
            "El área seleccionada no está activa.",
        },
        {
          status: 409,
        }
      );
    }

    // =====================================================
    // 7. VALIDAR CARGO
    // =====================================================

    const {
      data: position,
      error: positionError,
    } = await supabaseAdmin
      .from("company_positions")
      .select(
        `
          id,
          name,
          area_id,
          status,
          reports_to_position_id
        `
      )
      .eq("id", positionId)
      .maybeSingle();

    if (positionError) {
      throw new Error(
        `Error consultando el cargo: ${positionError.message}`
      );
    }

    if (!position) {
      return NextResponse.json(
        {
          error:
            "El cargo seleccionado no existe.",
        },
        {
          status: 400,
        }
      );
    }

    if (position.status !== "Activo") {
      return NextResponse.json(
        {
          error:
            "El cargo seleccionado no está activo.",
        },
        {
          status: 409,
        }
      );
    }

    if (position.area_id !== area.id) {
      return NextResponse.json(
        {
          error:
            "El cargo seleccionado no pertenece al área indicada.",
        },
        {
          status: 409,
        }
      );
    }

    // =====================================================
    // 8. VALIDAR JEFE DIRECTO
    // =====================================================

    if (directManagerId) {
      if (!position.reports_to_position_id) {
        return NextResponse.json(
          {
            error:
              "El cargo seleccionado no tiene un cargo superior configurado y no debe tener jefe directo asignado.",
          },
          {
            status: 409,
          }
        );
      }

      const {
        data: manager,
        error: managerError,
      } = await supabaseAdmin
        .from("employees")
        .select(
          `
            id,
            full_name,
            employment_status,
            position_id
          `
        )
        .eq("id", directManagerId)
        .maybeSingle();

      if (managerError) {
        throw new Error(
          `Error consultando jefe directo: ${managerError.message}`
        );
      }

      if (!manager) {
        return NextResponse.json(
          {
            error:
              "El jefe directo seleccionado no existe.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        manager.employment_status !==
        "Activo"
      ) {
        return NextResponse.json(
          {
            error:
              "El jefe directo seleccionado no está activo.",
          },
          {
            status: 409,
          }
        );
      }

      if (
        manager.position_id !==
        position.reports_to_position_id
      ) {
        return NextResponse.json(
          {
            error:
              "El jefe directo seleccionado no ocupa el cargo superior definido en la estructura organizacional.",
          },
          {
            status: 409,
          }
        );
      }
    }

    // =====================================================
    // 9. VALIDAR DOCUMENTO DUPLICADO
    // =====================================================

    const {
      data: duplicateEmployee,
      error: duplicateError,
    } = await supabaseAdmin
      .from("employees")
      .select(
        `
          id,
          employee_code,
          full_name
        `
      )
      .eq(
        "document_number",
        documentNumber
      )
      .neq("id", employeeId)
      .maybeSingle();

    if (duplicateError) {
      throw new Error(
        `Error validando documento: ${duplicateError.message}`
      );
    }

    if (duplicateEmployee) {
      return NextResponse.json(
        {
          error:
            `Ya existe otro empleado con el documento ${documentNumber}.`,
        },
        {
          status: 409,
        }
      );
    }

    // =====================================================
    // 10. ACTUALIZAR EMPLEADO
    // =====================================================

    const fullName =
      `${firstName} ${lastName}`.trim();

    const {
      data: updatedEmployee,
      error: updateError,
    } = await supabaseAdmin
      .from("employees")
      .update({
        document_type:
          documentType,

        document_number:
          documentNumber,

        first_name:
          firstName,

        last_name:
          lastName,

        full_name:
          fullName,

        area_id:
          area.id,

        position_id:
          position.id,

        area:
          area.name,

        position:
          position.name,

        direct_manager_id:
          directManagerId,

        email,
        phone,

        hire_date:
          hireDate,

        contract_type:
          contractType,

        employment_status:
          employmentStatus,

        notes,

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", employeeId)
      .select(
        `
          id,
          employee_code,
          document_type,
          document_number,
          first_name,
          last_name,
          full_name,
          area_id,
          position_id,
          area,
          position,
          direct_manager_id,
          email,
          phone,
          hire_date,
          contract_type,
          employment_status,
          notes,
          updated_at
        `
      )
      .single();

    if (updateError) {
      throw new Error(
        `Error actualizando empleado: ${updateError.message}`
      );
    }

    // =====================================================
    // 11. AUDITORÍA DE SERVIDOR
    // =====================================================

    console.info(
      `Empleado ${updatedEmployee.employee_code} actualizado por ${systemUser.email}.`
    );

    // =====================================================
    // 12. RESPUESTA
    // =====================================================

    return NextResponse.json(
      {
        data:
          updatedEmployee,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    return handleError(error);
  }
}