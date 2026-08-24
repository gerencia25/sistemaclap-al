import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

const REQUIRED_PERMISSION = "LISTAS_PARAMETROS_MANAGE";

function handleError(error: unknown) {
  console.error("API Líneas de negocio:", error);

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
// GET · Consultar líneas de negocio
// =========================================================

export async function GET(request: Request) {
  try {
    await requireSystemPermission(
      request,
      REQUIRED_PERMISSION,
    );

    const { data, error } = await supabaseAdmin
      .from("commercial_business_lines")
      .select(
        `
          id,
          code,
          name,
          description,
          status,
          display_order,
          created_at,
          updated_at
        `,
      )
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      throw new Error(
        `Error consultando líneas de negocio: ${error.message}`,
      );
    }

    return NextResponse.json({
      data: data ?? [],
    });
  } catch (error) {
    return handleError(error);
  }
}

// =========================================================
// POST · Crear línea de negocio
// =========================================================

export async function POST(request: Request) {
  try {
    const systemUser = await requireSystemPermission(
      request,
      REQUIRED_PERMISSION,
    );

    const body = await request.json();

    const code = String(body.code ?? "")
      .trim()
      .toUpperCase();

    const name = String(body.name ?? "").trim();

    const description =
      String(body.description ?? "").trim() || null;

    const displayOrder = Number(body.display_order ?? 0);

    if (!code) {
      return NextResponse.json(
        { error: "El código es obligatorio." },
        { status: 400 },
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "El nombre es obligatorio." },
        { status: 400 },
      );
    }

    if (
      !Number.isInteger(displayOrder) ||
      displayOrder < 0
    ) {
      return NextResponse.json(
        {
          error:
            "El orden debe ser un número entero igual o mayor a 0.",
        },
        { status: 400 },
      );
    }

    const { data: existing, error: existingError } =
      await supabaseAdmin
        .from("commercial_business_lines")
        .select("id")
        .eq("code", code)
        .maybeSingle();

    if (existingError) {
      throw new Error(
        `Error validando código: ${existingError.message}`,
      );
    }

    if (existing) {
      return NextResponse.json(
        {
          error: `Ya existe una línea de negocio con el código ${code}.`,
        },
        { status: 409 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("commercial_business_lines")
      .insert({
        code,
        name,
        description,
        display_order: displayOrder,
        status: "Activo",
      })
      .select(
        `
          id,
          code,
          name,
          description,
          status,
          display_order,
          created_at,
          updated_at
        `,
      )
      .single();

    if (error) {
      throw new Error(
        `Error creando línea de negocio: ${error.message}`,
      );
    }

    console.info(
      `Línea de negocio creada por ${systemUser.email}: ${code} · ${name}`,
    );

    return NextResponse.json(
      { data },
      { status: 201 },
    );
  } catch (error) {
    return handleError(error);
  }
}

// =========================================================
// PATCH · Editar / activar / inactivar
// =========================================================

export async function PATCH(request: Request) {
  try {
    const systemUser = await requireSystemPermission(
      request,
      REQUIRED_PERMISSION,
    );

    const body = await request.json();

    const id = String(body.id ?? "").trim();

    if (!id) {
      return NextResponse.json(
        { error: "El ID es obligatorio." },
        { status: 400 },
      );
    }

    const { data: current, error: currentError } =
      await supabaseAdmin
        .from("commercial_business_lines")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (currentError) {
      throw new Error(
        `Error consultando línea de negocio: ${currentError.message}`,
      );
    }

    if (!current) {
      return NextResponse.json(
        { error: "La línea de negocio no existe." },
        { status: 404 },
      );
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.code !== undefined) {
      const code = String(body.code)
        .trim()
        .toUpperCase();

      if (!code) {
        return NextResponse.json(
          { error: "El código no puede quedar vacío." },
          { status: 400 },
        );
      }

      const { data: duplicate, error: duplicateError } =
        await supabaseAdmin
          .from("commercial_business_lines")
          .select("id")
          .eq("code", code)
          .neq("id", id)
          .maybeSingle();

      if (duplicateError) {
        throw new Error(
          `Error validando código: ${duplicateError.message}`,
        );
      }

      if (duplicate) {
        return NextResponse.json(
          {
            error: `Ya existe otra línea de negocio con el código ${code}.`,
          },
          { status: 409 },
        );
      }

      updates.code = code;
    }

    if (body.name !== undefined) {
      const name = String(body.name).trim();

      if (!name) {
        return NextResponse.json(
          { error: "El nombre no puede quedar vacío." },
          { status: 400 },
        );
      }

      updates.name = name;
    }

    if (body.description !== undefined) {
      updates.description =
        String(body.description).trim() || null;
    }

    if (body.display_order !== undefined) {
      const displayOrder = Number(body.display_order);

      if (
        !Number.isInteger(displayOrder) ||
        displayOrder < 0
      ) {
        return NextResponse.json(
          {
            error:
              "El orden debe ser un número entero igual o mayor a 0.",
          },
          { status: 400 },
        );
      }

      updates.display_order = displayOrder;
    }

    if (body.status !== undefined) {
      const status = String(body.status);

      if (!["Activo", "Inactivo"].includes(status)) {
        return NextResponse.json(
          {
            error:
              "El estado debe ser Activo o Inactivo.",
          },
          { status: 400 },
        );
      }

      updates.status = status;
    }

    const { data, error } = await supabaseAdmin
      .from("commercial_business_lines")
      .update(updates)
      .eq("id", id)
      .select(
        `
          id,
          code,
          name,
          description,
          status,
          display_order,
          created_at,
          updated_at
        `,
      )
      .single();

    if (error) {
      throw new Error(
        `Error actualizando línea de negocio: ${error.message}`,
      );
    }

    console.info(
      `Línea de negocio actualizada por ${systemUser.email}: ${data.code}`,
    );

    return NextResponse.json({ data });
  } catch (error) {
    return handleError(error);
  }
}