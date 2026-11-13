import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

export const runtime = "nodejs";

function handleError(error: unknown) {
  console.error(
    "API SC Codificación · Opciones:",
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

export async function POST(request: Request) {
  try {
    const systemUser =
      await requireSystemPermission(
        request,
        "CODIFICACION_CREATE_PRODUCT",
      );

    const body = await request.json();

    const templateId =
      String(body.template_id ?? "").trim();

    const fieldKey =
      String(body.field_key ?? "")
        .trim()
        .toLowerCase();

    const name =
      String(body.name ?? "").trim();

    if (!templateId) {
      return NextResponse.json(
        {
          error:
            "La plantilla es obligatoria.",
        },
        { status: 400 },
      );
    }

    if (!fieldKey) {
      return NextResponse.json(
        {
          error:
            "El campo es obligatorio.",
        },
        { status: 400 },
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          error:
            "El nombre de la nueva opción es obligatorio.",
        },
        { status: 400 },
      );
    }

    const {
      data: field,
      error: fieldError,
    } = await supabaseAdmin
      .from(
        "item_classification_template_fields",
      )
      .select(`
        id,
        template_id,
        field_key,
        field_label,
        field_type,
        code_length,
        allow_new_options,
        option_catalog_id,
        status
      `)
      .eq("template_id", templateId)
      .eq("field_key", fieldKey)
      .maybeSingle();

    if (fieldError) {
      throw new Error(
        `No se pudo validar el campo: ${fieldError.message}`,
      );
    }

    if (!field) {
      return NextResponse.json(
        {
          error:
            "El campo no pertenece a la plantilla seleccionada.",
        },
        { status: 404 },
      );
    }

    if (field.status !== "Activo") {
      return NextResponse.json(
        {
          error:
            `El campo "${field.field_label}" está inactivo.`,
        },
        { status: 400 },
      );
    }

    if (field.field_type !== "select") {
      return NextResponse.json(
        {
          error:
            "Solo los campos de lista pueden crear opciones.",
        },
        { status: 400 },
      );
    }

    if (!field.allow_new_options) {
      return NextResponse.json(
        {
          error:
            `El campo "${field.field_label}" no permite crear nuevas opciones.`,
        },
        { status: 403 },
      );
    }

    // =====================================================
    // CATÁLOGO TRANSVERSAL
    // =====================================================

    if (field.option_catalog_id) {
      const {
        data: sharedOption,
        error: sharedError,
      } = await supabaseAdmin.rpc(
        "config_create_shared_catalog_option",
        {
          p_catalog_id:
            field.option_catalog_id,
          p_name: name,
          p_code_length:
            field.code_length,
        },
      );

      if (sharedError) {
        const message =
          sharedError.message ??
          "No se pudo crear la opción.";

        return NextResponse.json(
          { error: message },
          {
            status: message
              .toLowerCase()
              .includes("ya existe")
              ? 409
              : 400,
          },
        );
      }

      const code =
        String(sharedOption?.code ?? "");

      const {
        data: mirrored,
        error: mirrorError,
      } = await supabaseAdmin
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
        .eq(
          "template_id",
          templateId,
        )
        .eq(
          "field_key",
          fieldKey,
        )
        .eq("code", code)
        .single();

      if (mirrorError) {
        throw new Error(
          `La opción se creó, pero no se pudo consultar su espejo: ${mirrorError.message}`,
        );
      }

      console.info(
        `Opción transversal creada desde SC por ${systemUser.email}: ${field.field_label} · ${mirrored.code} · ${mirrored.name}`,
      );

      return NextResponse.json(
        {
          data: mirrored,
          scope: "Transversal",
        },
        { status: 201 },
      );
    }

    // =====================================================
    // OPCIÓN PROPIA DE LA PLANTILLA
    // =====================================================

    const {
      data,
      error,
    } = await supabaseAdmin.rpc(
      "config_create_classification_option",
      {
        p_template_id: templateId,
        p_field_key: fieldKey,
        p_name: name,
      },
    );

    if (error) {
      const message =
        error.message ??
        "No se pudo crear la opción.";

      return NextResponse.json(
        { error: message },
        {
          status: message
            .toLowerCase()
            .includes("ya existe")
            ? 409
            : 400,
        },
      );
    }

    console.info(
      `Opción de clasificación creada desde SC por ${systemUser.email}: ${field.field_label} · ${data?.code ?? ""} · ${data?.name ?? name}`,
    );

    return NextResponse.json(
      {
        data,
        scope: "Plantilla",
      },
      { status: 201 },
    );
  } catch (error) {
    return handleError(error);
  }
}
