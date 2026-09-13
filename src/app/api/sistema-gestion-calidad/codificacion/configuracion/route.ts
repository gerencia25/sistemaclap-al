import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

export const runtime = "nodejs";

function handleError(error: unknown) {
  console.error(
    "API Configuración de Codificación:",
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

export async function GET(request: Request) {
  try {
    await requireSystemPermission(
      request,
      "CODIFICACION_CREATE_PRODUCT",
    );

    const [
      categoriesResult,
      groupsResult,
      subgroupsResult,
      templatesResult,
      templateFieldsResult,
      optionsResult,
      masterFieldsResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("item_categories")
        .select("id, code, name")
        .eq("status", "Activo")
        .order("code"),

      supabaseAdmin
        .from("item_groups")
        .select(
          "id, category_id, code, name",
        )
        .eq("status", "Activo")
        .order("code"),

      supabaseAdmin
        .from("item_subgroups")
        .select(
          "id, group_id, code, name",
        )
        .eq("status", "Activo")
        .order("code"),

      supabaseAdmin
        .from(
          "item_classification_templates",
        )
        .select(`
          id,
          category_code,
          group_code,
          subgroup_code,
          numeric_code_length
        `)
        .eq("status", "Activo"),

      supabaseAdmin
        .from(
          "item_classification_template_fields",
        )
        .select(`
          id,
          template_id,
          field_key,
          field_label,
          field_type,
          required,
          display_order,
          code_length,
          contributes_to_code,
          contributes_to_name
        `)
        .eq("status", "Activo")
        .order("display_order"),

      supabaseAdmin
        .from(
          "item_classification_field_options",
        )
        .select(`
          id,
          template_id,
          field_key,
          code,
          name
        `)
        .eq("status", "Activo")
        .order("code"),

      supabaseAdmin
        .from("item_master_fields")
        .select(`
          id,
          category_code,
          field_key,
          field_label,
          field_type,
          required,
          display_order,
          options
        `)
        .eq("status", "Activo")
        .order("display_order"),
    ]);

    const results = [
      categoriesResult,
      groupsResult,
      subgroupsResult,
      templatesResult,
      templateFieldsResult,
      optionsResult,
      masterFieldsResult,
    ];

    const failedResult =
      results.find((result) => result.error);

    if (failedResult?.error) {
      throw new Error(
        failedResult.error.message,
      );
    }

    /*
     * Solo exponemos categorías que tengan al menos
     * una plantilla activa de codificación.
     */
    const activeCategoryCodes = new Set(
      (templatesResult.data ?? []).map(
        (template) =>
          template.category_code,
      ),
    );

    const categories =
      (categoriesResult.data ?? []).filter(
        (category) =>
          activeCategoryCodes.has(
            category.code,
          ),
      );

    return NextResponse.json({
      categories,
      groups: groupsResult.data ?? [],
      subgroups:
        subgroupsResult.data ?? [],
      templates:
        templatesResult.data ?? [],
      template_fields:
        templateFieldsResult.data ?? [],
      options:
        optionsResult.data ?? [],
      master_fields:
        masterFieldsResult.data ?? [],
    });
  } catch (error) {
    return handleError(error);
  }
}
