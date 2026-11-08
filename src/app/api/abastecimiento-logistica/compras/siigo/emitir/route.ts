import { NextResponse } from "next/server";

import {
  supabaseAdmin,
} from "@/lib/supabaseAdmin";

import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

import {
  emitPurchaseOrderToSiigo,
  SiigoIntegrationNotConfiguredError,
} from "@/lib/integrations/siigo/purchaseOrders";

export const runtime = "nodejs";

function handleError(
  error: unknown,
) {
  console.error(
    "API Compras · Emitir SIIGO:",
    error,
  );

  if (
    error instanceof
    ApiAuthorizationError
  ) {
    return NextResponse.json(
      {
        error:
          error.message,
      },
      {
        status:
          error.status,
      },
    );
  }

  if (
    error instanceof
    SiigoIntegrationNotConfiguredError
  ) {
    return NextResponse.json(
      {
        error:
          error.message,

        code:
          "SIIGO_NOT_CONFIGURED",
      },
      {
        status: 503,
      },
    );
  }

  return NextResponse.json(
    {
      error:
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado.",
    },
    {
      status: 500,
    },
  );
}

export async function POST(
  request: Request,
) {
  try {
    await requireSystemPermission(
      request,
      "ABASTECIMIENTO_COMPRAS_MANAGE",
    );

    const body =
      await request.json();

    const purchaseOrderId =
      String(
        body?.purchase_order_id ??
          "",
      ).trim();

    if (!purchaseOrderId) {
      return NextResponse.json(
        {
          error:
            "Debes indicar la solicitud de compra.",
        },
        {
          status: 400,
        },
      );
    }

    const {
      data: order,
      error: orderError,
    } = await supabaseAdmin
      .from(
        "purchase_orders",
      )
      .select(`
        id,
        clap_request_number,
        siigo_order_number,
        siigo_document_id,
        siigo_sync_status
      `)
      .eq(
        "id",
        purchaseOrderId,
      )
      .maybeSingle();

    if (orderError) {
      throw new Error(
        `No se pudo consultar la solicitud: ${orderError.message}`,
      );
    }

    if (!order) {
      return NextResponse.json(
        {
          error:
            "La solicitud de compra no existe.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      order.siigo_order_number ||
      order.siigo_document_id
    ) {
      return NextResponse.json(
        {
          error:
            `La solicitud ${order.clap_request_number ?? ""} ya fue emitida en SIIGO.`,
        },
        {
          status: 409,
        },
      );
    }

    /*
     * Este método será responsable de:
     *
     * proveedor
     *    ↓
     * productos
     *    ↓
     * OC SIIGO
     *
     * Todo automáticamente.
     */
    const emission =
      await emitPurchaseOrderToSiigo(
        purchaseOrderId,
      );

    if (
      !emission.siigo_document_id ||
      !emission.siigo_order_number
    ) {
      throw new Error(
        "SIIGO no devolvió los identificadores de la orden de compra.",
      );
    }

    const now =
      new Date().toISOString();

    const {
      data: updatedOrder,
      error: updateError,
    } = await supabaseAdmin
      .from(
        "purchase_orders",
      )
      .update({
        siigo_document_id:
          emission.siigo_document_id,

        siigo_order_number:
          emission.siigo_order_number,

        siigo_sync_status:
          "Sincronizada",

        siigo_sync_error:
          null,

        siigo_last_sync_at:
          now,

        siigo_payload:
          emission.raw_response ??
          null,
      })
      .eq(
        "id",
        purchaseOrderId,
      )
      .select(`
        id,
        clap_request_number,
        siigo_order_number,
        siigo_document_id,
        siigo_sync_status,
        siigo_last_sync_at
      `)
      .single();

    if (updateError) {
      throw new Error(
        `SIIGO creó la OC, pero CLAP no pudo guardar la respuesta: ${updateError.message}`,
      );
    }

    return NextResponse.json({
      data:
        updatedOrder,
    });
  } catch (error) {
    return handleError(
      error,
    );
  }
}
