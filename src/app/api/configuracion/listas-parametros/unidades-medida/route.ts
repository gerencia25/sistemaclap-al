import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

const REQUIRED_PERMISSION = "LISTAS_PARAMETROS_MANAGE";

function handleError(error: unknown) {
  console.error("API Unidades de medida:", error);

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

const selectFields = `
  id,
  code,
  name,
  symbol,
  description,
  status,
  display_order,
  created_at,
  updated_at
`;

// =========================================================
// GET · Consultar unidades de medida
// =========================================================

export async function GET(request: Request) {
  try {
    await requireSystemPermission(
      request,
      REQUIRED_PERMISSION,
    );

    const { data, error } = await supabaseAdmin
      .from("measurement_units")
      .select(selectFields)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      throw new Error(
        `Error consultando unidades de medida: ${error.message}`,
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
// POST · Crear unidad de medida
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
    const symbol = String(body.symbol ?? "").trim();

    const description =
      String(body.description ?? "").trim() || null;

    const displayOrder = Number(
      body.display_order ?? 0,
    );

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

    if (!symbol) {
      return NextResponse.json(
        { error: "El símbolo es obligatorio." },
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
        .from("measurement_units")
        .select("id")
        .ilike("code", code)
        .maybeSingle();

    if (existingError) {
      throw new Error(
        `Error validando código: ${existingError.message}`,
      );
    }

    if (existing) {
      return NextResponse.json(
        {
          error: `Ya existe una unidad de medida con el código ${code}.`,
        },
        { status: 409 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("measurement_units")
      .insert({
        code,
        name,
        symbol,
        description,
        display_order: displayOrder,
        status: "Activo",
      })
      .select(selectFields)
      .single();

    if (error) {
      throw new Error(
        `Error creando unidad de medida: ${error.message}`,
      );
    }

    console.info(
      `Unidad de medida creada por ${systemUser.email}: ${code} · ${name}`,
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
        .from("measurement_units")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (currentError) {
      throw new Error(
        `Error consultando unidad de medida: ${currentError.message}`,
      );
    }

    if (!current) {
      return NextResponse.json(
        { error: "La unidad de medida no existe." },
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
          .from("measurement_units")
          .select("id")
          .ilike("code", code)
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
            error: `Ya existe una unidad de medida con el código ${code}.`,
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

    if (body.symbol !== undefined) {
      const symbol = String(body.symbol).trim();

      if (!symbol) {
        return NextResponse.json(
          { error: "El símbolo no puede quedar vacío." },
          { status: 400 },
        );
      }

      updates.symbol = symbol;
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
      const status = String(body.status).trim();

      if (!["Activo", "Inactivo"].includes(status)) {
        return NextResponse.json(
          { error: "El estado indicado no es válido." },
          { status: 400 },
        );
      }

      updates.status = status;
    }

    const { data, error } = await supabaseAdmin
      .from("measurement_units")
      .update(updates)
      .eq("id", id)
      .select(selectFields)
      .single();

    if (error) {
      throw new Error(
        `Error actualizando unidad de medida: ${error.message}`,
      );
    }

    console.info(
      `Unidad de medida actualizada por ${systemUser.email}: ${data.code} · ${data.name}`,
    );

    return NextResponse.json({
      data,
    });
  } catch (error) {
    return handleError(error);
  }
}
