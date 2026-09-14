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
    "API Configuración Codificación · Grupos:",
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

async function getCategory(
  categoryId: string,
) {
  const { data, error } =
    await supabaseAdmin
      .from("item_categories")
      .select(`
        id,
        code,
        name,
        status
      `)
      .eq("id", categoryId)
      .maybeSingle();

  if (error) {
    throw new Error(
      `Error consultando categoría: ${error.message}`,
    );
  }

  return data;
}

async function getGroupDependencies(
  groupId: string,
  categoryCode: string,
  groupCode: string,
) {
  const [
    subgroupsResult,
    templatesResult,
    productsResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("item_subgroups")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("group_id", groupId),

    supabaseAdmin
      .from("item_classification_templates")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("category_code", categoryCode)
      .eq("group_code", groupCode),

    supabaseAdmin
      .from("products")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("group_id", groupId),
  ]);

  const results = [
    subgroupsResult,
    templatesResult,
    productsResult,
  ];

  const failed =
    results.find((result) => result.error);

  if (failed?.error) {
    throw new Error(
      `No se pudieron validar las dependencias del grupo: ${failed.error.message}`,
    );
  }

  const subgroups =
    subgroupsResult.count ?? 0;

  const templates =
    templatesResult.count ?? 0;

  const products =
    productsResult.count ?? 0;

  return {
    subgroups,
    templates,
    products,
    total:
      subgroups +
      templates +
      products,
  };
}

// =========================================================
// GET · Consultar grupos
// =========================================================

export async function GET(request: Request) {
  try {
    await requireSystemPermission(
      request,
      REQUIRED_PERMISSION,
    );

    const [
      groupsResult,
      categoriesResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("item_groups")
        .select(`
          id,
          category_id,
          code,
          name,
          status,
          created_at,
          category:item_categories (
            id,
            code,
            name,
            status
          )
        `)
        .order("code"),

      supabaseAdmin
        .from("item_categories")
        .select(`
          id,
          code,
          name,
          status
        `)
        .order("code"),
    ]);

    if (groupsResult.error) {
      throw new Error(
        `Error consultando grupos: ${groupsResult.error.message}`,
      );
    }

    if (categoriesResult.error) {
      throw new Error(
        `Error consultando categorías: ${categoriesResult.error.message}`,
      );
    }

    const enriched =
      await Promise.all(
        (groupsResult.data ?? []).map(
          async (group) => {
            const categoryRelation =
              Array.isArray(group.category)
                ? group.category[0]
                : group.category;

            if (!categoryRelation) {
              throw new Error(
                `El grupo ${group.code} no tiene una categoría válida relacionada.`,
              );
            }

            const dependencies =
              await getGroupDependencies(
                group.id,
                categoryRelation.code,
                group.code,
              );

            return {
              ...group,
              category: categoryRelation,
              dependencies,
              structure_locked:
                dependencies.total > 0,
            };
          },
        ),
      );

    return NextResponse.json({
      data: enriched,
      categories:
        categoriesResult.data ?? [],
    });
  } catch (error) {
    return handleError(error);
  }
}

// =========================================================
// POST · Crear grupo
// =========================================================

export async function POST(request: Request) {
  try {
    const systemUser =
      await requireSystemPermission(
        request,
        REQUIRED_PERMISSION,
      );

    const body = await request.json();

    const categoryId =
      String(body.category_id ?? "").trim();

    const code =
      normalizeCode(body.code);

    const name =
      normalizeName(body.name);

    if (!categoryId) {
      return NextResponse.json(
        {
          error:
            "La categoría es obligatoria.",
        },
        { status: 400 },
      );
    }

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

    const category =
      await getCategory(categoryId);

    if (!category) {
      return NextResponse.json(
        {
          error:
            "La categoría seleccionada no existe.",
        },
        { status: 404 },
      );
    }

    if (category.status !== "Activo") {
      return NextResponse.json(
        {
          error:
            "No puedes crear un grupo dentro de una categoría inactiva.",
        },
        { status: 409 },
      );
    }

    const {
      data: existing,
      error: existingError,
    } = await supabaseAdmin
      .from("item_groups")
      .select("id")
      .eq("category_id", categoryId)
      .eq("code", code)
      .maybeSingle();

    if (existingError) {
      throw new Error(
        `Error validando grupo: ${existingError.message}`,
      );
    }

    if (existing) {
      return NextResponse.json(
        {
          error:
            `Ya existe un grupo con el código ${code} dentro de ${category.code}.`,
        },
        { status: 409 },
      );
    }

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("item_groups")
      .insert({
        category_id: categoryId,
        code,
        name,
        status: "Activo",
      })
      .select(`
        id,
        category_id,
        code,
        name,
        status,
        created_at
      `)
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          {
            error:
              "Ya existe un grupo con ese código dentro de la categoría seleccionada.",
          },
          { status: 409 },
        );
      }

      throw new Error(
        `Error creando grupo: ${error.message}`,
      );
    }

    console.info(
      `Grupo de codificación creado por ${systemUser.email}: ${category.code}-${code} · ${name}`,
    );

    return NextResponse.json(
      {
        data: {
          ...data,
          category,
          dependencies: {
            subgroups: 0,
            templates: 0,
            products: 0,
            total: 0,
          },
          structure_locked: false,
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
      .from("item_groups")
      .select(`
        id,
        category_id,
        code,
        name,
        status
      `)
      .eq("id", id)
      .maybeSingle();

    if (currentError) {
      throw new Error(
        `Error consultando grupo: ${currentError.message}`,
      );
    }

    if (!current) {
      return NextResponse.json(
        {
          error:
            "El grupo no existe.",
        },
        { status: 404 },
      );
    }

    const currentCategory =
      await getCategory(
        current.category_id,
      );

    if (!currentCategory) {
      throw new Error(
        "El grupo actual no tiene una categoría válida.",
      );
    }

    const dependencies =
      await getGroupDependencies(
        current.id,
        currentCategory.code,
        current.code,
      );

    const updates:
      Record<string, unknown> = {};

    let targetCategoryId =
      current.category_id;

    let targetCode =
      current.code;

    // -----------------------------------------------------
    // Categoría padre
    // -----------------------------------------------------

    if (body.category_id !== undefined) {
      const categoryId =
        String(body.category_id).trim();

      if (!categoryId) {
        return NextResponse.json(
          {
            error:
              "La categoría no puede quedar vacía.",
          },
          { status: 400 },
        );
      }

      if (
        categoryId !==
        current.category_id
      ) {
        if (dependencies.total > 0) {
          return NextResponse.json(
            {
              error:
                "La categoría padre no puede modificarse porque el grupo ya tiene información relacionada.",
              dependencies,
            },
            { status: 409 },
          );
        }

        const category =
          await getCategory(categoryId);

        if (!category) {
          return NextResponse.json(
            {
              error:
                "La categoría seleccionada no existe.",
            },
            { status: 404 },
          );
        }

        if (category.status !== "Activo") {
          return NextResponse.json(
            {
              error:
                "No puedes mover el grupo a una categoría inactiva.",
            },
            { status: 409 },
          );
        }

        targetCategoryId =
          categoryId;

        updates.category_id =
          categoryId;
      }
    }

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
        if (dependencies.total > 0) {
          return NextResponse.json(
            {
              error:
                "El código técnico no puede modificarse porque el grupo ya tiene información relacionada.",
              dependencies,
            },
            { status: 409 },
          );
        }

        targetCode =
          code;

        updates.code =
          code;
      }
    }

    // -----------------------------------------------------
    // Evitar duplicado en la combinación final
    // -----------------------------------------------------

    if (
      targetCategoryId !==
        current.category_id ||
      targetCode !==
        current.code
    ) {
      const {
        data: duplicate,
        error: duplicateError,
      } = await supabaseAdmin
        .from("item_groups")
        .select("id")
        .eq(
          "category_id",
          targetCategoryId,
        )
        .eq("code", targetCode)
        .neq("id", id)
        .maybeSingle();

      if (duplicateError) {
        throw new Error(
          `Error validando grupo: ${duplicateError.message}`,
        );
      }

      if (duplicate) {
        return NextResponse.json(
          {
            error:
              "Ya existe otro grupo con ese código dentro de la categoría seleccionada.",
          },
          { status: 409 },
        );
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
      .from("item_groups")
      .update(updates)
      .eq("id", id)
      .select(`
        id,
        category_id,
        code,
        name,
        status,
        created_at
      `)
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          {
            error:
              "Ya existe otro grupo con ese código dentro de la categoría seleccionada.",
          },
          { status: 409 },
        );
      }

      throw new Error(
        `Error actualizando grupo: ${error.message}`,
      );
    }

    const finalCategory =
      await getCategory(
        data.category_id,
      );

    if (!finalCategory) {
      throw new Error(
        "El grupo actualizado no tiene una categoría válida.",
      );
    }

    const finalDependencies =
      await getGroupDependencies(
        data.id,
        finalCategory.code,
        data.code,
      );

    console.info(
      `Grupo de codificación actualizado por ${systemUser.email}: ${finalCategory.code}-${data.code}`,
    );

    return NextResponse.json({
      data: {
        ...data,
        category: finalCategory,
        dependencies:
          finalDependencies,
        structure_locked:
          finalDependencies.total > 0,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
