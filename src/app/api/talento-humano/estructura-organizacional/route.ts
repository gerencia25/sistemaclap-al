import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

const REQUIRED_PERMISSION = "AREAS_CARGOS_MANAGE";

function handleError(error: unknown) {
  console.error(
    "API Talento Humano · Estructura organizacional:",
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

async function generateAreaCode() {
  const { data, error } = await supabaseAdmin
    .from("company_areas")
    .select("area_code")
    .ilike("area_code", "AR-%")
    .order("area_code", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(
      `Error generando código de área: ${error.message}`,
    );
  }

  const lastCode =
    data?.[0]?.area_code as string | undefined;

  const match =
    lastCode?.match(/AR-(\d+)/);

  const nextNumber =
    match ? Number(match[1]) + 1 : 1;

  return `AR-${String(nextNumber).padStart(6, "0")}`;
}

async function generatePositionCode() {
  const { data, error } = await supabaseAdmin
    .from("company_positions")
    .select("position_code")
    .ilike("position_code", "CG-%")
    .order("position_code", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(
      `Error generando código de cargo: ${error.message}`,
    );
  }

  const lastCode =
    data?.[0]?.position_code as string | undefined;

  const match =
    lastCode?.match(/CG-(\d+)/);

  const nextNumber =
    match ? Number(match[1]) + 1 : 1;

  return `CG-${String(nextNumber).padStart(6, "0")}`;
}

export async function POST(request: Request) {
  try {
    await requireSystemPermission(
      request,
      REQUIRED_PERMISSION,
    );

    const body = await request.json();

    const entity =
      String(body.entity ?? "").trim();

    if (entity === "area") {
      const name =
        String(body.name ?? "").trim();

      if (!name) {
        return NextResponse.json(
          {
            error:
              "El nombre del área es obligatorio.",
          },
          { status: 400 },
        );
      }

      const areaCode =
        await generateAreaCode();

      const {
        data,
        error,
      } = await supabaseAdmin
        .from("company_areas")
        .insert({
          area_code: areaCode,
          name,
          description:
            String(
              body.description ?? "",
            ).trim() || null,
          manager_employee_id:
            String(
              body.manager_employee_id ?? "",
            ).trim() || null,
          parent_area_id:
            String(
              body.parent_area_id ?? "",
            ).trim() || null,
          status:
            String(
              body.status ?? "Activa",
            ).trim(),
          updated_at:
            new Date().toISOString(),
        })
        .select("*")
        .single();

      if (error) {
        throw new Error(
          `Error creando área: ${error.message}`,
        );
      }

      return NextResponse.json({
        area: data,
      });
    }

    if (entity === "position") {
      const areaId =
        String(body.area_id ?? "").trim();

      const name =
        String(body.name ?? "").trim();

      if (!areaId || !name) {
        return NextResponse.json(
          {
            error:
              "El área y el nombre del cargo son obligatorios.",
          },
          { status: 400 },
        );
      }

      const positionCode =
        await generatePositionCode();

      const {
        data,
        error,
      } = await supabaseAdmin
        .from("company_positions")
        .insert({
          position_code: positionCode,
          area_id: areaId,
          name,
          description:
            String(
              body.description ?? "",
            ).trim() || null,
          hierarchy_level:
            String(
              body.hierarchy_level ?? "Operativo",
            ).trim(),
          reports_to_position_id:
            String(
              body.reports_to_position_id ?? "",
            ).trim() || null,
          status:
            String(
              body.status ?? "Activo",
            ).trim(),
          updated_at:
            new Date().toISOString(),
        })
        .select("*")
        .single();

      if (error) {
        throw new Error(
          `Error creando cargo: ${error.message}`,
        );
      }

      return NextResponse.json({
        position: data,
      });
    }

    return NextResponse.json(
      {
        error:
          "Tipo de registro no válido.",
      },
      { status: 400 },
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireSystemPermission(
      request,
      REQUIRED_PERMISSION,
    );

    const body = await request.json();

    const entity =
      String(body.entity ?? "").trim();

    const id =
      String(body.id ?? "").trim();

    if (!id) {
      return NextResponse.json(
        {
          error:
            "El identificador es obligatorio.",
        },
        { status: 400 },
      );
    }

    if (entity === "area") {
      const name =
        String(body.name ?? "").trim();

      if (!name) {
        return NextResponse.json(
          {
            error:
              "El nombre del área es obligatorio.",
          },
          { status: 400 },
        );
      }

      const parentAreaId =
        String(
          body.parent_area_id ?? "",
        ).trim() || null;

      if (parentAreaId === id) {
        return NextResponse.json(
          {
            error:
              "Un área no puede depender de sí misma.",
          },
          { status: 400 },
        );
      }

      const {
        data,
        error,
      } = await supabaseAdmin
        .from("company_areas")
        .update({
          name,
          description:
            String(
              body.description ?? "",
            ).trim() || null,
          manager_employee_id:
            String(
              body.manager_employee_id ?? "",
            ).trim() || null,
          parent_area_id:
            parentAreaId,
          status:
            String(
              body.status ?? "Activa",
            ).trim(),
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        throw new Error(
          `Error actualizando área: ${error.message}`,
        );
      }

      return NextResponse.json({
        area: data,
      });
    }

    if (entity === "position") {
      const areaId =
        String(body.area_id ?? "").trim();

      const name =
        String(body.name ?? "").trim();

      if (!areaId || !name) {
        return NextResponse.json(
          {
            error:
              "El área y el nombre del cargo son obligatorios.",
          },
          { status: 400 },
        );
      }

      const reportsToPositionId =
        String(
          body.reports_to_position_id ?? "",
        ).trim() || null;

      if (reportsToPositionId === id) {
        return NextResponse.json(
          {
            error:
              "Un cargo no puede reportarse a sí mismo.",
          },
          { status: 400 },
        );
      }

      const {
        data,
        error,
      } = await supabaseAdmin
        .from("company_positions")
        .update({
          area_id: areaId,
          name,
          description:
            String(
              body.description ?? "",
            ).trim() || null,
          hierarchy_level:
            String(
              body.hierarchy_level ?? "Operativo",
            ).trim(),
          reports_to_position_id:
            reportsToPositionId,
          status:
            String(
              body.status ?? "Activo",
            ).trim(),
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        throw new Error(
          `Error actualizando cargo: ${error.message}`,
        );
      }

      return NextResponse.json({
        position: data,
      });
    }

    return NextResponse.json(
      {
        error:
          "Tipo de registro no válido.",
      },
      { status: 400 },
    );
  } catch (error) {
    return handleError(error);
  }
}
