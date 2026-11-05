import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
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
      "CODIFICACION_REQUEST",
    );

    const {
      data: categories,
      error: categoriesError,
    } = await supabaseAdmin
      .from("item_categories")
      .select(`
        id,
        code,
        name
      `)
      .eq("status", "Activo")
      .order("code");

    if (categoriesError) {
      throw new Error(
        `No se pudieron consultar las clasificaciones: ${categoriesError.message}`,
      );
    }

    const {
      data: templates,
      error: templatesError,
    } = await supabaseAdmin
      .from("item_classification_templates")
      .select("category_code")
      .eq("status", "Activo");

    if (templatesError) {
      throw new Error(
        `No se pudieron validar las plantillas de codificación: ${templatesError.message}`,
      );
    }

    const enabledCodes = new Set(
      (templates ?? []).map(
        (template) => template.category_code,
      ),
    );

    const availableCategories =
      (categories ?? []).filter(
        (category) =>
          enabledCodes.has(category.code),
      );

    return NextResponse.json({
      categories: availableCategories,
    });
  } catch (error) {
    return handleError(error);
  }
}
