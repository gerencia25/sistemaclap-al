import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";
import { sendPersonalCoveredEmail } from "@/lib/server/sendPersonalCoveredEmail";
const REQUIRED_PERMISSION = "PERSONAL_CREATE_EMPLOYEE";
type CreateEmployeeResult = {
  employee_id: string;
  employee_code: string;
  full_name: string;
  employment_period_id: string;
  request_id: string | null;
  fulfilled_count: number | null;
  requested_quantity: number | null;
  request_status: string | null;
  closure_type: string | null;
};
function handleError(error: unknown) {
  console.error("API Talento Humano · Personal:", error);

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
// GET · Consultar empleados
// =========================================================

export async function GET(request: Request) {
  try {
    await requireSystemPermission(
      request,
      "PERSONAL_VIEW",
    );

    const {
      data: employees,
      error: employeesError,
    } = await supabaseAdmin
      .from("employees")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (employeesError) {
      throw new Error(
        `Error consultando personal: ${employeesError.message}`,
      );
    }

    return NextResponse.json({
      employees: employees ?? [],
    });
  } catch (error) {
    return handleError(error);
  }
}
// =========================================================
// POST · Crear empleado
// =========================================================

export async function POST(request: Request) {
  try {
    const systemUser = await requireSystemPermission(
      request,
      REQUIRED_PERMISSION,
    );

    const body = await request.json();

    // =====================================================
    // NORMALIZAR DATOS
    // =====================================================

    const documentType = String(
      body.document_type ?? "",
    ).trim();

    const documentNumber = String(
      body.document_number ?? "",
    ).trim();

    const firstName = String(
      body.first_name ?? "",
    ).trim();

    const lastName = String(
      body.last_name ?? "",
    ).trim();

    const areaId = String(
      body.area_id ?? "",
    ).trim();

    const positionId = String(
      body.position_id ?? "",
    ).trim();

    const directManagerId =
      String(body.direct_manager_id ?? "").trim() || null;

    const email =
      String(body.email ?? "").trim() || null;

    const phone =
      String(body.phone ?? "").trim() || null;

    const hireDate = String(
      body.hire_date ?? "",
    ).trim();

    const contractType =
      String(body.contract_type ?? "").trim() || null;

    const initialSalary = Number(
      body.initial_salary,
    );

    const employmentStatus = String(
      body.employment_status ?? "Activo",
    ).trim();

    const notes =
      String(body.notes ?? "").trim() || null;

    const requestId =
      String(body.request_id ?? "").trim() || null;

    // =====================================================
    // VALIDACIONES
    // =====================================================

    if (!documentType) {
      return NextResponse.json(
        {
          error:
            "El tipo de documento es obligatorio.",
        },
        { status: 400 },
      );
    }

    if (!documentNumber) {
      return NextResponse.json(
        {
          error:
            "El número de documento es obligatorio.",
        },
        { status: 400 },
      );
    }

    if (!firstName) {
      return NextResponse.json(
        {
          error: "Los nombres son obligatorios.",
        },
        { status: 400 },
      );
    }

    if (!lastName) {
      return NextResponse.json(
        {
          error: "Los apellidos son obligatorios.",
        },
        { status: 400 },
      );
    }

    if (!areaId) {
      return NextResponse.json(
        {
          error: "El área es obligatoria.",
        },
        { status: 400 },
      );
    }

    if (!positionId) {
      return NextResponse.json(
        {
          error: "El cargo es obligatorio.",
        },
        { status: 400 },
      );
    }

    if (!hireDate) {
      return NextResponse.json(
        {
          error:
            "La fecha de ingreso es obligatoria.",
        },
        { status: 400 },
      );
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(hireDate)
    ) {
      return NextResponse.json(
        {
          error:
            "La fecha de ingreso no tiene un formato válido.",
        },
        { status: 400 },
      );
    }

    if (
      !Number.isFinite(initialSalary) ||
      initialSalary <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "El salario inicial debe ser mayor a cero.",
        },
        { status: 400 },
      );
    }

    if (
      ![
        "Activo",
        "Inactivo",
        "Suspendido",
      ].includes(employmentStatus)
    ) {
      return NextResponse.json(
        {
          error:
            "El estado laboral inicial no es válido.",
        },
        { status: 400 },
      );
    }

    // =====================================================
    // VALIDAR ÁREA
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
        `,
      )
      .eq("id", areaId)
      .maybeSingle();

    if (areaError) {
      throw new Error(
        `Error consultando el área: ${areaError.message}`,
      );
    }

    if (!area) {
      return NextResponse.json(
        {
          error:
            "El área seleccionada no existe.",
        },
        { status: 400 },
      );
    }

    if (area.status !== "Activa") {
      return NextResponse.json(
        {
          error:
            "El área seleccionada no se encuentra activa.",
        },
        { status: 400 },
      );
    }

    // =====================================================
    // VALIDAR CARGO
    // =====================================================

    const {
      data: position,
      error: positionError,
    } = await supabaseAdmin
      .from("company_positions")
      .select(
        `
          id,
          area_id,
          name,
          status
        `,
      )
      .eq("id", positionId)
      .maybeSingle();

    if (positionError) {
      throw new Error(
        `Error consultando el cargo: ${positionError.message}`,
      );
    }

    if (!position) {
      return NextResponse.json(
        {
          error:
            "El cargo seleccionado no existe.",
        },
        { status: 400 },
      );
    }

    if (position.status !== "Activo") {
      return NextResponse.json(
        {
          error:
            "El cargo seleccionado no se encuentra activo.",
        },
        { status: 400 },
      );
    }

    if (position.area_id !== area.id) {
      return NextResponse.json(
        {
          error:
            "El cargo seleccionado no pertenece al área indicada.",
        },
        { status: 400 },
      );
    }

    // =====================================================
    // VALIDAR JEFE DIRECTO
    // =====================================================

    if (directManagerId) {
      const {
        data: manager,
        error: managerError,
      } = await supabaseAdmin
        .from("employees")
        .select(
          `
            id,
            employment_status
          `,
        )
        .eq("id", directManagerId)
        .maybeSingle();

      if (managerError) {
        throw new Error(
          `Error consultando el jefe directo: ${managerError.message}`,
        );
      }

      if (!manager) {
        return NextResponse.json(
          {
            error:
              "El jefe directo seleccionado no existe.",
          },
          { status: 400 },
        );
      }

      if (manager.employment_status !== "Activo") {
        return NextResponse.json(
          {
            error:
              "El jefe directo seleccionado no se encuentra activo.",
          },
          { status: 400 },
        );
      }
    }

    // =====================================================
    // CREACIÓN TRANSACCIONAL
    // =====================================================

    const {
      data,
      error,
    } = await supabaseAdmin.rpc(
      "create_employee_with_history",
      {
        p_document_type: documentType,
        p_document_number: documentNumber,

        p_first_name: firstName,
        p_last_name: lastName,

        p_area_id: area.id,
        p_position_id: position.id,

        // Los nombres no vienen del navegador.
        // Se toman directamente de los maestros oficiales.
        p_area: area.name,
        p_position: position.name,

        p_direct_manager_id: directManagerId,

        p_email: email,
        p_phone: phone,

        p_hire_date: hireDate,
        p_contract_type: contractType,

        p_initial_salary: initialSalary,

        p_employment_status: employmentStatus,
        p_notes: notes,

        p_created_by_user_id: systemUser.id,

        p_request_id: requestId,
      },
    );

    if (error) {
      const message = error.message ?? "";

      if (
        message.includes(
          "Ya existe un empleado registrado con el documento",
        )
      ) {
        return NextResponse.json(
          {
            error: message,
          },
          { status: 409 },
        );
      }

      if (
        message.includes(
          "no está en estado En gestión",
        ) ||
        message.includes(
          "ya tiene cubierta la cantidad solicitada",
        ) ||
        message.includes(
          "no corresponde al área solicitada",
        ) ||
        message.includes(
          "no corresponde al cargo solicitado",
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
        `Error creando empleado: ${message}`,
      );
    }

   const result = data as CreateEmployeeResult | null;

if (!result) {
  throw new Error(
    "La creación del empleado finalizó sin devolver información.",
  );
}

console.info(
  `Empleado creado por ${systemUser.email}:`,
  result,
);

let emailSent = false;
let emailWarning: string | null = null;

// =========================================================
// CORREO FINAL · SOLO AL CUBRIR COMPLETAMENTE LA SOLICITUD
// =========================================================

if (
  requestId &&
  result.request_status === "Cubierta" &&
  result.closure_type === "Completo"
) {
  try {
    // -----------------------------------------------------
    // 1. Consultar información oficial de la solicitud
    // -----------------------------------------------------

    const {
      data: coveredRequest,
      error: coveredRequestError,
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

    if (coveredRequestError) {
      throw new Error(
        `Error consultando la solicitud cubierta: ${coveredRequestError.message}`,
      );
    }

    // -----------------------------------------------------
    // 2. Consultar todas las personas vinculadas
    // -----------------------------------------------------

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
        `Error consultando las contrataciones de la solicitud: ${fulfillmentError.message}`,
      );
    }

    const employeeIds = (fulfillmentRows ?? [])
      .map((row) => row.employee_id)
      .filter(Boolean);

    if (employeeIds.length === 0) {
      throw new Error(
        "La solicitud quedó cubierta, pero no se encontraron empleados vinculados.",
      );
    }

    // -----------------------------------------------------
    // 3. Consultar datos del personal
    // -----------------------------------------------------

    const {
      data: coveredEmployees,
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
      .in("id", employeeIds);

    if (employeesError) {
      throw new Error(
        `Error consultando el personal vinculado: ${employeesError.message}`,
      );
    }

    const employeesById = new Map(
      (coveredEmployees ?? []).map((employee) => [
        employee.id,
        employee,
      ]),
    );

    // Conservamos el orden en que fueron vinculados.
    const emailEmployees = employeeIds
      .map((employeeId) =>
        employeesById.get(employeeId),
      )
      .filter(
        (
          employee,
        ): employee is NonNullable<typeof employee> =>
          Boolean(employee),
      )
      .map((employee) => ({
        fullName: employee.full_name,
        documentType: employee.document_type,
        documentNumber: employee.document_number,
        area: employee.area,
        position: employee.position,
        hireDate: employee.hire_date,
      }));

    // -----------------------------------------------------
    // 4. Enviar correo
    // -----------------------------------------------------

    await sendPersonalCoveredEmail({
      to: coveredRequest.requester_email,

      requesterName:
        coveredRequest.requester_name,

      requestNumber:
        coveredRequest.request_number,

      requestReason:
        coveredRequest.request_reason,

      area:
        coveredRequest.area,

      position:
        coveredRequest.position,

      requestedQuantity:
        coveredRequest.requested_quantity,

      fulfilledQuantity:
        emailEmployees.length,

      closureType: "Completo",

      closureReason: null,

      employees: emailEmployees,
    });

    emailSent = true;
  } catch (emailError) {
    emailWarning =
      emailError instanceof Error
        ? emailError.message
        : "No fue posible enviar el correo final.";

    console.error(
      `Empleado creado y solicitud cubierta, pero falló el correo de ${requestId}:`,
      emailError,
    );
  }
}

// =========================================================
// RESPUESTA
// =========================================================

return NextResponse.json(
  {
    data: result,

    notification: {
      required:
        Boolean(requestId) &&
        result.request_status === "Cubierta",

      sent: emailSent,

      warning: emailWarning,
    },
  },
  { status: 201 },
);

  } catch (error) {
    return handleError(error);
  }
}