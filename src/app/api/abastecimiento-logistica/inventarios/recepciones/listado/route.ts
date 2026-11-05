import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

export const runtime = "nodejs";

function handleError(error: unknown) {
  console.error(
    "API Almacenes e Inventarios · Listado recepciones:",
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
      "ALMACEN_RECEIVE",
    );

    const { data: receipts, error: receiptsError } =
      await supabaseAdmin
        .from("purchase_receipts")
        .select(`
          id,
          receipt_number,
          purchase_order_id,
          supplier_id,
          receipt_date,
          supplier_invoice_number,
          supplier_remission_number,
          total,
          receipt_mode,
          authorization_reference,
          received_by,
          created_at
        `)
        .order("created_at", {
          ascending: false,
        });

    if (receiptsError) {
      throw new Error(
        `No se pudieron consultar las recepciones: ${receiptsError.message}`,
      );
    }

    const receiptRows =
      receipts ?? [];

    const supplierIds = [
      ...new Set(
        receiptRows
          .map((receipt) =>
            receipt.supplier_id,
          )
          .filter(
            (value): value is string =>
              Boolean(value),
          ),
      ),
    ];

    const purchaseOrderIds = [
      ...new Set(
        receiptRows
          .map((receipt) =>
            receipt.purchase_order_id,
          )
          .filter(
            (value): value is string =>
              Boolean(value),
          ),
      ),
    ];

    const [
      suppliersResult,
      purchaseOrdersResult,
    ] = await Promise.all([
      supplierIds.length > 0
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
            .in("id", supplierIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),

      purchaseOrderIds.length > 0
        ? supabaseAdmin
            .from("purchase_orders")
            .select(`
              id,
              purchase_order_number
            `)
            .in(
              "id",
              purchaseOrderIds,
            )
        : Promise.resolve({
            data: [],
            error: null,
          }),
    ]);

    if (suppliersResult.error) {
      throw new Error(
        `No se pudieron consultar los proveedores: ${suppliersResult.error.message}`,
      );
    }

    if (purchaseOrdersResult.error) {
      throw new Error(
        `No se pudieron consultar las órdenes de compra: ${purchaseOrdersResult.error.message}`,
      );
    }

    const suppliersById =
      new Map(
        (suppliersResult.data ?? []).map(
          (supplier) => {
            const naturalName =
              [
                supplier.first_name,
                supplier.last_name,
              ]
                .filter(Boolean)
                .join(" ")
                .trim();

            const name =
              supplier.business_name?.trim() ||
              supplier.commercial_name?.trim() ||
              naturalName ||
              supplier.identification_number ||
              "Proveedor";

            return [
              supplier.id,
              name,
            ];
          },
        ),
      );

    const ordersById =
      new Map(
        (
          purchaseOrdersResult.data ??
          []
        ).map(
          (order) => [
            order.id,
            order.purchase_order_number,
          ],
        ),
      );

    const data =
      receiptRows.map(
        (receipt) => ({
          id: receipt.id,

          receipt_number:
            receipt.receipt_number,

          purchase_order_number:
            receipt.purchase_order_id
              ? ordersById.get(
                  receipt.purchase_order_id,
                ) ?? "OC no disponible"
              : null,

          supplier_name:
            receipt.supplier_id
              ? suppliersById.get(
                  receipt.supplier_id,
                ) ?? "Proveedor no disponible"
              : "Sin proveedor",

          receipt_date:
            receipt.receipt_date,

          supplier_invoice_number:
            receipt.supplier_invoice_number,

          supplier_remission_number:
            receipt.supplier_remission_number,

          total:
            Number(
              receipt.total ?? 0,
            ),

          receipt_mode:
            receipt.receipt_mode,

          authorization_reference:
            receipt.authorization_reference,

          received_by:
            receipt.received_by,

          created_at:
            receipt.created_at,

          status:
            "Recibido",
        }),
      );

    return NextResponse.json({
      data,
    });
  } catch (error) {
    return handleError(error);
  }
}
