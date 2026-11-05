import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

export const runtime = "nodejs";

function handleError(error: unknown) {
  console.error(
    "API Almacenes e Inventarios · Existencias:",
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
      "ALMACEN_INVENTARIOS_VIEW",
    );

    const {
      data: balances,
      error: balancesError,
    } = await supabaseAdmin
      .from("inventory_balances")
      .select(`
        id,
        item_id,
        warehouse_id,
        lot_id,
        quantity_total,
        quantity_reserved,
        quantity_available,
        unit_cost,
        updated_at
      `)
      .order("updated_at", {
        ascending: false,
      });

    if (balancesError) {
      throw new Error(
        `No se pudieron consultar las existencias: ${balancesError.message}`,
      );
    }

    const safeBalances = balances ?? [];

    if (safeBalances.length === 0) {
      return NextResponse.json({
        balances: [],
        summary: {
          records: 0,
          quantityTotal: 0,
          quantityReserved: 0,
          quantityAvailable: 0,
          inventoryValue: 0,
        },
      });
    }

    const itemIds = [
      ...new Set(
        safeBalances
          .map((row) => row.item_id)
          .filter(
            (value): value is string =>
              typeof value === "string",
          ),
      ),
    ];

    const warehouseIds = [
      ...new Set(
        safeBalances
          .map((row) => row.warehouse_id)
          .filter(
            (value): value is string =>
              typeof value === "string",
          ),
      ),
    ];

    const lotIds = [
      ...new Set(
        safeBalances
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
              category,
              status
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
              name,
              location,
              status
            `)
            .in("id", warehouseIds)
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
              expiration_date,
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

    const enrichedBalances =
      safeBalances.map((balance) => {
        const quantityTotal =
          Number(balance.quantity_total || 0);

        const quantityReserved =
          Number(balance.quantity_reserved || 0);

        const quantityAvailable =
          Number(balance.quantity_available || 0);

        const unitCost =
          Number(balance.unit_cost || 0);

        return {
          id: balance.id,
          item_id: balance.item_id,
          warehouse_id: balance.warehouse_id,
          lot_id: balance.lot_id,

          quantity_total: quantityTotal,
          quantity_reserved: quantityReserved,
          quantity_available: quantityAvailable,
          unit_cost: unitCost,
          inventory_value:
            quantityTotal * unitCost,

          updated_at: balance.updated_at,

          product: balance.item_id
            ? productsById.get(
                balance.item_id,
              ) ?? null
            : null,

          warehouse: balance.warehouse_id
            ? warehousesById.get(
                balance.warehouse_id,
              ) ?? null
            : null,

          lot: balance.lot_id
            ? lotsById.get(
                balance.lot_id,
              ) ?? null
            : null,
        };
      });

    const summary =
      enrichedBalances.reduce(
        (accumulator, row) => {
          accumulator.records += 1;
          accumulator.quantityTotal +=
            row.quantity_total;
          accumulator.quantityReserved +=
            row.quantity_reserved;
          accumulator.quantityAvailable +=
            row.quantity_available;
          accumulator.inventoryValue +=
            row.inventory_value;

          return accumulator;
        },
        {
          records: 0,
          quantityTotal: 0,
          quantityReserved: 0,
          quantityAvailable: 0,
          inventoryValue: 0,
        },
      );

    return NextResponse.json({
      balances: enrichedBalances,
      summary,
    });
  } catch (error) {
    return handleError(error);
  }
}
