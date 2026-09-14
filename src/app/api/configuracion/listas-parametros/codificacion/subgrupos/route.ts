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
    "API Configuración Codificación · Subgrupos:",
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

async function getGroup(groupId: string) {
  const { data, error } =
    await supabaseAdmin
      .from("item_groups")
      .select(`
        id,
        category_id,
        code,
        name,
        status,
        category:item_categories (
          id,
          code,
          name,
          status
        )
      `)
      .eq("id", groupId)
      .maybeSingle();

  if (error) {
    throw new Error(
      `Error consultando grupo: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  const category =
    Array.isArray(data.category)
      ? data.category[0]
      : data.category;

  if (!category) {
    throw new Error(
      `El grupo ${data.code} no tiene una categoría válida relacionada.`,
    );
  }

  return {
    ...data,
    category,
  };
}

async function getSubgroupDependencies(
  subgroupId: string,
  categoryCode: string,
  groupCode: string,
  subgroupCode: string,
) {
  const [
    templatesResult,
    productsResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("item_classification_templates")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("category_code", categoryCode)
      .eq("group_code", groupCode)
      .eq("subgroup_code", subgroupCode),

    supabaseAdmin
      .from("products")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("subgroup_id", subgroupId),
  ]);

  const failed =
    [templatesResult, productsResult].find(
      (result) => result.error,
    );

  if (failed?.error) {
    throw new Error(
      `No se pudieron validar las dependencias del subgrupo: ${failed.error.message}`,
    );
  }

  const templates =
    templatesResult.count ?? 0;

  const products =
    productsResult.count ?? 0;

  return {
    templates,
    products,
    total: templates + products,
  };
}

// =========================================================
// GET · Consultar subgrupos
// =========================================================

export async function GET(request: Request) {
  try {
    await requireSystemPermission(
      request,
      REQUIRED_PERMISSION,
    );

    const [
      subgroupsResult,
      groupsResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("item_subgroups")
        .select(`
          id,
          group_id,
          code,
          name,
          status,
          created_at,
          group:item_groups (
            id,
            category_id,
            code,
            name,
            status,
            category:item_categories (
              id,
              code,
              name,
              status
            )
          )
        `)
        .order("code"),

      supabaseAdmin
        .from("item_groups")
        .select(`
          id,
          category_id,
          code,
          name,
          status,
          category:item_categories (
            id,
            code,
            name,
            status
          )
        `)
        .order("code"),
    ]);

    if (subgroupsResult.error) {
      throw new Error(
        `Error consultando subgrupos: ${subgroupsResult.error.message}`,
      );
    }

    if (groupsResult.error) {
      throw new Error(
        `Error consultando grupos: ${groupsResult.error.message}`,
      );
    }

    const groups =
      (groupsResult.data ?? []).map((group) => {
        const category =
          Array.isArray(group.category)
            ? group.category[0]
            : group.category;

        return {
          ...group,
          category,
        };
      });

    const enriched =
      await Promise.all(
        (subgroupsResult.data ?? []).map(
          async (subgroup) => {
            const groupRelation =
              Array.isArray(subgroup.group)
                ? subgroup.group[0]
                : subgroup.group;

            if (!groupRelation) {
              throw new Error(
                `El subgrupo ${subgroup.code} no tiene un grupo válido relacionado.`,
              );
            }

            const categoryRelation =
              Array.isArray(groupRelation.category)
                ? groupRelation.category[0]
                : groupRelation.category;

            if (!categoryRelation) {
              throw new Error(
                `El grupo ${groupRelation.code} no tiene una categoría válida relacionada.`,
              );
            }

            const dependencies =
              await getSubgroupDependencies(
                subgroup.id,
                categoryRelation.code,
                groupRelation.code,
                subgroup.code,
              );

            return {
              ...subgroup,
              group: {
                ...groupRelation,
                category: categoryRelation,
              },
              dependencies,
              structure_locked:
                dependencies.total > 0,
            };
          },
        ),
      );

    const sortedSubgroups = [...enriched].sort((a, b) => {
  const categoryComparison =
    a.group.category.name.localeCompare(
      b.group.category.name,
      "es",
      { sensitivity: "base" },
    );

  if (categoryComparison !== 0) {
    return categoryComparison;
  }

  const groupComparison =
    a.group.name.localeCompare(
      b.group.name,
      "es",
      { sensitivity: "base" },
    );

  if (groupComparison !== 0) {
    return groupComparison;
  }

  return a.name.localeCompare(
    b.name,
    "es",
    { sensitivity: "base" },
  );
});

return NextResponse.json({
  data: sortedSubgroups,
  groups,
});
  } catch (error) {
    return handleError(error);
  }
}

// =========================================================
// POST · Crear subgrupo
// =========================================================

export async function POST(request: Request) {
  try {
    const systemUser =
      await requireSystemPermission(
        request,
        REQUIRED_PERMISSION,
      );

    const body = await request.json();

    const groupId =
      String(body.group_id ?? "").trim();

    const code =
      normalizeCode(body.code);

    const name =
      normalizeName(body.name);

    if (!groupId) {
      return NextResponse.json(
        { error: "El grupo es obligatorio." },
        { status: 400 },
      );
    }

    if (!code) {
      return NextResponse.json(
        { error: "El código es obligatorio." },
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
        { error: "El nombre es obligatorio." },
        { status: 400 },
      );
    }

    const group =
      await getGroup(groupId);

    if (!group) {
      return NextResponse.json(
        {
          error:
            "El grupo seleccionado no existe.",
        },
        { status: 404 },
      );
    }

    if (group.status !== "Activo") {
      return NextResponse.json(
        {
          error:
            "No puedes crear un subgrupo dentro de un grupo inactivo.",
        },
        { status: 409 },
      );
    }

    if (group.category.status !== "Activo") {
      return NextResponse.json(
        {
          error:
            "No puedes crear un subgrupo porque la categoría del grupo está inactiva.",
        },
        { status: 409 },
      );
    }

    const {
      data: existing,
      error: existingError,
    } = await supabaseAdmin
      .from("item_subgroups")
      .select("id")
      .eq("group_id", groupId)
      .eq("code", code)
      .maybeSingle();

    if (existingError) {
      throw new Error(
        `Error validando subgrupo: ${existingError.message}`,
      );
    }

    if (existing) {
      return NextResponse.json(
        {
          error:
            `Ya existe un subgrupo con el código ${code} dentro del grupo ${group.code}.`,
        },
        { status: 409 },
      );
    }

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("item_subgroups")
      .insert({
        group_id: groupId,
        code,
        name,
        status: "Activo",
      })
      .select(`
        id,
        group_id,
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
              "Ya existe un subgrupo con ese código dentro del grupo seleccionado.",
          },
          { status: 409 },
        );
      }

      throw new Error(
        `Error creando subgrupo: ${error.message}`,
      );
    }

    console.info(
      `Subgrupo de codificación creado por ${systemUser.email}: ${group.category.code}-${group.code}-${code} · ${name}`,
    );

    return NextResponse.json(
      {
        data: {
          ...data,
          group,
          dependencies: {
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
        { error: "El ID es obligatorio." },
        { status: 400 },
      );
    }

    const {
      data: current,
      error: currentError,
    } = await supabaseAdmin
      .from("item_subgroups")
      .select(`
        id,
        group_id,
        code,
        name,
        status
      `)
      .eq("id", id)
      .maybeSingle();

    if (currentError) {
      throw new Error(
        `Error consultando subgrupo: ${currentError.message}`,
      );
    }

    if (!current) {
      return NextResponse.json(
        { error: "El subgrupo no existe." },
        { status: 404 },
      );
    }

    const currentGroup =
      await getGroup(current.group_id);

    if (!currentGroup) {
      throw new Error(
        "El subgrupo actual no tiene un grupo válido.",
      );
    }

    const dependencies =
      await getSubgroupDependencies(
        current.id,
        currentGroup.category.code,
        currentGroup.code,
        current.code,
      );

    const updates:
      Record<string, unknown> = {};

    let targetGroupId =
      current.group_id;

    let targetCode =
      current.code;

    // -----------------------------------------------------
    // Grupo padre
    // -----------------------------------------------------

    if (body.group_id !== undefined) {
      const groupId =
        String(body.group_id).trim();

      if (!groupId) {
        return NextResponse.json(
          {
            error:
              "El grupo no puede quedar vacío.",
          },
          { status: 400 },
        );
      }

      if (groupId !== current.group_id) {
        if (dependencies.total > 0) {
          return NextResponse.json(
            {
              error:
                "El grupo padre no puede modificarse porque el subgrupo ya tiene información relacionada.",
              dependencies,
            },
            { status: 409 },
          );
        }

        const group =
          await getGroup(groupId);

        if (!group) {
          return NextResponse.json(
            {
              error:
                "El grupo seleccionado no existe.",
            },
            { status: 404 },
          );
        }

        if (group.status !== "Activo") {
          return NextResponse.json(
            {
              error:
                "No puedes mover el subgrupo a un grupo inactivo.",
            },
            { status: 409 },
          );
        }

        if (group.category.status !== "Activo") {
          return NextResponse.json(
            {
              error:
                "No puedes mover el subgrupo porque la categoría del grupo está inactiva.",
            },
            { status: 409 },
          );
        }

        targetGroupId =
          groupId;

        updates.group_id =
          groupId;
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
                "El código técnico no puede modificarse porque el subgrupo ya tiene información relacionada.",
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
    // Evitar duplicado final
    // -----------------------------------------------------

    if (
      targetGroupId !== current.group_id ||
      targetCode !== current.code
    ) {
      const {
        data: duplicate,
        error: duplicateError,
      } = await supabaseAdmin
        .from("item_subgroups")
        .select("id")
        .eq("group_id", targetGroupId)
        .eq("code", targetCode)
        .neq("id", id)
        .maybeSingle();

      if (duplicateError) {
        throw new Error(
          `Error validando subgrupo: ${duplicateError.message}`,
        );
      }

      if (duplicate) {
        return NextResponse.json(
          {
            error:
              "Ya existe otro subgrupo con ese código dentro del grupo seleccionado.",
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
        !["Activo", "Inactivo"].includes(status)
      ) {
        return NextResponse.json(
          {
            error:
              "El estado debe ser Activo o Inactivo.",
          },
          { status: 400 },
        );
      }

      if (
        status === "Activo" &&
        current.status !== "Activo"
      ) {
        const group =
          await getGroup(targetGroupId);

        if (!group) {
          return NextResponse.json(
            {
              error:
                "El grupo relacionado no existe.",
            },
            { status: 404 },
          );
        }

        if (
          group.status !== "Activo" ||
          group.category.status !== "Activo"
        ) {
          return NextResponse.json(
            {
              error:
                "No puedes activar este subgrupo mientras su grupo o categoría estén inactivos.",
            },
            { status: 409 },
          );
        }
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
      .from("item_subgroups")
      .update(updates)
      .eq("id", id)
      .select(`
        id,
        group_id,
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
              "Ya existe otro subgrupo con ese código dentro del grupo seleccionado.",
          },
          { status: 409 },
        );
      }

      throw new Error(
        `Error actualizando subgrupo: ${error.message}`,
      );
    }

    const finalGroup =
      await getGroup(data.group_id);

    if (!finalGroup) {
      throw new Error(
        "El subgrupo actualizado no tiene un grupo válido.",
      );
    }

    const finalDependencies =
      await getSubgroupDependencies(
        data.id,
        finalGroup.category.code,
        finalGroup.code,
        data.code,
      );

    console.info(
      `Subgrupo de codificación actualizado por ${systemUser.email}: ${finalGroup.category.code}-${finalGroup.code}-${data.code}`,
    );

    return NextResponse.json({
      data: {
        ...data,
        group: finalGroup,
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
