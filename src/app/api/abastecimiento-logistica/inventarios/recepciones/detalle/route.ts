import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

export const runtime = "nodejs";

function getThirdPartyName(
  thirdParty: {
    business_name: string | null;
    commercial_name: string | null;
    first_name: string | null;
    last_name: string | null;
    identification_number: string | null;
  } | null,
) {
  if (!thirdParty) {
    return "Sin proveedor";
  }

  const naturalName = [
    thirdParty.first_name,
    thirdParty.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    thirdParty.business_name?.trim() ||
    thirdParty.commercial_name?.trim() ||
    naturalName ||
    thirdParty.identification_number ||
    "Proveedor"
  );
}

function handleError(error: unknown) {
  console.error(
    "API detalle recepción:",
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
      "ALMACEN_INVENTARIOS_VIEW",
    );

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          error:
            "No se indicó la recepción a consultar.",
        },
        { status: 400 },
      );
    }

    const {
      data: receipt,
      error: receiptError,
    } = await supabaseAdmin
      .from("purchase_receipts")
      .select(`
        id,
        receipt_number,
        purchase_order_id,
        supplier_id,
        receipt_date,
        supplier_invoice_number,
        supplier_remission_number,
        payment_due_date,
        payment_terms_days,
        observations,
        total,
        receipt_mode,
        authorization_reference,
        received_by,
        created_at
      `)
      .eq("id", id)
      .single();

    if (receiptError || !receipt) {
      throw new Error(
        receiptError?.message ||
          "La recepción no existe.",
      );
    }

    const {
      data: items,
      error: itemsError,
    } = await supabaseAdmin
      .from("purchase_receipt_items")
      .select(`
        id,
        item_id,
        warehouse_id,
        supplier_lot_number,
        internal_lot_id,
        quantity_received,
        quantity_ordered,
        quantity_difference,
        difference_reason,
        unit_price,
        total,
        created_at
      `)
      .eq(
        "purchase_receipt_id",
        receipt.id,
      )
      .order("created_at", {
        ascending: true,
      });

    if (itemsError) {
      throw new Error(
        `No se pudieron consultar los productos recibidos: ${itemsError.message}`,
      );
    }

    const itemRows = items ?? [];

    const productIds = [
      ...new Set(
        itemRows.map(
          (item) => item.item_id,
        ),
      ),
    ].filter(Boolean);

    const warehouseIds = [
      ...new Set(
        itemRows.map(
          (item) => item.warehouse_id,
        ),
      ),
    ].filter(Boolean);

    const lotIds = [
      ...new Set(
        itemRows
          .map(
            (item) =>
              item.internal_lot_id,
          )
          .filter(Boolean),
      ),
    ] as string[];

    const [
      supplierResult,
      orderResult,
      productsResult,
      warehousesResult,
      lotsResult,
    ] = await Promise.all([
      receipt.supplier_id
        ? supabaseAdmin
            .from("third_parties")
            .select(`
              id,
              business_name,
              commercial_name,
              first_name,
              last_name,
              identification_number
            `)
            .eq(
              "id",
              receipt.supplier_id,
            )
            .maybeSingle()
        : Promise.resolve({
            data: null,
            error: null,
          }),

      receipt.purchase_order_id
        ? supabaseAdmin
            .from("purchase_orders")
            .select(`
              id,
              purchase_order_number
            `)
            .eq(
              "id",
              receipt.purchase_order_id,
            )
            .maybeSingle()
        : Promise.resolve({
            data: null,
            error: null,
          }),

      productIds.length
        ? supabaseAdmin
            .from("products")
            .select(`
              id,
              final_code,
              reference,
              name,
              unit,
              category,
              classification_code
            `)
            .in("id", productIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),

      warehouseIds.length
        ? supabaseAdmin
            .from("warehouses")
            .select(`
              id,
              code,
              name
            `)
            .in(
              "id",
              warehouseIds,
            )
        : Promise.resolve({
            data: [],
            error: null,
          }),

      lotIds.length
        ? supabaseAdmin
            .from("inventory_lots")
            .select(`
              id,
              lot_number,
              expiration_date,
              origin_type,
              origin_reference,
              status
            `)
            .in("id", lotIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),
    ]);

    if (supplierResult.error) {
      throw new Error(
        supplierResult.error.message,
      );
    }

    if (orderResult.error) {
      throw new Error(
        orderResult.error.message,
      );
    }

    if (productsResult.error) {
      throw new Error(
        productsResult.error.message,
      );
    }

    if (warehousesResult.error) {
      throw new Error(
        warehousesResult.error.message,
      );
    }

    if (lotsResult.error) {
      throw new Error(
        lotsResult.error.message,
      );
    }

    const productsById = new Map(
      (productsResult.data ?? []).map(
        (product) => [
          product.id,
          product,
        ],
      ),
    );

    const warehousesById = new Map(
      (warehousesResult.data ?? []).map(
        (warehouse) => [
          warehouse.id,
          warehouse,
        ],
      ),
    );

    const lotsById = new Map(
      (lotsResult.data ?? []).map(
        (lot) => [
          lot.id,
          lot,
        ],
      ),
    );

    return NextResponse.json({
      data: {
        ...receipt,

        supplier_name:
          getThirdPartyName(
            supplierResult.data,
          ),

        purchase_order_number:
          orderResult.data
            ?.purchase_order_number ??
          null,

        items: itemRows.map(
          (item) => ({
            ...item,

            product:
              productsById.get(
                item.item_id,
              ) ?? null,

            warehouse:
              warehousesById.get(
                item.warehouse_id,
              ) ?? null,

            internal_lot:
              item.internal_lot_id
                ? lotsById.get(
                    item.internal_lot_id,
                  ) ?? null
                : null,
          }),
        ),
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
