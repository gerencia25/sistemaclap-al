import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

export const runtime = "nodejs";

function handleError(error: unknown) {
  console.error(
    "API Almacenes e Inventarios · Recepciones:",
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

// =========================================================
// GET
// Catálogos necesarios para registrar una recepción.
// Si recibe purchaseOrderId, devuelve los ítems de esa OC.
// =========================================================

export async function GET(request: Request) {
  try {
    await requireSystemPermission(
      request,
      "ALMACEN_RECEIVE",
    );

    const url = new URL(request.url);

    const purchaseOrderId =
      url.searchParams.get(
        "purchaseOrderId",
      );

    // =====================================================
    // ÍTEMS DE UNA OC
    // =====================================================

    if (purchaseOrderId) {
      const {
        data,
        error,
      } = await supabaseAdmin
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
            item_type,
            unit,
            tracks_lots,
            tracks_serials,
            status
          )
        `)
        .eq(
          "purchase_order_id",
          purchaseOrderId,
        )
        .order(
          "created_at",
          {
            ascending: true,
          },
        );

      if (error) {
        throw new Error(
          `No se pudieron cargar los ítems de la orden de compra: ${error.message}`,
        );
      }

      return NextResponse.json({
        purchaseOrderItems:
          data ?? [],
      });
    }

    // =====================================================
    // CATÁLOGOS INICIALES
    // =====================================================

    const [
      purchaseOrdersResult,
      suppliersResult,
      paymentTermsResult,
      warehousesResult,
      productsResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("purchase_orders")
        .select(`
          id,
          purchase_order_number,
          supplier_id,
          order_date,
          expected_delivery_date,
          status,
          total,
          observations,
          created_at
        `)
        .in(
          "status",
          [
            "Abierta",
            "Parcial",
          ],
        )
        .order(
          "created_at",
          {
            ascending: false,
          },
        ),

      supabaseAdmin
        .from("third_parties")
        .select(`
          id,
          business_name,
          commercial_name,
          first_name,
          last_name,
          identification_number,
          payment_terms,
          status
        `)
        .eq(
          "is_supplier",
          true,
        )
        .eq(
          "status",
          "Activo",
        )
        .order(
          "business_name",
        ),

      supabaseAdmin
        .from("third_party_payment_terms")
        .select(`
          code,
          name,
          days,
          status
        `)
        .eq(
          "status",
          "Activo",
        )
        .order(
          "days",
        ),

      supabaseAdmin
        .from("warehouses")
        .select(`
          id,
          code,
          name,
          location,
          status
        `)
        .eq(
          "status",
          "Activo",
        )
        .order(
          "code",
        ),

      supabaseAdmin
        .from("products")
        .select(`
          id,
          final_code,
          reference,
          name,
          item_type,
          unit,
          tracks_lots,
          tracks_serials,
          can_be_purchased,
          tracks_inventory,
          status
        `)
        .eq(
          "status",
          "Activo",
        )
        .eq(
          "can_be_purchased",
          true,
        )
        .eq(
          "tracks_inventory",
          true,
        )
        .order(
          "name",
        ),
    ]);

    if (purchaseOrdersResult.error) {
      throw new Error(
        `No se pudieron consultar las órdenes de compra: ${purchaseOrdersResult.error.message}`,
      );
    }

    if (suppliersResult.error) {
      throw new Error(
        `No se pudieron consultar los proveedores: ${suppliersResult.error.message}`,
      );
    }

    if (paymentTermsResult.error) {
      throw new Error(
        `No se pudieron consultar las condiciones de pago: ${paymentTermsResult.error.message}`,
      );
    }

    if (warehousesResult.error) {
      throw new Error(
        `No se pudieron consultar los almacenes: ${warehousesResult.error.message}`,
      );
    }

    if (productsResult.error) {
      throw new Error(
        `No se pudieron consultar los productos comprables: ${productsResult.error.message}`,
      );
    }

    return NextResponse.json({
      purchaseOrders:
        purchaseOrdersResult.data ?? [],

      suppliers:
        (suppliersResult.data ?? []).map((supplier) => {
          const paymentTerm =
            (paymentTermsResult.data ?? []).find(
              (term) =>
                term.name === supplier.payment_terms ||
                term.code === supplier.payment_terms,
            );

          const personName =
            `${supplier.first_name ?? ""} ${supplier.last_name ?? ""}`.trim();

          return {
            id: supplier.id,

            name:
              supplier.business_name ||
              supplier.commercial_name ||
              personName ||
              supplier.identification_number,

            nit:
              supplier.identification_number,

            payment_terms_days:
              paymentTerm?.days ?? 0,

            status:
              supplier.status,
          };
        }),

      warehouses:
        warehousesResult.data ?? [],

      products:
        productsResult.data ?? [],
    });
  } catch (error) {
    return handleError(error);
  }
}

// =========================================================
// POST
// Registrar recepción completa.
// El usuario responsable SIEMPRE sale de la sesión CLAP.
// =========================================================

export async function POST(request: Request) {
  try {
    const systemUser =
      await requireSystemPermission(
        request,
        "ALMACEN_RECEIVE",
      );

    const body =
      await request.json();

    const receiptMode =
      String(
        body?.receipt_mode ?? "",
      ).trim();

    const supplierId =
      body?.supplier_id
        ? String(
            body.supplier_id,
          )
        : null;

    const purchaseOrderId =
      body?.purchase_order_id
        ? String(
            body.purchase_order_id,
          )
        : null;

    const receiptDate =
      body?.receipt_date
        ? String(
            body.receipt_date,
          )
        : null;

    const items =
      Array.isArray(
        body?.items,
      )
        ? body.items
        : [];

    if (
      receiptMode !== "Desde OC" &&
      receiptMode !== "Directa"
    ) {
      return NextResponse.json(
        {
          error:
            "Modo de recepción no válido.",
        },
        {
          status: 400,
        },
      );
    }

    if (!supplierId) {
      return NextResponse.json(
        {
          error:
            "Debes seleccionar un proveedor.",
        },
        {
          status: 400,
        },
      );
    }

    if (!receiptDate) {
      return NextResponse.json(
        {
          error:
            "Debes indicar la fecha de recepción.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      receiptMode === "Desde OC" &&
      !purchaseOrderId
    ) {
      return NextResponse.json(
        {
          error:
            "Debes seleccionar una orden de compra.",
        },
        {
          status: 400,
        },
      );
    }

    if (items.length === 0) {
      return NextResponse.json(
        {
          error:
            "La recepción debe contener al menos un ítem.",
        },
        {
          status: 400,
        },
      );
    }

    const {
      data,
      error,
    } = await supabaseAdmin.rpc(
      "register_inventory_receipt",
      {
        p_receipt_mode:
          receiptMode,

        p_purchase_order_id:
          receiptMode ===
          "Desde OC"
            ? purchaseOrderId
            : null,

        p_supplier_id:
          supplierId,

        p_receipt_date:
          receiptDate,

        p_supplier_invoice_number:
          body?.supplier_invoice_number
            ? String(
                body.supplier_invoice_number,
              )
            : null,

        p_supplier_remission_number:
          body?.supplier_remission_number
            ? String(
                body.supplier_remission_number,
              )
            : null,

        p_authorization_reference:
          body?.authorization_reference
            ? String(
                body.authorization_reference,
              )
            : null,

        p_observations:
          body?.observations
            ? String(
                body.observations,
              )
            : null,

        p_received_by:
          systemUser.full_name ||
          systemUser.email,

        p_items:
          items,
      },
    );

    if (error) {
      throw new Error(
        error.message,
      );
    }

    return NextResponse.json(
      {
        receipt: data,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return handleError(error);
  }
}
