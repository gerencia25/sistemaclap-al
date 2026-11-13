import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  fetchAllActiveClassificationOptions,
  fetchAllActiveOptionCatalogValues,
} from "@/lib/server/codificationOptionPagination";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

export const runtime = "nodejs";

function handleError(error: unknown) {
  console.error(
    "API Clasificaciones para solicitud de código:",
    error,
  );

  if (error instanceof ApiAuthorizationError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  return NextResponse.json(
    {
      error:
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado.",
    },
    { status: 500 },
  );
}

export async function GET(request: Request) {
  try {
    await requireSystemPermission(
      request,
      "CODIFICACION_REQUEST",
    );

    const [
      categoriesResult,
      groupsResult,
      subgroupsResult,
      templatesResult,
      fieldsResult,
      optionsResult,
      catalogsResult,
      catalogValuesResult,
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
          full_code,
          name,
          code_pattern,
          name_pattern,
          numeric_code_length
        `)
        .eq("status", "Activo")
        .order("full_code"),

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
          contributes_to_name,
          allow_new_options,
          option_catalog_id
        `)
        .eq("status", "Activo")
        .order("display_order"),

            fetchAllActiveClassificationOptions(),

      supabaseAdmin
        .from("item_option_catalogs")
        .select(`
          id,
          code,
          name
        `)
        .eq("status", "Activo")
        .order("name"),

            fetchAllActiveOptionCatalogValues(),
    ]);

    const results = [
      categoriesResult,
      groupsResult,
      subgroupsResult,
      templatesResult,
      fieldsResult,
      optionsResult,
      catalogsResult,
      catalogValuesResult,
    ];

    const failed =
      results.find(
        (result) => result.error,
      );

    if (failed?.error) {
      throw new Error(
        failed.error.message,
      );
    }

    const enabledCategoryCodes =
      new Set(
        (templatesResult.data ?? []).map(
          (template) =>
            template.category_code,
        ),
      );

    const categories =
      (categoriesResult.data ?? []).filter(
        (category) =>
          enabledCategoryCodes.has(
            category.code,
          ),
      );

    return NextResponse.json({
      categories,
      groups:
        groupsResult.data ?? [],
      subgroups:
        subgroupsResult.data ?? [],
      templates:
        templatesResult.data ?? [],
      template_fields:
        fieldsResult.data ?? [],
      options:
        optionsResult.data ?? [],
      option_catalogs:
        catalogsResult.data ?? [],
      option_catalog_values:
        catalogValuesResult.data ?? [],
    });
  } catch (error) {
    return handleError(error);
  }
}
