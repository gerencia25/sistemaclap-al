import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";
import {
  syncProductToSiigo,
} from "@/lib/integrations/siigo/products";

export const runtime = "nodejs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    await requireSystemPermission(
      request,
      "CODIFICACION_RETRY_SIIGO",
    );

    const body = await request.json().catch(() => null);

    const requestId =
      typeof body?.request_id === "string"
        ? body.request_id.trim()
        : "";

    if (!UUID_PATTERN.test(requestId)) {
      return NextResponse.json(
        { error: "La solicitud no es válida." },
        { status: 400 },
      );
    }

    const {
      data: codeRequest,
      error: requestError,
    } = await supabaseAdmin
      .from("item_code_requests")
      .select(
        "id, request_type, status, created_product_id",
      )
      .eq("id", requestId)
      .maybeSingle();

    if (requestError) throw requestError;

    if (
      !codeRequest ||
      codeRequest.request_type !== "Creación" ||
      codeRequest.status !== "Creado" ||
      !codeRequest.created_product_id
    ) {
      return NextResponse.json(
        {
          error:
            "La solicitud no tiene un producto creado válido para sincronizar.",
        },
        { status: 409 },
      );
    }

    const productId = codeRequest.created_product_id;

    const {
      data: product,
      error: productError,
    } = await supabaseAdmin
      .from("products")
      .select(
        "id, final_code, siigo_product_id, siigo_sync_status, siigo_sync_enabled",
      )
      .eq("id", productId)
      .maybeSingle();

    if (productError) throw productError;

    if (!product || !product.final_code) {
      return NextResponse.json(
        { error: "El producto de CLAP no existe." },
        { status: 404 },
      );
    }

    if (product.siigo_sync_enabled !== true) {
      return NextResponse.json(
        {
          error:
            "La sincronización de este producto está deshabilitada.",
        },
        { status: 409 },
      );
    }

    if (product.siigo_product_id) {
      return NextResponse.json(
        {
          error:
            "El producto ya tiene un identificador SIIGO. No se realizará otra creación.",
        },
        { status: 409 },
      );
    }

    if (
      !["Error", "Pendiente"].includes(
        product.siigo_sync_status ?? "",
      )
    ) {
      return NextResponse.json(
        {
          error:
            "El producto no está pendiente de sincronización o ya tiene un intento en proceso.",
        },
        { status: 409 },
      );
    }

    // La función compartida realiza la reserva.
    // También protege la creación inicial.
    const result = await syncProductToSiigo(productId);

    if (!result.ok) {
      return NextResponse.json({
        success: false,
        siigo_sync: {
          status:
            result.action === "review_required"
              ? "review_required"
              : "error",
          message: result.error,
        },
      });
    }

    return NextResponse.json({
      success: true,
      siigo_sync: {
        status: "synchronized",
        action: result.action,
        siigo_product_id: result.siigoProductId,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error inesperado al sincronizar con SIIGO.";

    console.error(
      "Error en reintento de sincronización SIIGO:",
      message,
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
          "No se pudo completar el reintento de sincronización.",
      },
      { status: 500 },
    );
  }
}
