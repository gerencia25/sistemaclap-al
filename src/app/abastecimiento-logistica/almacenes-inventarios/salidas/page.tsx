"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useAuth,
} from "@/components/auth/AuthProvider";

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

type Balance = {
  id: string;

  item_id: string;
  warehouse_id: string;
  lot_id: string;

  quantity_total: number;
  quantity_reserved: number;
  quantity_available: number;
  unit_cost: number;

  product: Product | null;
  warehouse: Warehouse | null;
  lot: Lot | null;
};

type Dispatch = {
  id: string;
  dispatch_number: string;
  dispatch_date: string;
  reason: string;
  destination: string | null;
  reference: string | null;
  observations: string | null;
  dispatched_by: string;
  total_quantity: number;
  created_at: string;
};

type FormItem = {
  balance_id: string;
  quantity: string;
};

function today() {
  const date =
    new Date();

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      "0",
    );

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      "0",
    );

  return `${year}-${month}-${day}`;
}

function number(
  value: number,
) {
  return new Intl.NumberFormat(
    "es-CO",
    {
      maximumFractionDigits: 2,
    },
  ).format(
    value,
  );
}

export default function SalidasPage() {
  const {
    session,
  } = useAuth();

  const [
    balances,
    setBalances,
  ] =
    useState<Balance[]>(
      [],
    );

  const [
    dispatches,
    setDispatches,
  ] =
    useState<Dispatch[]>(
      [],
    );

  const [
    dispatchDate,
    setDispatchDate,
  ] =
    useState(
      today(),
    );

  const [
    reason,
    setReason,
  ] =
    useState("");

  const [
    destination,
    setDestination,
  ] =
    useState("");

  const [
    reference,
    setReference,
  ] =
    useState("");

  const [
    observations,
    setObservations,
  ] =
    useState("");

  const [
    items,
    setItems,
  ] =
    useState<FormItem[]>([
      {
        balance_id: "",
        quantity: "",
      },
    ]);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const responsible =
    String(
      session?.user
        ?.user_metadata
        ?.full_name ??
        session?.user
          ?.user_metadata
          ?.name ??
        session?.user
          ?.email ??
        "Usuario CLAP",
    ).trim();


  const loadData =
    useCallback(
      async () => {
        if (
          !session?.access_token
        ) {
          return;
        }

        setIsLoading(
          true,
        );

        setErrorMessage(
          "",
        );

        try {
          const response =
            await fetch(
              "/api/abastecimiento-logistica/inventarios/salidas",
              {
                headers: {
                  Authorization:
                    `Bearer ${session.access_token}`,
                },

                cache:
                  "no-store",
              },
            );

          const payload =
            await response.json();

          if (
            !response.ok
          ) {
            throw new Error(
              payload?.error ||
                "No se pudieron cargar las salidas.",
            );
          }

          setBalances(
            payload.balances ??
              [],
          );

          setDispatches(
            payload.dispatches ??
              [],
          );
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar las salidas.",
          );
        } finally {
          setIsLoading(
            false,
          );
        }
      },
      [
        session?.access_token,
      ],
    );

  useEffect(() => {
    void loadData();
  }, [loadData]);


  const selectedIds =
    useMemo(
      () =>
        new Set(
          items
            .map(
              (item) =>
                item.balance_id,
            )
            .filter(Boolean),
        ),
      [items],
    );


  function addItem() {
    setItems(
      (current) => [
        ...current,
        {
          balance_id: "",
          quantity: "",
        },
      ],
    );
  }


  function removeItem(
    index: number,
  ) {
    setItems(
      (current) => {
        if (
          current.length ===
          1
        ) {
          return [
            {
              balance_id: "",
              quantity: "",
            },
          ];
        }

        return current.filter(
          (
            _,
            itemIndex,
          ) =>
            itemIndex !==
            index,
        );
      },
    );
  }


  function updateItem(
    index: number,
    field:
      | "balance_id"
      | "quantity",
    value: string,
  ) {
    setItems(
      (current) =>
        current.map(
          (
            item,
            itemIndex,
          ) =>
            itemIndex ===
            index
              ? {
                  ...item,
                  [field]:
                    value,
                }
              : item,
        ),
    );
  }


  async function registerDispatch() {
    if (
      !session?.access_token
    ) {
      return;
    }

    if (
      !reason.trim()
    ) {
      alert(
        "Debes indicar el motivo de la salida.",
      );

      return;
    }

    const cleanItems =
      items.filter(
        (item) =>
          item.balance_id &&
          Number(
            item.quantity,
          ) > 0,
      );

    if (
      cleanItems.length ===
      0
    ) {
      alert(
        "Debes agregar al menos un producto y una cantidad.",
      );

      return;
    }

    const ids =
      cleanItems.map(
        (item) =>
          item.balance_id,
      );

    if (
      new Set(ids).size !==
      ids.length
    ) {
      alert(
        "No puedes repetir el mismo lote en una misma salida. Ajusta la cantidad en una sola fila.",
      );

      return;
    }

    for (
      const item of
      cleanItems
    ) {
      const balance =
        balances.find(
          (row) =>
            row.id ===
            item.balance_id,
        );

      const quantity =
        Number(
          item.quantity,
        );

      if (
        !balance
      ) {
        alert(
          "Una de las existencias seleccionadas ya no está disponible.",
        );

        return;
      }

      if (
        quantity >
        balance.quantity_available
      ) {
        alert(
          `No puedes sacar ${quantity} ${balance.product?.unit ?? ""}. El lote ${balance.lot?.lot_number ?? ""} tiene ${balance.quantity_available} disponibles.`,
        );

        return;
      }
    }

    setIsSaving(
      true,
    );

    try {
      const response =
        await fetch(
          "/api/abastecimiento-logistica/inventarios/salidas",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${session.access_token}`,
            },

            body:
              JSON.stringify({
                dispatch_date:
                  dispatchDate,

                reason:
                  reason.trim(),

                destination:
                  destination.trim(),

                reference:
                  reference.trim(),

                observations:
                  observations.trim(),

                dispatched_by:
                  responsible,

                items:
                  cleanItems.map(
                    (item) => ({
                      balance_id:
                        item.balance_id,

                      quantity:
                        Number(
                          item.quantity,
                        ),
                    }),
                  ),
              }),
          },
        );

      const payload =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          payload?.error ||
            "No se pudo registrar la salida.",
        );
      }

      alert(
        `Salida ${payload.data?.dispatch_number ?? ""} registrada correctamente.`,
      );

      setReason("");
      setDestination("");
      setReference("");
      setObservations("");

      setItems([
        {
          balance_id: "",
          quantity: "",
        },
      ]);

      await loadData();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No se pudo registrar la salida.",
      );
    } finally {
      setIsSaving(
        false,
      );
    }
  }


  return (
    <div className="space-y-8">

      <section>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
          Almacenes e Inventarios · Salidas
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-[#07076b]">
          Salidas de almacén
        </h1>

        <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
          Registra salidas de inventario utilizando las existencias y lotes internos disponibles en CLAP.
        </p>
      </section>


      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      )}


      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Información de la salida
        </h2>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

          <Field
            label="Fecha salida *"
          >
            <input
              type="date"
              value={
                dispatchDate
              }
              onChange={(
                event,
              ) =>
                setDispatchDate(
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
            />
          </Field>


          <Field
            label="Motivo *"
          >
            <input
              value={
                reason
              }
              onChange={(
                event,
              ) =>
                setReason(
                  event.target.value,
                )
              }
              placeholder="Ej. Consumo producción"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
            />
          </Field>


          <Field
            label="Destino"
          >
            <input
              value={
                destination
              }
              onChange={(
                event,
              ) =>
                setDestination(
                  event.target.value,
                )
              }
              placeholder="Área, proceso o tercero"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
            />
          </Field>


          <Field
            label="Referencia"
          >
            <input
              value={
                reference
              }
              onChange={(
                event,
              ) =>
                setReference(
                  event.target.value,
                )
              }
              placeholder="OP, solicitud, remisión..."
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
            />
          </Field>


          <Field
            label="Responsable"
          >
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              {responsible}
            </div>
          </Field>

        </div>


        <div className="mt-4">
          <Field
            label="Observaciones"
          >
            <textarea
              value={
                observations
              }
              onChange={(
                event,
              ) =>
                setObservations(
                  event.target.value,
                )
              }
              rows={3}
              placeholder="Información adicional de la salida..."
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
            />
          </Field>
        </div>
      </section>


      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">

        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Productos a retirar
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Solo aparecen lotes con cantidad disponible.
            </p>
          </div>

          <button
            type="button"
            onClick={
              addItem
            }
            className="rounded-xl bg-[#07076b] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Agregar producto
          </button>
        </div>


        {isLoading ? (
          <div className="py-14 text-center text-sm text-gray-500">
            Cargando existencias...
          </div>
        ) : balances.length ===
          0 ? (
          <div className="py-14 text-center text-sm text-gray-500">
            No existen cantidades disponibles para salida.
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full min-w-[1250px] text-left text-sm">

              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">
                    Producto / lote
                  </th>

                  <th className="px-4 py-3">
                    Almacén
                  </th>

                  <th className="px-4 py-3 text-right">
                    Disponible
                  </th>

                  <th className="px-4 py-3">
                    Cantidad salida
                  </th>

                  <th className="px-4 py-3">
                    Acción
                  </th>
                </tr>
              </thead>


              <tbody className="divide-y divide-gray-200">

                {items.map(
                  (
                    item,
                    index,
                  ) => {
                    const balance =
                      balances.find(
                        (row) =>
                          row.id ===
                          item.balance_id,
                      );

                    return (
                      <tr
                        key={
                          index
                        }
                      >

                        <td className="px-4 py-4">
                          <select
                            value={
                              item.balance_id
                            }
                            onChange={(
                              event,
                            ) =>
                              updateItem(
                                index,
                                "balance_id",
                                event.target.value,
                              )
                            }
                            className="w-full min-w-[420px] rounded-xl border border-gray-200 px-3 py-2.5"
                          >
                            <option value="">
                              Seleccionar existencia
                            </option>

                            {balances.map(
                              (
                                option,
                              ) => {
                                const alreadyUsed =
                                  selectedIds.has(
                                    option.id,
                                  ) &&
                                  option.id !==
                                    item.balance_id;

                                return (
                                  <option
                                    key={
                                      option.id
                                    }
                                    value={
                                      option.id
                                    }
                                    disabled={
                                      alreadyUsed
                                    }
                                  >
                                    {option.product?.final_code ??
                                      option.product?.reference ??
                                      "Sin código"}{" "}
                                    ·{" "}
                                    {option.product?.name ??
                                      "Producto"}{" "}
                                    ·{" "}
                                    {option.lot?.lot_number ??
                                      "Sin lote"}{" "}
                                    · Disponible{" "}
                                    {number(
                                      option.quantity_available,
                                    )}{" "}
                                    {option.product?.unit ??
                                      ""}
                                  </option>
                                );
                              },
                            )}
                          </select>
                        </td>


                        <td className="px-4 py-4 text-gray-700">
                          {balance?.warehouse
                            ? `${balance.warehouse.code} · ${balance.warehouse.name}`
                            : "—"}
                        </td>


                        <td className="px-4 py-4 text-right font-semibold text-emerald-700">
                          {balance
                            ? `${number(
                                balance.quantity_available,
                              )} ${balance.product?.unit ?? ""}`
                            : "—"}
                        </td>


                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={
                                item.quantity
                              }
                              onChange={(
                                event,
                              ) =>
                                updateItem(
                                  index,
                                  "quantity",
                                  event.target.value,
                                )
                              }
                              className="w-36 rounded-xl border border-gray-200 px-3 py-2.5"
                            />

                            <span className="text-sm text-gray-500">
                              {balance?.product?.unit ??
                                ""}
                            </span>
                          </div>
                        </td>


                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              removeItem(
                                index,
                              )
                            }
                            className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
                          >
                            Eliminar
                          </button>
                        </td>

                      </tr>
                    );
                  },
                )}

              </tbody>
            </table>
          </div>
        )}


        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={
              registerDispatch
            }
            disabled={
              isSaving ||
              isLoading
            }
            className="rounded-xl bg-[#07076b] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isSaving
              ? "Registrando..."
              : "Registrar salida"}
          </button>
        </div>

      </section>


      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">

        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Salidas registradas
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Últimos movimientos de salida realizados desde almacén.
          </p>
        </div>


        {dispatches.length ===
        0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            Aún no hay salidas registradas.
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full min-w-[1050px] text-left text-sm">

              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">
                    Salida
                  </th>

                  <th className="px-4 py-3">
                    Fecha
                  </th>

                  <th className="px-4 py-3">
                    Motivo
                  </th>

                  <th className="px-4 py-3">
                    Destino
                  </th>

                  <th className="px-4 py-3">
                    Referencia
                  </th>

                  <th className="px-4 py-3 text-right">
                    Cantidad
                  </th>

                  <th className="px-4 py-3">
                    Responsable
                  </th>
                </tr>
              </thead>


              <tbody className="divide-y divide-gray-200">

                {dispatches.map(
                  (
                    dispatch,
                  ) => (
                    <tr
                      key={
                        dispatch.id
                      }
                    >

                      <td className="px-4 py-4 font-bold text-[#07076b]">
                        <Link
                          href={`/abastecimiento-logistica/almacenes-inventarios/salidas/${dispatch.id}`}
                          className="hover:underline"
                        >
                          {dispatch.dispatch_number}
                        </Link>
                      </td>

                      <td className="px-4 py-4 text-gray-700">
                        {
                          dispatch.dispatch_date
                        }
                      </td>

                      <td className="px-4 py-4 text-gray-900">
                        {
                          dispatch.reason
                        }
                      </td>

                      <td className="px-4 py-4 text-gray-700">
                        {dispatch.destination ||
                          "—"}
                      </td>

                      <td className="px-4 py-4 text-gray-700">
                        {dispatch.reference ||
                          "—"}
                      </td>

                      <td className="px-4 py-4 text-right font-semibold text-gray-900">
                        {number(
                          dispatch.total_quantity,
                        )}
                      </td>

                      <td className="px-4 py-4 text-gray-700">
                        {
                          dispatch.dispatched_by
                        }
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


function Field({
  label,
  children,
}: {
  label: string;
  children:
    React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </span>

      {children}
    </label>
  );
}
