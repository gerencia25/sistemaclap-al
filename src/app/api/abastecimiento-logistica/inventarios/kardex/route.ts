import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

export const runtime = "nodejs";

function handleError(error: unknown) {
  console.error(
    "API Almacenes e Inventarios · Kardex:",
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

    const {
      data: movements,
      error: movementsError,
    } = await supabaseAdmin
      .from("inventory_movements")
      .select(`
        id,
        movement_date,
        movement_type,
        item_id,
        warehouse_id,
        lot_id,
        quantity,
        previous_balance,
        new_balance,
        reference_type,
        reference_id,
        reference_number,
        notes,
        created_by,
        created_at
      `)
      .order("movement_date", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      });

    if (movementsError) {
      throw new Error(
        `No se pudo consultar el Kardex: ${movementsError.message}`,
      );
    }

    const safeMovements =
      movements ?? [];

    if (safeMovements.length === 0) {
      return NextResponse.json({
        movements: [],
      });
    }

    const itemIds = [
      ...new Set(
        safeMovements
          .map((row) => row.item_id)
          .filter(
            (value): value is string =>
              typeof value === "string",
          ),
      ),
    ];

    const warehouseIds = [
      ...new Set(
        safeMovements
          .map(
            (row) =>
              row.warehouse_id,
          )
          .filter(
            (value): value is string =>
              typeof value === "string",
          ),
      ),
    ];

    const lotIds = [
      ...new Set(
        safeMovements
          .map((row) => row.lot_id)
          .filter(
            (value): value is string =>
              typeof value === "string",
          ),
      ),
    ];

    const [
      productsResult,
      warehousesResult,
      lotsResult,
    ] = await Promise.all([
      itemIds.length > 0
        ? supabaseAdmin
            .from("products")
            .select(`
              id,
              final_code,
              reference,
              name,
              unit,
              category
            `)
            .in("id", itemIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),

      warehouseIds.length > 0
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

      lotIds.length > 0
        ? supabaseAdmin
            .from("inventory_lots")
            .select(`
              id,
              lot_number,
              status
            `)
            .in("id", lotIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),
    ]);

    if (productsResult.error) {
      throw new Error(
        `No se pudieron consultar los productos: ${productsResult.error.message}`,
      );
    }

    if (warehousesResult.error) {
      throw new Error(
        `No se pudieron consultar los almacenes: ${warehousesResult.error.message}`,
      );
    }

    if (lotsResult.error) {
      throw new Error(
        `No se pudieron consultar los lotes: ${lotsResult.error.message}`,
      );
    }

    const productsById =
      new Map(
        (productsResult.data ?? []).map(
          (product) => [
            product.id,
            product,
          ],
        ),
      );

    const warehousesById =
      new Map(
        (
          warehousesResult.data ??
          []
        ).map(
          (warehouse) => [
            warehouse.id,
            warehouse,
          ],
        ),
      );

    const lotsById =
      new Map(
        (lotsResult.data ?? []).map(
          (lot) => [
            lot.id,
            lot,
          ],
        ),
      );

    const enrichedMovements =
      safeMovements.map(
        (movement) => ({
          id: movement.id,

          movement_date:
            movement.movement_date,

          movement_type:
            movement.movement_type,

          item_id:
            movement.item_id,

          warehouse_id:
            movement.warehouse_id,

          lot_id:
            movement.lot_id,

          quantity:
            Number(
              movement.quantity ??
                0,
            ),

          previous_balance:
            Number(
              movement.previous_balance ??
                0,
            ),

          new_balance:
            Number(
              movement.new_balance ??
                0,
            ),

          reference_type:
            movement.reference_type,

          reference_id:
            movement.reference_id,

          reference_number:
            movement.reference_number,

          notes:
            movement.notes,

          created_by:
            movement.created_by,

          created_at:
            movement.created_at,

          product:
            movement.item_id
              ? productsById.get(
                  movement.item_id,
                ) ?? null
              : null,

          warehouse:
            movement.warehouse_id
              ? warehousesById.get(
                  movement.warehouse_id,
                ) ?? null
              : null,

          lot:
            movement.lot_id
              ? lotsById.get(
                  movement.lot_id,
                ) ?? null
              : null,
        }),
      );

    return NextResponse.json({
      movements:
        enrichedMovements,
    });
  } catch (error) {
    return handleError(error);
  }
}
