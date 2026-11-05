"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
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
};

type Lot = {
  id: string;
  lot_number: string;
};

type Balance = {
  id: string;
  quantity_total: number;
  quantity_reserved: number;
  quantity_available: number;

  product: Product | null;
  warehouse: Warehouse | null;
  lot: Lot | null;
};

type Adjustment = {
  id: string;
  adjustment_number: string;
  adjustment_date: string;
  reason: string;
  reference: string | null;
  observations: string | null;
  adjusted_by: string;
};

type FormItem = {
  balance_id: string;
  type:
    | "positive"
    | "negative";
  quantity: string;
};

function today() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

export default function AjustesPage() {
  const { session } =
    useAuth();

  const [
    balances,
    setBalances,
  ] =
    useState<Balance[]>([]);

  const [
    adjustments,
    setAdjustments,
  ] =
    useState<Adjustment[]>([]);

  const [
    adjustmentDate,
    setAdjustmentDate,
  ] =
    useState(today());

  const [
    reason,
    setReason,
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
        type:
          "positive",
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
            "/api/abastecimiento-logistica/inventarios/ajustes",
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
              "No se pudieron cargar los ajustes.",
          );
        }

        setBalances(
          payload.balances ??
            [],
        );

        setAdjustments(
          payload.adjustments ??
            [],
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los ajustes.",
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

  function updateItem(
    index: number,
    field:
      | "balance_id"
      | "type"
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
                } as FormItem
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
          type:
            "positive",
          quantity: "",
        },
      ],
    );
  }

  async function save() {
    if (
      !session?.access_token
    ) {
      return;
    }

    if (!reason.trim()) {
      alert(
        "El motivo del ajuste es obligatorio.",
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
        "Debes agregar al menos un producto.",
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

      if (!balance) {
        alert(
          "Una existencia seleccionada ya no existe.",
        );

        return;
      }

      if (
        item.type ===
          "negative" &&
        Number(
          item.quantity,
        ) >
          balance.quantity_available
      ) {
        alert(
          `El ajuste negativo supera el disponible del lote ${balance.lot?.lot_number ?? ""}.`,
        );

        return;
      }
    }

    setSaving(true);

    try {
      const response =
        await fetch(
          "/api/abastecimiento-logistica/inventarios/ajustes",
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
                adjustment_date:
                  adjustmentDate,

                reason:
                  reason.trim(),

                reference:
                  reference.trim(),

                observations:
                  observations.trim(),

                adjusted_by:
                  responsible,

                items:
                  cleanItems.map(
                    (item) => ({
                      balance_id:
                        item.balance_id,

                      quantity_adjustment:
                        (
                          item.type ===
                          "negative"
                            ? -1
                            : 1
                        ) *
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
            "No se pudo registrar el ajuste.",
        );
      }

      alert(
        `Ajuste ${payload.data?.adjustment_number ?? ""} registrado correctamente.`,
      );

      setReason("");
      setReference("");
      setObservations("");

      setItems([
        {
          balance_id: "",
          type:
            "positive",
          quantity: "",
        },
      ]);

      await loadData();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No se pudo registrar el ajuste.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
          Almacenes e Inventarios · Ajustes
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-[#07076b]">
          Ajustes de inventario
        </h1>

        <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
          Registra diferencias justificadas de inventario sin editar directamente las existencias.
        </p>
      </section>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">
          Información del ajuste
        </h2>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Fecha *">
            <input
              type="date"
              value={adjustmentDate}
              onChange={(event) =>
                setAdjustmentDate(
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-gray-200 px-4 py-3"
            />
          </Field>

          <Field label="Motivo *">
            <input
              value={reason}
              onChange={(event) =>
                setReason(
                  event.target.value,
                )
              }
              placeholder="Conteo físico, diferencia..."
              className="w-full rounded-xl border border-gray-200 px-4 py-3"
            />
          </Field>

          <Field label="Referencia">
            <input
              value={reference}
              onChange={(event) =>
                setReference(
                  event.target.value,
                )
              }
              placeholder="Acta, inventario..."
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
              Productos a ajustar
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Todo ajuste queda registrado en Kardex.
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
                    Almacén
                  </th>

                  <th className="px-4 py-3 text-right">
                    Disponible
                  </th>

                  <th className="px-4 py-3">
                    Tipo
                  </th>

                  <th className="px-4 py-3">
                    Cantidad
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
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
                              (option) => (
                                <option
                                  key={
                                    option.id
                                  }
                                  value={
                                    option.id
                                  }
                                >
                                  {option.product?.final_code ?? "Sin código"} · {option.product?.name ?? "Producto"} · {option.lot?.lot_number ?? "Sin lote"} · {option.quantity_available} {option.product?.unit ?? ""}
                                </option>
                              ),
                            )}
                          </select>
                        </td>

                        <td className="px-4 py-4">
                          {balance?.warehouse
                            ? `${balance.warehouse.code} · ${balance.warehouse.name}`
                            : "—"}
                        </td>

                        <td className="px-4 py-4 text-right font-semibold">
                          {balance
                            ? `${balance.quantity_available} ${balance.product?.unit ?? ""}`
                            : "—"}
                        </td>

                        <td className="px-4 py-4">
                          <select
                            value={
                              item.type
                            }
                            onChange={(event) =>
                              updateItem(
                                index,
                                "type",
                                event.target.value,
                              )
                            }
                            className="rounded-xl border border-gray-200 px-3 py-2.5"
                          >
                            <option value="positive">
                              Positivo (+)
                            </option>

                            <option value="negative">
                              Negativo (-)
                            </option>
                          </select>
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
              : "Registrar ajuste"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">
          Ajustes registrados
        </h2>

        {adjustments.length ===
        0 ? (
          <p className="py-10 text-center text-sm text-gray-500">
            Aún no existen ajustes.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[850px] text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">
                    Ajuste
                  </th>

                  <th className="px-4 py-3">
                    Fecha
                  </th>

                  <th className="px-4 py-3">
                    Motivo
                  </th>

                  <th className="px-4 py-3">
                    Referencia
                  </th>

                  <th className="px-4 py-3">
                    Responsable
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {adjustments.map(
                  (adjustment) => (
                    <tr key={adjustment.id}>
                      <td className="px-4 py-4 font-bold text-[#07076b]">
                        <Link
                          href={`/abastecimiento-logistica/almacenes-inventarios/ajustes/${adjustment.id}`}
                          className="hover:underline"
                        >
                          {adjustment.adjustment_number}
                        </Link>
                      </td>

                      <td className="px-4 py-4">
                        {adjustment.adjustment_date}
                      </td>

                      <td className="px-4 py-4">
                        {adjustment.reason}
                      </td>

                      <td className="px-4 py-4">
                        {adjustment.reference ||
                          "—"}
                      </td>

                      <td className="px-4 py-4">
                        {adjustment.adjusted_by}
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
