"use client";

import Link from "next/link";
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
};

type Warehouse = {
  id: string;
  code: string;
  name: string;
};

type Lot = {
  id: string;
  lot_number: string;
  status: string | null;
};

type Movement = {
  id: string;
  movement_date: string;
  movement_type: string;
  item_id: string | null;
  warehouse_id: string | null;
  lot_id: string | null;
  quantity: number;
  previous_balance: number;
  new_balance: number;
  reference_type: string | null;
  reference_id: string | null;
  reference_number: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string | null;

  product: Product | null;
  warehouse: Warehouse | null;
  lot: Lot | null;
};

function formatNumber(
  value: number,
) {
  return new Intl.NumberFormat(
    "es-CO",
    {
      maximumFractionDigits: 2,
    },
  ).format(value);
}

function formatDateTime(
  value: string | null,
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "es-CO",
    {
      dateStyle: "short",
      timeStyle: "short",
      timeZone:
        "America/Bogota",
    },
  ).format(date);
}

function isExitMovement(
  movement: Movement,
) {
  const type =
    (
      movement.movement_type ||
      ""
    ).toLowerCase();

  return (
    movement.quantity < 0 ||
    type.includes("salida") ||
    type.includes("consumo") ||
    type.includes("despacho")
  );
}


function getReferenceHref(
  movement: Movement,
) {
  if (
    !movement.reference_id
  ) {
    return null;
  }

  switch (
    movement.reference_type
  ) {
    case "Recepción":
      return `/abastecimiento-logistica/recepciones/${movement.reference_id}`;

    case "Salida":
      return `/abastecimiento-logistica/almacenes-inventarios/salidas/${movement.reference_id}`;

    case "Traslado":
      return `/abastecimiento-logistica/almacenes-inventarios/traslados/${movement.reference_id}`;

    case "Ajuste":
      return `/abastecimiento-logistica/almacenes-inventarios/ajustes/${movement.reference_id}`;

    default:
      return null;
  }
}

export default function KardexPage() {
  const { session } =
    useAuth();

  const [
    movements,
    setMovements,
  ] = useState<Movement[]>(
    [],
  );

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const loadMovements =
    useCallback(async () => {
      if (
        !session?.access_token
      ) {
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const response =
          await fetch(
            "/api/abastecimiento-logistica/inventarios/kardex",
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
              "No se pudo cargar el Kardex.",
          );
        }

        setMovements(
          payload.movements ??
            [],
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudo cargar el Kardex.",
        );
      } finally {
        setIsLoading(false);
      }
    }, [
      session?.access_token,
    ]);

  useEffect(() => {
    void loadMovements();
  }, [loadMovements]);

  const filteredMovements =
    useMemo(() => {
      const normalized =
        search
          .trim()
          .toLowerCase();

      if (!normalized) {
        return movements;
      }

      return movements.filter(
        (movement) => {
          const searchable = [
            movement.movement_type,
            movement.product
              ?.final_code,
            movement.product
              ?.reference,
            movement.product
              ?.name,
            movement.warehouse
              ?.code,
            movement.warehouse
              ?.name,
            movement.lot
              ?.lot_number,
            movement.reference_number,
            movement.created_by,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchable.includes(
            normalized,
          );
        },
      );
    }, [
      movements,
      search,
    ]);

  const summary =
    useMemo(() => {
      let entries = 0;
      let exits = 0;

      movements.forEach(
        (movement) => {
          if (
            isExitMovement(
              movement,
            )
          ) {
            exits += 1;
          } else {
            entries += 1;
          }
        },
      );

      return {
        records:
          movements.length,
        entries,
        exits,
      };
    }, [movements]);

  return (
    <div className="space-y-8">
      <section>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
          Almacenes e Inventarios · Kardex
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-[#07076b]">
          Kardex
        </h1>

        <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
          Consulta la trazabilidad histórica de entradas,
          salidas y saldos de inventario por producto,
          almacén y lote interno CLAP.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Movimientos
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            {summary.records}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Movimientos de entrada
          </p>

          <p className="mt-2 text-2xl font-bold text-emerald-700">
            {formatNumber(
              summary.entries,
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Movimientos de salida
          </p>

          <p className="mt-2 text-2xl font-bold text-red-600">
            {formatNumber(
              summary.exits,
            )}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Movimientos de inventario
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Historial cronológico de movimientos registrados.
            </p>
          </div>

          <input
            value={search}
            onChange={(
              event,
            ) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Buscar producto, lote, almacén, recepción..."
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-[#07076b] md:max-w-md"
          />
        </div>

        {isLoading ? (
          <div className="py-14 text-center text-sm text-gray-500">
            Cargando Kardex...
          </div>
        ) : errorMessage ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : filteredMovements.length ===
          0 ? (
          <div className="py-14 text-center">
            <p className="font-medium text-gray-700">
              Sin movimientos registrados
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Los movimientos aparecerán aquí
              cuando se registren entradas o
              salidas de inventario.
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full min-w-[1750px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">
                    Fecha
                  </th>

                  <th className="px-4 py-3">
                    Movimiento
                  </th>

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
                    Lote interno CLAP
                  </th>

                  <th className="px-4 py-3 text-right">
                    Entrada
                  </th>

                  <th className="px-4 py-3 text-right">
                    Salida
                  </th>

                  <th className="px-4 py-3 text-right">
                    Saldo anterior
                  </th>

                  <th className="px-4 py-3 text-right">
                    Saldo nuevo
                  </th>

                  <th className="px-4 py-3">
                    Referencia
                  </th>

                  <th className="px-4 py-3">
                    Responsable
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filteredMovements.map(
                  (movement) => {
                    const exit =
                      isExitMovement(
                        movement,
                      );

                    const unit =
                      movement.product
                        ?.unit ||
                      "";

                    return (
                      <tr
                        key={
                          movement.id
                        }
                        className="hover:bg-gray-50"
                      >
                        <td className="px-4 py-4 whitespace-nowrap text-gray-600">
                          {formatDateTime(
                            movement.movement_date,
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={
                              exit
                                ? "rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
                                : "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                            }
                          >
                            {
                              movement.movement_type
                            }
                          </span>
                        </td>

                        <td className="px-4 py-4 font-semibold text-[#07076b]">
                          {movement.product
                            ?.final_code ||
                            movement.product
                              ?.reference ||
                            "—"}
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-medium text-gray-900">
                            {movement.product
                              ?.name ||
                              "Producto"}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {unit}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-gray-700">
                          {movement.warehouse
                            ? `${movement.warehouse.code} · ${movement.warehouse.name}`
                            : "—"}
                        </td>

                        <td className="px-4 py-4">
                          {movement.lot
                            ?.lot_number ? (
                            <span className="rounded-lg bg-[#07076b]/10 px-3 py-2 text-xs font-bold text-[#07076b]">
                              {
                                movement.lot
                                  .lot_number
                              }
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>

                        <td className="px-4 py-4 text-right font-semibold text-emerald-700">
                          {!exit
                            ? `${formatNumber(
                                Math.abs(
                                  movement.quantity,
                                ),
                              )} ${unit}`
                            : "—"}
                        </td>

                        <td className="px-4 py-4 text-right font-semibold text-red-600">
                          {exit
                            ? `${formatNumber(
                                Math.abs(
                                  movement.quantity,
                                ),
                              )} ${unit}`
                            : "—"}
                        </td>

                        <td className="px-4 py-4 text-right text-gray-600">
                          {formatNumber(
                            movement.previous_balance,
                          )}{" "}
                          {unit}
                        </td>

                        <td className="px-4 py-4 text-right font-bold text-gray-900">
                          {formatNumber(
                            movement.new_balance,
                          )}{" "}
                          {unit}
                        </td>

                        <td className="px-4 py-4">
                          {getReferenceHref(
                            movement,
                          ) ? (
                            <Link
                              href={
                                getReferenceHref(
                                  movement,
                                )!
                              }
                              className="font-semibold text-[#07076b] hover:underline"
                            >
                              {movement.reference_number ||
                                "Ver recepción"}
                            </Link>
                          ) : (
                            <span className="text-gray-700">
                              {movement.reference_number ||
                                movement.reference_type ||
                                "—"}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-gray-700">
                          {movement.created_by ||
                            "—"}
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
