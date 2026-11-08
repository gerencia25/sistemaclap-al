import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

export const runtime = "nodejs";

function handleError(error: unknown) {
  console.error(
    "API Abastecimiento · Compras · Detalle:",
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
      "ABASTECIMIENTO_VIEW",
    );

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Debes indicar la orden de compra.",
        },
        { status: 400 },
      );
    }

    const {
      data: order,
      error: orderError,
    } = await supabaseAdmin
      .from("purchase_orders")
      .select(`
        id,
        purchase_order_number,
        clap_request_number,
        siigo_order_number,
        siigo_document_id,
        siigo_sync_status,
        siigo_sync_error,
        siigo_last_sync_at,
        source_system,
        supplier_id,
        order_date,
        expected_delivery_date,
        observations,
        total,
        status,
        created_at
      `)
      .eq("id", id)
      .maybeSingle();

    if (orderError) {
      throw new Error(
        `No se pudo consultar la orden de compra: ${orderError.message}`,
      );
    }

    if (!order) {
      return NextResponse.json(
        {
          error:
            "La orden de compra no existe.",
        },
        { status: 404 },
      );
    }

    const [
      supplierResult,
      itemsResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("third_parties")
        .select(`
          id,
          business_name,
          commercial_name,
          first_name,
          last_name,
          identification_number,
          email,
          phone,
          supplier_knowledge_status,
          status
        `)
        .eq("id", order.supplier_id)
        .maybeSingle(),

      supabaseAdmin
        .from("purchase_order_items")
        .select(`
          id,
          purchase_order_id,
          item_id,
          quantity_ordered,
          quantity_received,
          unit_price,
          total,
          products:item_id (
            id,
            final_code,
            reference,
            name,
            unit,
            item_type
          )
        `)
        .eq(
          "purchase_order_id",
          order.id,
        )
        .order(
          "created_at",
          {
            ascending: true,
          },
        ),
    ]);

    if (supplierResult.error) {
      throw new Error(
        `No se pudo consultar el proveedor: ${supplierResult.error.message}`,
      );
    }

    if (itemsResult.error) {
      throw new Error(
        `No se pudieron consultar los ítems: ${itemsResult.error.message}`,
      );
    }

    return NextResponse.json({
      order,
      supplier:
        supplierResult.data ?? null,
      items:
        itemsResult.data ?? [],
    });
  } catch (error) {
    return handleError(error);
  }
}
