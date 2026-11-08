import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

export const runtime = "nodejs";

function handleError(error: unknown) {
  console.error(
    "API Compras · Preparación SIIGO:",
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

function getProduct<T>(
  value: T | T[] | null,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export async function GET(request: Request) {
  try {
    await requireSystemPermission(
      request,
      "ABASTECIMIENTO_COMPRAS_MANAGE",
    );

    const url = new URL(request.url);

    const purchaseOrderId =
      String(
        url.searchParams.get("id") ?? "",
      ).trim();

    if (!purchaseOrderId) {
      return NextResponse.json(
        {
          error:
            "Debes indicar la solicitud de compra.",
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
        clap_request_number,
        purchase_order_number,
        siigo_order_number,
        siigo_document_id,
        siigo_sync_status,
        supplier_id,
        order_date,
        expected_delivery_date,
        observations,
        total
      `)
      .eq("id", purchaseOrderId)
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
          identification_number,
          is_supplier,
          status,
          siigo_sync_enabled,
          siigo_sync_status,
          siigo_third_party_id
        `)
        .eq("id", order.supplier_id)
        .maybeSingle(),

      supabaseAdmin
        .from("purchase_order_items")
        .select(`
          id,
          item_id,
          quantity_ordered,
          unit_price,
          total,
          products:item_id (
            id,
            final_code,
            reference,
            name,
            unit,
            status,
            can_be_purchased,
            siigo_sync_enabled,
            siigo_sync_status,
            siigo_product_id
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
        `No se pudieron consultar los productos: ${itemsResult.error.message}`,
      );
    }

    const supplier =
      supplierResult.data;

    const issues: string[] = [];
    const syncTasks: string[] = [];

    if (!supplier) {
      issues.push(
        "La solicitud no tiene un proveedor válido.",
      );
    } else {
      if (
        !supplier.is_supplier ||
        supplier.status !== "Activo"
      ) {
        issues.push(
          "El tercero seleccionado no está activo como proveedor.",
        );
      }

      if (
        supplier.siigo_sync_enabled === false
      ) {
        issues.push(
          "El proveedor tiene deshabilitada la sincronización con SIIGO.",
        );
      }

      if (
        !supplier.siigo_third_party_id
      ) {
        syncTasks.push(
          "Sincronizar proveedor con SIIGO.",
        );
      }
    }

    const normalizedItems =
      (itemsResult.data ?? []).map(
        (item) => {
          const product =
            getProduct(
              item.products,
            );

          const itemIssues: string[] =
            [];

          const itemSyncTasks: string[] =
            [];

          if (!product) {
            itemIssues.push(
              "El producto no existe.",
            );
          } else {
            if (
              product.status !==
              "Activo"
            ) {
              itemIssues.push(
                "El producto está inactivo.",
              );
            }

            if (
              product.can_be_purchased !==
              true
            ) {
              itemIssues.push(
                "El producto no está habilitado para compras.",
              );
            }

            if (
              product.siigo_sync_enabled ===
              false
            ) {
              itemIssues.push(
                "La sincronización SIIGO está deshabilitada.",
              );
            }

            if (
              !product.siigo_product_id
            ) {
              itemSyncTasks.push(
                "Sincronizar producto con SIIGO.",
              );
            }
          }

          if (
            Number(
              item.quantity_ordered,
            ) <= 0
          ) {
            itemIssues.push(
              "La cantidad debe ser mayor a cero.",
            );
          }

          if (
            Number(
              item.unit_price,
            ) <= 0
          ) {
            itemIssues.push(
              "El precio debe ser mayor a cero.",
            );
          }

          return {
            id: item.id,
            item_id: item.item_id,

            quantity_ordered:
              Number(
                item.quantity_ordered,
              ),

            unit_price:
              Number(
                item.unit_price,
              ),

            total:
              Number(
                item.total,
              ),

            product: product
              ? {
                  id: product.id,

                  code:
                    product.final_code ||
                    product.reference,

                  name:
                    product.name,

                  unit:
                    product.unit,

                  siigo_product_id:
                    product.siigo_product_id,

                  siigo_sync_status:
                    product.siigo_sync_status,
                }
              : null,

            ready:
              itemIssues.length ===
              0,

            synced:
              Boolean(
                product?.siigo_product_id,
              ),

            issues:
              itemIssues,

            sync_tasks:
              itemSyncTasks,
          };
        },
      );

    for (
      const item of normalizedItems
    ) {
      for (
        const issue of item.issues
      ) {
        issues.push(
          `${item.product?.code ?? "Producto"}: ${issue}`,
        );
      }

      for (
        const task of item.sync_tasks
      ) {
        syncTasks.push(
          `${item.product?.code ?? "Producto"}: ${task}`,
        );
      }
    }

    if (
      normalizedItems.length === 0
    ) {
      issues.push(
        "La solicitud no tiene productos.",
      );
    }

    if (
      order.siigo_order_number
    ) {
      issues.push(
        `La solicitud ya está vinculada a la OC SIIGO ${order.siigo_order_number}.`,
      );
    }

    const ready =
      issues.length === 0;

    return NextResponse.json({
      ready,

      issues,

      sync_tasks:
        syncTasks,

      order: {
        id: order.id,

        clap_request_number:
          order.clap_request_number,

        order_date:
          order.order_date,

        expected_delivery_date:
          order.expected_delivery_date,

        observations:
          order.observations,

        total:
          Number(
            order.total,
          ),
      },

      supplier: supplier
        ? {
            id: supplier.id,

            name:
              supplier.business_name ||
              supplier.commercial_name ||
              supplier.identification_number,

            identification_number:
              supplier.identification_number,

            siigo_third_party_id:
              supplier.siigo_third_party_id,

            siigo_sync_status:
              supplier.siigo_sync_status,

            ready:
              Boolean(
                supplier.siigo_sync_enabled !==
                  false &&
                supplier.is_supplier &&
                supplier.status ===
                  "Activo",
              ),

            synced:
              Boolean(
                supplier.siigo_third_party_id,
              ),
          }
        : null,

      items:
        normalizedItems,
    });
  } catch (error) {
    return handleError(error);
  }
}
