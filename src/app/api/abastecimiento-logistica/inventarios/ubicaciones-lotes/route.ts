import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

export const runtime = "nodejs";

function handleError(error: unknown) {
  console.error(
    "API Almacenes e Inventarios · Ubicaciones / lotes:",
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

function normalizeCode(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-");
}


// =========================================================
// GET · ALMACENES Y LOTES
// =========================================================

export async function GET(request: Request) {
  try {
    await requireSystemPermission(
      request,
      "ALMACEN_INVENTARIOS_VIEW",
    );

    const [
      warehousesResult,
      lotsResult,
      balancesResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("warehouses")
        .select(`
          id,
          code,
          name,
          location,
          status,
          created_at
        `)
        .order("code"),

      supabaseAdmin
        .from("inventory_lots")
        .select(`
          id,
          lot_number,
          item_id,
          warehouse_id,
          origin_type,
          origin_reference,
          supplier_name,
          manufacturing_date,
          expiration_date,
          status,
          notes,
          created_at
        `)
        .order(
          "created_at",
          {
            ascending: false,
          },
        ),

      supabaseAdmin
        .from("inventory_balances")
        .select(`
          id,
          item_id,
          warehouse_id,
          lot_id,
          quantity_total,
          quantity_reserved,
          quantity_available,
          updated_at
        `)
        .gt(
          "quantity_total",
          0,
        ),
    ]);

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

    if (balancesResult.error) {
      throw new Error(
        `No se pudieron consultar las ubicaciones actuales: ${balancesResult.error.message}`,
      );
    }

    const warehouses =
      warehousesResult.data ?? [];

    const lots =
      lotsResult.data ?? [];

    const balances =
      balancesResult.data ?? [];

    const itemIds = [
      ...new Set(
        lots
          .map((lot) => lot.item_id)
          .filter(
            (value): value is string =>
              typeof value === "string",
          ),
      ),
    ];

    const productsResult =
      itemIds.length > 0
        ? await supabaseAdmin
            .from("products")
            .select(`
              id,
              final_code,
              reference,
              name,
              unit,
              status
            `)
            .in("id", itemIds)
        : {
            data: [],
            error: null,
          };

    if (productsResult.error) {
      throw new Error(
        `No se pudieron consultar los productos de los lotes: ${productsResult.error.message}`,
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
      warehouses.map(
        (warehouse) => [
          warehouse.id,
          warehouse,
        ],
      ),
    );

    const balancesByLot = new Map<
      string,
      typeof balances
    >();

    for (const balance of balances) {
      if (!balance.lot_id) {
        continue;
      }

      const current =
        balancesByLot.get(
          balance.lot_id,
        ) ?? [];

      current.push(
        balance,
      );

      balancesByLot.set(
        balance.lot_id,
        current,
      );
    }

    const enrichedLots =
      lots.map((lot) => {
        const product =
          lot.item_id
            ? productsById.get(
                lot.item_id,
              ) ?? null
            : null;

        const lotBalances =
          balancesByLot.get(
            lot.id,
          ) ?? [];

        const locations =
          lotBalances
            .map((balance) => {
              const warehouse =
                balance.warehouse_id
                  ? warehousesById.get(
                      balance.warehouse_id,
                    ) ?? null
                  : null;

              if (!warehouse) {
                return null;
              }

              return {
                warehouse_id:
                  warehouse.id,

                code:
                  warehouse.code,

                name:
                  warehouse.name,

                quantity_total:
                  Number(
                    balance.quantity_total ??
                      0,
                  ),

                quantity_reserved:
                  Number(
                    balance.quantity_reserved ??
                      0,
                  ),

                quantity_available:
                  Number(
                    balance.quantity_available ??
                      0,
                  ),
              };
            })
            .filter(
              (
                value,
              ): value is NonNullable<
                typeof value
              > =>
                value !== null,
            );

        let currentWarehouse:
          | {
              id: string;
              code: string;
              name: string;
              location?: string | null;
              status?: string | null;
            }
          | null = null;

        if (locations.length === 1) {
          const location =
            locations[0];

          const warehouse =
            warehousesById.get(
              location.warehouse_id,
            );

          currentWarehouse = {
            id:
              location.warehouse_id,

            code:
              location.code,

            name:
              `${location.name} · ${location.quantity_available} ${product?.unit ?? ""}`.trim(),

            location:
              warehouse?.location ??
              null,

            status:
              warehouse?.status ??
              null,
          };
        }

        if (locations.length > 1) {
          currentWarehouse = {
            id:
              `multiple-${lot.id}`,

            code:
              "VARIOS",

            name:
              locations
                .map(
                  (location) =>
                    `${location.code} · ${location.name}: ${location.quantity_available} ${product?.unit ?? ""}`.trim(),
                )
                .join(" | "),
          };
        }

        return {
          ...lot,

          product,

          /*
           * IMPORTANTE:
           * inventory_lots.warehouse_id representa el almacén
           * donde nació el lote.
           *
           * La ubicación actual se determina desde
           * inventory_balances porque un mismo lote puede
           * estar distribuido entre varios almacenes.
           */
          warehouse:
            currentWarehouse,

          origin_warehouse:
            lot.warehouse_id
              ? warehousesById.get(
                  lot.warehouse_id,
                ) ?? null
              : null,

          locations,
        };
      });

    return NextResponse.json({
      warehouses,
      lots:
        enrichedLots,

      summary: {
        warehouses:
          warehouses.length,

        activeWarehouses:
          warehouses.filter(
            (warehouse) =>
              warehouse.status ===
              "Activo",
          ).length,

        lots:
          lots.length,

        activeLots:
          lots.filter(
            (lot) =>
              lot.status ===
              "Activo",
          ).length,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}


// =========================================================
// POST · CREAR ALMACÉN
// =========================================================

export async function POST(request: Request) {
  try {
    await requireSystemPermission(
      request,
      "ALMACEN_LOCATIONS_MANAGE",
    );

    const body =
      await request.json();

    const code =
      normalizeCode(
        body?.code,
      );

    const name =
      String(
        body?.name ?? "",
      ).trim();

    const location =
      String(
        body?.location ?? "",
      ).trim();

    if (!code) {
      return NextResponse.json(
        {
          error:
            "Debes ingresar el código del almacén.",
        },
        {
          status: 400,
        },
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Debes ingresar el nombre del almacén.",
        },
        {
          status: 400,
        },
      );
    }

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("warehouses")
      .insert({
        code,
        name,

        location:
          location || null,

        status:
          "Activo",
      })
      .select(`
        id,
        code,
        name,
        location,
        status,
        created_at
      `)
      .single();

    if (error) {
      if (
        error.code ===
        "23505"
      ) {
        return NextResponse.json(
          {
            error:
              "Ya existe un almacén con ese código.",
          },
          {
            status: 409,
          },
        );
      }

      throw new Error(
        `No se pudo crear el almacén: ${error.message}`,
      );
    }

    return NextResponse.json(
      {
        warehouse:
          data,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return handleError(error);
  }
}


// =========================================================
// PATCH · EDITAR / ACTIVAR / INACTIVAR ALMACÉN
// =========================================================

export async function PATCH(request: Request) {
  try {
    await requireSystemPermission(
      request,
      "ALMACEN_LOCATIONS_MANAGE",
    );

    const body =
      await request.json();

    const warehouseId =
      String(
        body?.id ?? "",
      ).trim();

    const code =
      normalizeCode(
        body?.code,
      );

    const name =
      String(
        body?.name ?? "",
      ).trim();

    const location =
      String(
        body?.location ?? "",
      ).trim();

    const status =
      String(
        body?.status ?? "",
      ).trim();

    if (!warehouseId) {
      return NextResponse.json(
        {
          error:
            "No se recibió el almacén que deseas actualizar.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !code ||
      !name
    ) {
      return NextResponse.json(
        {
          error:
            "Código y nombre son obligatorios.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      status !== "Activo" &&
      status !== "Inactivo"
    ) {
      return NextResponse.json(
        {
          error:
            "Estado de almacén no válido.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      status ===
      "Inactivo"
    ) {
      const {
        data:
          positiveBalance,

        error:
          positiveBalanceError,
      } =
        await supabaseAdmin
          .from(
            "inventory_balances",
          )
          .select(
            "id",
          )
          .eq(
            "warehouse_id",
            warehouseId,
          )
          .gt(
            "quantity_total",
            0,
          )
          .limit(1)
          .maybeSingle();

      if (
        positiveBalanceError
      ) {
        throw new Error(
          `No se pudo validar el inventario del almacén: ${positiveBalanceError.message}`,
        );
      }

      if (
        positiveBalance
      ) {
        return NextResponse.json(
          {
            error:
              "No puedes inactivar un almacén que todavía tiene existencias.",
          },
          {
            status: 409,
          },
        );
      }
    }

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("warehouses")
      .update({
        code,
        name,

        location:
          location || null,

        status,
      })
      .eq(
        "id",
        warehouseId,
      )
      .select(`
        id,
        code,
        name,
        location,
        status,
        created_at
      `)
      .single();

    if (error) {
      if (
        error.code ===
        "23505"
      ) {
        return NextResponse.json(
          {
            error:
              "Ya existe otro almacén con ese código.",
          },
          {
            status: 409,
          },
        );
      }

      throw new Error(
        `No se pudo actualizar el almacén: ${error.message}`,
      );
    }

    return NextResponse.json({
      warehouse:
        data,
    });
  } catch (error) {
    return handleError(error);
  }
}
