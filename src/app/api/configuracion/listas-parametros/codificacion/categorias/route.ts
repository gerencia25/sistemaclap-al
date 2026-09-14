import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

export const runtime = "nodejs";

const REQUIRED_PERMISSION =
  "LISTAS_PARAMETROS_MANAGE";

function handleError(error: unknown) {
  console.error(
    "API Configuración Codificación · Categorías:",
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

function normalizeCode(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function normalizeName(value: unknown) {
  return String(value ?? "").trim();
}

function isValidCode(code: string) {
  return /^[A-Z0-9_-]+$/.test(code);
}

async function getCategoryDependencies(
  categoryId: string,
  categoryCode: string,
) {
  const [
    groupsResult,
    templatesResult,
    masterFieldsResult,
    productsResult,
    requestsResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("item_groups")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("category_id", categoryId),

    supabaseAdmin
      .from("item_classification_templates")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("category_code", categoryCode),

    supabaseAdmin
      .from("item_master_fields")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("category_code", categoryCode),

    supabaseAdmin
      .from("products")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("category_id", categoryId),

    supabaseAdmin
      .from("item_code_requests")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("classification_code", categoryCode),
  ]);

  const results = [
    groupsResult,
    templatesResult,
    masterFieldsResult,
    productsResult,
    requestsResult,
  ];

  const failed =
    results.find((result) => result.error);

  if (failed?.error) {
    throw new Error(
      `No se pudieron validar las dependencias de la categoría: ${failed.error.message}`,
    );
  }

  const groups =
    groupsResult.count ?? 0;

  const templates =
    templatesResult.count ?? 0;

  const masterFields =
    masterFieldsResult.count ?? 0;

  const products =
    productsResult.count ?? 0;

  const requests =
    requestsResult.count ?? 0;

  return {
    groups,
    templates,
    master_fields: masterFields,
    products,
    requests,
    total:
      groups +
      templates +
      masterFields +
      products +
      requests,
  };
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

    const { data, error } =
      await supabaseAdmin
        .from("item_categories")
        .select(`
          id,
          code,
          name,
          description,
          status,
          created_at
        `)
        .order("code");

    if (error) {
      throw new Error(
        `Error consultando categorías: ${error.message}`,
      );
    }

    const enriched =
      await Promise.all(
        (data ?? []).map(
          async (category) => {
            const dependencies =
              await getCategoryDependencies(
                category.id,
                category.code,
              );

            return {
              ...category,
              dependencies,
              code_locked:
                dependencies.total > 0,
            };
          },
        ),
      );

    return NextResponse.json({
      data: enriched,
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
    const systemUser =
      await requireSystemPermission(
        request,
        REQUIRED_PERMISSION,
      );

    const body = await request.json();

    const code =
      normalizeCode(body.code);

    const name =
      normalizeName(body.name);

    const description =
      normalizeName(body.description) ||
      null;

    if (!code) {
      return NextResponse.json(
        {
          error:
            "El código es obligatorio.",
        },
        { status: 400 },
      );
    }

    if (!isValidCode(code)) {
      return NextResponse.json(
        {
          error:
            "El código solo puede contener letras, números, guion y guion bajo.",
        },
        { status: 400 },
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          error:
            "El nombre es obligatorio.",
        },
        { status: 400 },
      );
    }

    const {
      data: existing,
      error: existingError,
    } = await supabaseAdmin
      .from("item_categories")
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
          error:
            `Ya existe una categoría con el código ${code}.`,
        },
        { status: 409 },
      );
    }

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("item_categories")
      .insert({
        code,
        name,
        description,
        status: "Activo",
      })
      .select(`
        id,
        code,
        name,
        description,
        status,
        created_at
      `)
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          {
            error:
              `Ya existe una categoría con el código ${code}.`,
          },
          { status: 409 },
        );
      }

      throw new Error(
        `Error creando categoría: ${error.message}`,
      );
    }

    console.info(
      `Categoría de codificación creada por ${systemUser.email}: ${code} · ${name}`,
    );

    return NextResponse.json(
      {
        data: {
          ...data,
          dependencies: {
            groups: 0,
            templates: 0,
            master_fields: 0,
            products: 0,
            requests: 0,
            total: 0,
          },
          code_locked: false,
        },
      },
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
    const systemUser =
      await requireSystemPermission(
        request,
        REQUIRED_PERMISSION,
      );

    const body = await request.json();

    const id =
      String(body.id ?? "").trim();

    if (!id) {
      return NextResponse.json(
        {
          error:
            "El ID es obligatorio.",
        },
        { status: 400 },
      );
    }

    const {
      data: current,
      error: currentError,
    } = await supabaseAdmin
      .from("item_categories")
      .select(`
        id,
        code,
        name,
        description,
        status
      `)
      .eq("id", id)
      .maybeSingle();

    if (currentError) {
      throw new Error(
        `Error consultando categoría: ${currentError.message}`,
      );
    }

    if (!current) {
      return NextResponse.json(
        {
          error:
            "La categoría no existe.",
        },
        { status: 404 },
      );
    }

    const updates:
      Record<string, unknown> = {};

    // -----------------------------------------------------
    // Código técnico
    // -----------------------------------------------------

    if (body.code !== undefined) {
      const code =
        normalizeCode(body.code);

      if (!code) {
        return NextResponse.json(
          {
            error:
              "El código no puede quedar vacío.",
          },
          { status: 400 },
        );
      }

      if (!isValidCode(code)) {
        return NextResponse.json(
          {
            error:
              "El código solo puede contener letras, números, guion y guion bajo.",
          },
          { status: 400 },
        );
      }

      if (code !== current.code) {
        const dependencies =
          await getCategoryDependencies(
            current.id,
            current.code,
          );

        if (dependencies.total > 0) {
          return NextResponse.json(
            {
              error:
                "El código técnico no puede modificarse porque la categoría ya tiene información relacionada. Puedes modificar el nombre, descripción o estado.",
              dependencies,
            },
            { status: 409 },
          );
        }

        const {
          data: duplicate,
          error: duplicateError,
        } = await supabaseAdmin
          .from("item_categories")
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
              error:
                `Ya existe otra categoría con el código ${code}.`,
            },
            { status: 409 },
          );
        }

        updates.code = code;
      }
    }

    // -----------------------------------------------------
    // Nombre
    // -----------------------------------------------------

    if (body.name !== undefined) {
      const name =
        normalizeName(body.name);

      if (!name) {
        return NextResponse.json(
          {
            error:
              "El nombre no puede quedar vacío.",
          },
          { status: 400 },
        );
      }

      updates.name = name;
    }

    // -----------------------------------------------------
    // Descripción
    // -----------------------------------------------------

    if (body.description !== undefined) {
      updates.description =
        normalizeName(
          body.description,
        ) || null;
    }

    // -----------------------------------------------------
    // Estado
    // -----------------------------------------------------

    if (body.status !== undefined) {
      const status =
        String(body.status).trim();

      if (
        !["Activo", "Inactivo"].includes(
          status,
        )
      ) {
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

    if (
      Object.keys(updates).length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "No se enviaron cambios para actualizar.",
        },
        { status: 400 },
      );
    }

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("item_categories")
      .update(updates)
      .eq("id", id)
      .select(`
        id,
        code,
        name,
        description,
        status,
        created_at
      `)
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          {
            error:
              "Ya existe otra categoría con ese código.",
          },
          { status: 409 },
        );
      }

      throw new Error(
        `Error actualizando categoría: ${error.message}`,
      );
    }

    const dependencies =
      await getCategoryDependencies(
        data.id,
        data.code,
      );

    console.info(
      `Categoría de codificación actualizada por ${systemUser.email}: ${data.code}`,
    );

    return NextResponse.json({
      data: {
        ...data,
        dependencies,
        code_locked:
          dependencies.total > 0,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
