import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

const REQUIRED_PERMISSION = "LISTAS_PARAMETROS_MANAGE";

function handleError(error: unknown) {
  console.error("API Categorías de terceros:", error);

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
// GET · Consultar categorías
// =========================================================

export async function GET(request: Request) {
  try {
    await requireSystemPermission(
      request,
      REQUIRED_PERMISSION,
    );

    const { data, error } = await supabaseAdmin
      .from("third_party_categories")
      .select(
        `
          id,
          code,
          name,
          description,
          requires_customer_knowledge,
          requires_supplier_knowledge,
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
        `Error consultando categorías de terceros: ${error.message}`,
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
// POST · Crear categoría
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

    const requiresCustomerKnowledge =
      Boolean(body.requires_customer_knowledge);

    const requiresSupplierKnowledge =
      Boolean(body.requires_supplier_knowledge);

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
        .from("third_party_categories")
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
          error: `Ya existe una categoría con el código ${code}.`,
        },
        { status: 409 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("third_party_categories")
      .insert({
        code,
        name,
        description,
        requires_customer_knowledge: requiresCustomerKnowledge,
        requires_supplier_knowledge: requiresSupplierKnowledge,
        display_order: displayOrder,
        status: "Activo",
      })
      .select(
        `
          id,
          code,
          name,
          description,
          requires_customer_knowledge,
          requires_supplier_knowledge,
          status,
          display_order,
          created_at,
          updated_at
        `,
      )
      .single();

    if (error) {
      throw new Error(
        `Error creando categoría de tercero: ${error.message}`,
      );
    }

    console.info(
      `Categoría de tercero creada por ${systemUser.email}: ${code} · ${name}`,
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
        .from("third_party_categories")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (currentError) {
      throw new Error(
        `Error consultando categoría: ${currentError.message}`,
      );
    }

    if (!current) {
      return NextResponse.json(
        { error: "La categoría no existe." },
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
          .from("third_party_categories")
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
            error: `Ya existe otra categoría con el código ${code}.`,
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

    if (body.requires_customer_knowledge !== undefined) {
      updates.requires_customer_knowledge =
        Boolean(body.requires_customer_knowledge);
    }

    if (body.requires_supplier_knowledge !== undefined) {
      updates.requires_supplier_knowledge =
        Boolean(body.requires_supplier_knowledge);
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
      .from("third_party_categories")
      .update(updates)
      .eq("id", id)
      .select(
        `
          id,
          code,
          name,
          description,
          requires_customer_knowledge,
          requires_supplier_knowledge,
          status,
          display_order,
          created_at,
          updated_at
        `,
      )
      .single();

    if (error) {
      throw new Error(
        `Error actualizando categoría: ${error.message}`,
      );
    }

    console.info(
      `Categoría de tercero actualizada por ${systemUser.email}: ${data.code}`,
    );

    return NextResponse.json({ data });
  } catch (error) {
    return handleError(error);
  }
}