"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/components/auth/AuthProvider";

type Product = {
  id: string;
  final_code: string | null;
  reference: string | null;
  name: string;
  unit: string | null;
  category: string | null;
  status: string | null;
};

type Warehouse = {
  id: string;
  code: string;
  name: string;
  location: string | null;
  status: string;
};

type Lot = {
  id: string;
  lot_number: string;
  expiration_date: string | null;
  status: string;
};

type InventoryBalance = {
  id: string;
  item_id: string | null;
  warehouse_id: string | null;
  lot_id: string | null;

  quantity_total: number;
  quantity_reserved: number;
  quantity_available: number;
  unit_cost: number;
  inventory_value: number;

  updated_at: string | null;

  product: Product | null;
  warehouse: Warehouse | null;
  lot: Lot | null;
};

type Summary = {
  records: number;
  quantityTotal: number;
  quantityReserved: number;
  quantityAvailable: number;
  inventoryValue: number;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat(
    "es-CO",
    {
      maximumFractionDigits: 2,
    },
  ).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat(
    "es-CO",
    {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    },
  ).format(value);
}

export default function ExistenciasPage() {
  const { session } = useAuth();

  const [balances, setBalances] =
    useState<InventoryBalance[]>([]);

  const [summary, setSummary] =
    useState<Summary>({
      records: 0,
      quantityTotal: 0,
      quantityReserved: 0,
      quantityAvailable: 0,
      inventoryValue: 0,
    });

  const [search, setSearch] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const fetchBalances = useCallback(
    async () => {
      if (!session?.access_token) {
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch(
          "/api/abastecimiento-logistica/inventarios/existencias",
          {
            headers: {
              Authorization:
                `Bearer ${session.access_token}`,
            },
            cache: "no-store",
          },
        );

        const payload =
          await response.json();

        if (!response.ok) {
          throw new Error(
            payload?.error ||
              "No se pudieron cargar las existencias.",
          );
        }

        setBalances(
          payload.balances ?? [],
        );

        setSummary(
          payload.summary ?? {
            records: 0,
            quantityTotal: 0,
            quantityReserved: 0,
            quantityAvailable: 0,
            inventoryValue: 0,
          },
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las existencias.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [session?.access_token],
  );

  useEffect(() => {
    void fetchBalances();
  }, [fetchBalances]);

  const filteredBalances =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      if (!normalizedSearch) {
        return balances;
      }

      return balances.filter(
        (balance) => {
          const searchableText = [
            balance.product?.final_code,
            balance.product?.reference,
            balance.product?.name,
            balance.warehouse?.code,
            balance.warehouse?.name,
            balance.lot?.lot_number,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchableText.includes(
            normalizedSearch,
          );
        },
      );
    }, [balances, search]);

  return (
    <div className="space-y-8">
      <section>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
          Almacenes e Inventarios · Existencias
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-[#07076b]">
          Existencias
        </h1>

        <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
          Consulta las cantidades registradas por producto,
          almacén y lote.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Registros
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            {summary.records}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Cantidad total
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            {formatNumber(
              summary.quantityTotal,
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Disponible
          </p>

          <p className="mt-2 text-2xl font-bold text-emerald-700">
            {formatNumber(
              summary.quantityAvailable,
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Valor inventario
          </p>

          <p className="mt-2 text-2xl font-bold text-[#07076b]">
            {formatCurrency(
              summary.inventoryValue,
            )}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Inventario actual
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Existencias registradas por producto,
              almacén y lote.
            </p>
          </div>

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Buscar producto, código, almacén o lote..."
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-[#07076b] md:max-w-md"
          />
        </div>

        {isLoading ? (
          <div className="py-14 text-center text-sm text-gray-500">
            Cargando existencias...
          </div>
        ) : errorMessage ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : filteredBalances.length === 0 ? (
          <div className="py-14 text-center">
            <p className="font-medium text-gray-700">
              Sin existencias registradas
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Las existencias aparecerán aquí cuando
              se registren entradas de inventario.
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">
                    Código
                  </th>

                  <th className="px-4 py-3">
                    Producto
                  </th>

                  <th className="px-4 py-3">
                    Almacén
                  </th>

                  <th className="px-4 py-3">
                    Lote
                  </th>

                  <th className="px-4 py-3 text-right">
                    Total
                  </th>

                  <th className="px-4 py-3 text-right">
                    Reservado
                  </th>

                  <th className="px-4 py-3 text-right">
                    Disponible
                  </th>

                  <th className="px-4 py-3 text-right">
                    Costo unit.
                  </th>

                  <th className="px-4 py-3 text-right">
                    Valor
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filteredBalances.map(
                  (balance) => (
                    <tr
                      key={balance.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-4 font-semibold text-[#07076b]">
                        {balance.product?.final_code ||
                          balance.product?.reference ||
                          "—"}
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-900">
                          {balance.product?.name ||
                            "Producto no disponible"}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {balance.product?.unit ||
                            "Sin unidad"}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-gray-700">
                        {balance.warehouse
                          ? `${balance.warehouse.code} · ${balance.warehouse.name}`
                          : "—"}
                      </td>

                      <td className="px-4 py-4 text-gray-700">
                        {balance.lot?.lot_number ||
                          "—"}
                      </td>

                      <td className="px-4 py-4 text-right font-medium text-gray-900">
                        {formatNumber(
                          balance.quantity_total,
                        )}
                      </td>

                      <td className="px-4 py-4 text-right text-gray-600">
                        {formatNumber(
                          balance.quantity_reserved,
                        )}
                      </td>

                      <td className="px-4 py-4 text-right font-semibold text-emerald-700">
                        {formatNumber(
                          balance.quantity_available,
                        )}
                      </td>

                      <td className="px-4 py-4 text-right text-gray-700">
                        {formatCurrency(
                          balance.unit_cost,
                        )}
                      </td>

                      <td className="px-4 py-4 text-right font-semibold text-gray-900">
                        {formatCurrency(
                          balance.inventory_value,
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
