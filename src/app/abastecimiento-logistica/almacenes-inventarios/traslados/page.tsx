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
};

type Warehouse = {
  id: string;
  code: string;
  name: string;
  status: string;
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

type Transfer = {
  id: string;
  transfer_number: string;
  transfer_date: string;
  source_warehouse_id: string;
  destination_warehouse_id: string;
  reference: string | null;
  observations: string | null;
  transferred_by: string;
  total_quantity: number;
};

type FormItem = {
  balance_id: string;
  quantity: string;
};

function today() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function n(value: number) {
  return new Intl.NumberFormat(
    "es-CO",
    {
      maximumFractionDigits: 2,
    },
  ).format(value);
}

export default function TrasladosPage() {
  const { session } =
    useAuth();

  const [
    balances,
    setBalances,
  ] =
    useState<Balance[]>([]);

  const [
    warehouses,
    setWarehouses,
  ] =
    useState<Warehouse[]>([]);

  const [
    transfers,
    setTransfers,
  ] =
    useState<Transfer[]>([]);

  const [
    transferDate,
    setTransferDate,
  ] =
    useState(today());

  const [
    destinationWarehouseId,
    setDestinationWarehouseId,
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
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
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
    useCallback(async () => {
      if (
        !session?.access_token
      ) {
        return;
      }

      setLoading(true);
      setErrorMessage("");

      try {
        const response =
          await fetch(
            "/api/abastecimiento-logistica/inventarios/traslados",
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

        if (!response.ok) {
          throw new Error(
            payload?.error ||
              "No se pudieron cargar los traslados.",
          );
        }

        setBalances(
          (
            payload.balances ??
            []
          ).filter(
            (
              row: Balance,
            ) =>
              row.quantity_available >
              0,
          ),
        );

        setWarehouses(
          payload.warehouses ??
            [],
        );

        setTransfers(
          payload.transfers ??
            [],
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los traslados.",
        );
      } finally {
        setLoading(false);
      }
    }, [
      session?.access_token,
    ]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedBalances =
    useMemo(
      () =>
        items
          .map((item) =>
            balances.find(
              (balance) =>
                balance.id ===
                item.balance_id,
            ),
          )
          .filter(
            (
              row,
            ): row is Balance =>
              Boolean(row),
          ),
      [
        items,
        balances,
      ],
    );

  const sourceWarehouseId =
    selectedBalances[0]
      ?.warehouse_id ??
    "";

  const sourceWarehouse =
    warehouses.find(
      (warehouse) =>
        warehouse.id ===
        sourceWarehouseId,
    );

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
      (current) =>
        current.length === 1
          ? [
              {
                balance_id: "",
                quantity: "",
              },
            ]
          : current.filter(
              (
                _,
                itemIndex,
              ) =>
                itemIndex !==
                index,
            ),
    );
  }

  async function save() {
    if (
      !session?.access_token
    ) {
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
        "Debes agregar al menos un producto.",
      );

      return;
    }

    const selected =
      cleanItems.map(
        (item) =>
          balances.find(
            (balance) =>
              balance.id ===
              item.balance_id,
          ),
      );

    if (
      selected.some(
        (balance) =>
          !balance,
      )
    ) {
      alert(
        "Una existencia seleccionada ya no está disponible.",
      );

      return;
    }

    const origins =
      new Set(
        selected.map(
          (balance) =>
            balance
              ?.warehouse_id,
        ),
      );

    if (
      origins.size !== 1
    ) {
      alert(
        "Todos los productos de un traslado deben salir del mismo almacén.",
      );

      return;
    }

    if (
      !destinationWarehouseId
    ) {
      alert(
        "Debes seleccionar el almacén destino.",
      );

      return;
    }

    if (
      destinationWarehouseId ===
      selected[0]
        ?.warehouse_id
    ) {
      alert(
        "El almacén origen y destino no pueden ser el mismo.",
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

      if (
        balance &&
        Number(
          item.quantity,
        ) >
          balance.quantity_available
      ) {
        alert(
          `El lote ${balance.lot?.lot_number ?? ""} solo tiene ${balance.quantity_available} ${balance.product?.unit ?? ""} disponibles.`,
        );

        return;
      }
    }

    setSaving(true);

    try {
      const response =
        await fetch(
          "/api/abastecimiento-logistica/inventarios/traslados",
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
                transfer_date:
                  transferDate,

                destination_warehouse_id:
                  destinationWarehouseId,

                reference:
                  reference.trim(),

                observations:
                  observations.trim(),

                transferred_by:
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

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "No se pudo registrar el traslado.",
        );
      }

      alert(
        `Traslado ${payload.data?.transfer_number ?? ""} registrado correctamente.`,
      );

      setDestinationWarehouseId(
        "",
      );

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
          : "No se pudo registrar el traslado.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
          Almacenes e Inventarios · Traslados
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-[#07076b]">
          Traslados entre almacenes
        </h1>

        <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
          Mueve existencias entre almacenes conservando el mismo lote interno CLAP y toda su trazabilidad.
        </p>
      </section>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">
          Información del traslado
        </h2>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Fecha *">
            <input
              type="date"
              value={transferDate}
              onChange={(event) =>
                setTransferDate(
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-gray-200 px-4 py-3"
            />
          </Field>

          <Field label="Almacén origen">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
              {sourceWarehouse
                ? `${sourceWarehouse.code} · ${sourceWarehouse.name}`
                : "Se define al seleccionar la existencia"}
            </div>
          </Field>

          <Field label="Almacén destino *">
            <select
              value={
                destinationWarehouseId
              }
              onChange={(event) =>
                setDestinationWarehouseId(
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-gray-200 px-4 py-3"
            >
              <option value="">
                Seleccionar destino
              </option>

              {warehouses.map(
                (warehouse) => (
                  <option
                    key={
                      warehouse.id
                    }
                    value={
                      warehouse.id
                    }
                    disabled={
                      warehouse.id ===
                      sourceWarehouseId
                    }
                  >
                    {warehouse.code} · {warehouse.name}
                  </option>
                ),
              )}
            </select>
          </Field>

          <Field label="Referencia">
            <input
              value={reference}
              onChange={(event) =>
                setReference(
                  event.target.value,
                )
              }
              placeholder="OP, solicitud..."
              className="w-full rounded-xl border border-gray-200 px-4 py-3"
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Observaciones">
            <textarea
              rows={3}
              value={observations}
              onChange={(event) =>
                setObservations(
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-gray-200 px-4 py-3"
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              Productos a trasladar
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              El lote interno CLAP no cambia.
            </p>
          </div>

          <button
            type="button"
            onClick={addItem}
            className="rounded-xl bg-[#07076b] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Agregar producto
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-500">
            Cargando...
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full min-w-[1250px] text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">
                    Producto / lote
                  </th>

                  <th className="px-4 py-3">
                    Origen
                  </th>

                  <th className="px-4 py-3 text-right">
                    Disponible
                  </th>

                  <th className="px-4 py-3">
                    Cantidad
                  </th>

                  <th className="px-4 py-3">
                    Acción
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {items.map(
                  (
                    item,
                    index,
                  ) => {
                    const selected =
                      balances.find(
                        (balance) =>
                          balance.id ===
                          item.balance_id,
                      );

                    return (
                      <tr key={index}>
                        <td className="px-4 py-4">
                          <select
                            value={
                              item.balance_id
                            }
                            onChange={(event) =>
                              updateItem(
                                index,
                                "balance_id",
                                event.target.value,
                              )
                            }
                            className="w-full min-w-[430px] rounded-xl border border-gray-200 px-3 py-2.5"
                          >
                            <option value="">
                              Seleccionar existencia
                            </option>

                            {balances.map(
                              (balance) => (
                                <option
                                  key={
                                    balance.id
                                  }
                                  value={
                                    balance.id
                                  }
                                >
                                  {balance.product?.final_code ?? "Sin código"} · {balance.product?.name ?? "Producto"} · {balance.lot?.lot_number ?? "Sin lote"} · {balance.quantity_available} {balance.product?.unit ?? ""}
                                </option>
                              ),
                            )}
                          </select>
                        </td>

                        <td className="px-4 py-4">
                          {selected?.warehouse
                            ? `${selected.warehouse.code} · ${selected.warehouse.name}`
                            : "—"}
                        </td>

                        <td className="px-4 py-4 text-right font-semibold text-emerald-700">
                          {selected
                            ? `${n(selected.quantity_available)} ${selected.product?.unit ?? ""}`
                            : "—"}
                        </td>

                        <td className="px-4 py-4">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={
                              item.quantity
                            }
                            onChange={(event) =>
                              updateItem(
                                index,
                                "quantity",
                                event.target.value,
                              )
                            }
                            className="w-36 rounded-xl border border-gray-200 px-3 py-2.5"
                          />
                        </td>

                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              removeItem(
                                index,
                              )
                            }
                            className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
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
            disabled={
              loading ||
              saving
            }
            onClick={save}
            className="rounded-xl bg-[#07076b] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving
              ? "Registrando..."
              : "Registrar traslado"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">
          Traslados registrados
        </h2>

        {transfers.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">
            Aún no existen traslados.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">
                    Traslado
                  </th>

                  <th className="px-4 py-3">
                    Fecha
                  </th>

                  <th className="px-4 py-3">
                    Origen
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

              <tbody className="divide-y">
                {transfers.map(
                  (transfer) => {
                    const source =
                      warehouses.find(
                        (warehouse) =>
                          warehouse.id ===
                          transfer.source_warehouse_id,
                      );

                    const destination =
                      warehouses.find(
                        (warehouse) =>
                          warehouse.id ===
                          transfer.destination_warehouse_id,
                      );

                    return (
                      <tr key={transfer.id}>
                        <td className="px-4 py-4 font-bold text-[#07076b]">
                          <Link
                            href={`/abastecimiento-logistica/almacenes-inventarios/traslados/${transfer.id}`}
                            className="hover:underline"
                          >
                            {transfer.transfer_number}
                          </Link>
                        </td>

                        <td className="px-4 py-4">
                          {transfer.transfer_date}
                        </td>

                        <td className="px-4 py-4">
                          {source
                            ? `${source.code} · ${source.name}`
                            : "—"}
                        </td>

                        <td className="px-4 py-4">
                          {destination
                            ? `${destination.code} · ${destination.name}`
                            : "—"}
                        </td>

                        <td className="px-4 py-4">
                          {transfer.reference ||
                            "—"}
                        </td>

                        <td className="px-4 py-4 text-right font-semibold">
                          {n(
                            Number(
                              transfer.total_quantity ||
                                0,
                            ),
                          )}
                        </td>

                        <td className="px-4 py-4">
                          {transfer.transferred_by}
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
