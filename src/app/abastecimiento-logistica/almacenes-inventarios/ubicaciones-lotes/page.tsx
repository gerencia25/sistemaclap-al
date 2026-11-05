"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/components/auth/AuthProvider";

type Warehouse = {
  id: string;
  code: string;
  name: string;
  location: string | null;
  status: string;
  created_at: string | null;
};

type Product = {
  id: string;
  final_code: string | null;
  reference: string | null;
  name: string;
  unit: string | null;
  status: string | null;
};

type Lot = {
  id: string;
  lot_number: string;
  item_id: string | null;
  warehouse_id: string | null;
  origin_type: string | null;
  origin_reference: string | null;
  supplier_name: string | null;
  manufacturing_date: string | null;
  expiration_date: string | null;
  status: string;
  notes: string | null;
  created_at: string | null;

  product: Product | null;
  warehouse: Warehouse | null;
};

type Summary = {
  warehouses: number;
  activeWarehouses: number;
  lots: number;
  activeLots: number;
};

const emptySummary: Summary = {
  warehouses: 0,
  activeWarehouses: 0,
  lots: 0,
  activeLots: 0,
};

export default function UbicacionesLotesPage() {
  const {
    session,
    hasPermission,
  } = useAuth();

  const canManage =
    hasPermission(
      "ALMACEN_LOCATIONS_MANAGE",
    );

  const [
    warehouses,
    setWarehouses,
  ] = useState<Warehouse[]>([]);

  const [
    lots,
    setLots,
  ] = useState<Lot[]>([]);

  const [
    summary,
    setSummary,
  ] = useState<Summary>(
    emptySummary,
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    editingWarehouse,
    setEditingWarehouse,
  ] = useState<Warehouse | null>(
    null,
  );

  const [
    code,
    setCode,
  ] = useState("");

  const [
    name,
    setName,
  ] = useState("");

  const [
    location,
    setLocation,
  ] = useState("");

  const [
    lotSearch,
    setLotSearch,
  ] = useState("");

  const inputClass =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#07076b] focus:ring-2 focus:ring-[#07076b]/10";

  // =======================================================
  // CARGA
  // =======================================================

  const loadData =
    useCallback(
      async () => {
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
              "/api/abastecimiento-logistica/inventarios/ubicaciones-lotes",
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
                "No se pudo cargar la información.",
            );
          }

          setWarehouses(
            payload.warehouses ??
              [],
          );

          setLots(
            payload.lots ?? [],
          );

          setSummary(
            payload.summary ??
              emptySummary,
          );
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "No se pudo cargar la información.",
          );
        } finally {
          setIsLoading(false);
        }
      },
      [
        session?.access_token,
      ],
    );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // =======================================================
  // FORMULARIO
  // =======================================================

  function clearForm() {
    setEditingWarehouse(null);
    setCode("");
    setName("");
    setLocation("");
  }

  function startEditing(
    warehouse: Warehouse,
  ) {
    setEditingWarehouse(
      warehouse,
    );

    setCode(
      warehouse.code,
    );

    setName(
      warehouse.name,
    );

    setLocation(
      warehouse.location ??
        "",
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveWarehouse() {
    if (
      !session?.access_token
    ) {
      return;
    }

    if (
      !code.trim() ||
      !name.trim()
    ) {
      alert(
        "Código y nombre son obligatorios.",
      );

      return;
    }

    setIsSaving(true);

    try {
      const response =
        await fetch(
          "/api/abastecimiento-logistica/inventarios/ubicaciones-lotes",
          {
            method:
              editingWarehouse
                ? "PATCH"
                : "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${session.access_token}`,
            },

            body:
              JSON.stringify({
                id:
                  editingWarehouse?.id,

                code:
                  code.trim(),

                name:
                  name.trim(),

                location:
                  location.trim(),

                status:
                  editingWarehouse?.status ??
                  "Activo",
              }),
          },
        );

      const payload =
        await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "No se pudo guardar el almacén.",
        );
      }

      clearForm();

      await loadData();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el almacén.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleWarehouseStatus(
    warehouse: Warehouse,
  ) {
    if (
      !session?.access_token
    ) {
      return;
    }

    const nextStatus =
      warehouse.status ===
      "Activo"
        ? "Inactivo"
        : "Activo";

    const confirmed =
      window.confirm(
        nextStatus ===
          "Inactivo"
          ? `¿Deseas inactivar el almacén ${warehouse.code} · ${warehouse.name}?`
          : `¿Deseas activar el almacén ${warehouse.code} · ${warehouse.name}?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      const response =
        await fetch(
          "/api/abastecimiento-logistica/inventarios/ubicaciones-lotes",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${session.access_token}`,
            },

            body:
              JSON.stringify({
                id:
                  warehouse.id,

                code:
                  warehouse.code,

                name:
                  warehouse.name,

                location:
                  warehouse.location ??
                  "",

                status:
                  nextStatus,
              }),
          },
        );

      const payload =
        await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "No se pudo cambiar el estado del almacén.",
        );
      }

      await loadData();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No se pudo cambiar el estado del almacén.",
      );
    }
  }

  // =======================================================
  // FILTRO LOTES
  // =======================================================

  const filteredLots =
    useMemo(() => {
      const search =
        lotSearch
          .trim()
          .toLowerCase();

      if (!search) {
        return lots;
      }

      return lots.filter(
        (lot) => {
          const text = [
            lot.lot_number,
            lot.product?.final_code,
            lot.product?.reference,
            lot.product?.name,
            lot.warehouse?.code,
            lot.warehouse?.name,
            lot.origin_reference,
            lot.supplier_name,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return text.includes(
            search,
          );
        },
      );
    }, [
      lots,
      lotSearch,
    ]);

  return (
    <div className="space-y-8">
      <section>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
          Almacenes e Inventarios · Almacenes / lotes
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-[#07076b]">
          Almacenes / lotes
        </h1>

        <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
          Administra los almacenes utilizados por el inventario y consulta los lotes internos generados por los movimientos.
        </p>
      </section>

      {errorMessage && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </section>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Almacenes
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            {summary.warehouses}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Almacenes activos
          </p>

          <p className="mt-2 text-2xl font-bold text-emerald-700">
            {summary.activeWarehouses}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Lotes
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            {summary.lots}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Lotes activos
          </p>

          <p className="mt-2 text-2xl font-bold text-[#07076b]">
            {summary.activeLots}
          </p>
        </div>
      </section>

      {canManage && (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {editingWarehouse
                  ? "Editar almacén"
                  : "Nuevo almacén"}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Define el código, nombre y ubicación física general.
              </p>
            </div>

            {editingWarehouse && (
              <button
                type="button"
                onClick={
                  clearForm
                }
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar edición
              </button>
            )}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Código *
              </label>

              <input
                value={code}
                onChange={(
                  event,
                ) =>
                  setCode(
                    event.target.value,
                  )
                }
                placeholder="MP"
                className={
                  inputClass
                }
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Nombre *
              </label>

              <input
                value={name}
                onChange={(
                  event,
                ) =>
                  setName(
                    event.target.value,
                  )
                }
                placeholder="Materias Primas"
                className={
                  inputClass
                }
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Ubicación
              </label>

              <input
                value={location}
                onChange={(
                  event,
                ) =>
                  setLocation(
                    event.target.value,
                  )
                }
                placeholder="Planta principal"
                className={
                  inputClass
                }
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={
                saveWarehouse
              }
              disabled={
                isSaving
              }
              className="rounded-xl bg-[#07076b] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving
                ? "Guardando..."
                : editingWarehouse
                  ? "Guardar cambios"
                  : "Crear almacén"}
            </button>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            Almacenes
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Almacenes disponibles para entradas, salidas y control de inventario.
          </p>
        </div>

        {isLoading ? (
          <div className="py-10 text-center text-sm text-gray-500">
            Cargando almacenes...
          </div>
        ) : warehouses.length ===
          0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
            No existen almacenes registrados.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">
                    Código
                  </th>

                  <th className="px-4 py-3">
                    Nombre
                  </th>

                  <th className="px-4 py-3">
                    Ubicación
                  </th>

                  <th className="px-4 py-3">
                    Estado
                  </th>

                  {canManage && (
                    <th className="px-4 py-3">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {warehouses.map(
                  (warehouse) => (
                    <tr
                      key={
                        warehouse.id
                      }
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-4 font-semibold text-[#07076b]">
                        {warehouse.code}
                      </td>

                      <td className="px-4 py-4 font-medium text-gray-900">
                        {warehouse.name}
                      </td>

                      <td className="px-4 py-4 text-gray-600">
                        {warehouse.location ||
                          "—"}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            warehouse.status ===
                            "Activo"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {warehouse.status}
                        </span>
                      </td>

                      {canManage && (
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                startEditing(
                                  warehouse,
                                )
                              }
                              className="rounded-lg bg-[#07076b]/10 px-3 py-2 text-xs font-medium text-[#07076b] hover:bg-[#07076b]/20"
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                toggleWarehouseStatus(
                                  warehouse,
                                )
                              }
                              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              {warehouse.status ===
                              "Activo"
                                ? "Inactivar"
                                : "Activar"}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Lotes
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Lotes internos creados automáticamente por los movimientos de inventario.
            </p>
          </div>

          <input
            value={
              lotSearch
            }
            onChange={(
              event,
            ) =>
              setLotSearch(
                event.target.value,
              )
            }
            placeholder="Buscar lote, producto, almacén..."
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-[#07076b] md:max-w-md"
          />
        </div>

        {filteredLots.length ===
        0 ? (
          <div className="py-12 text-center">
            <p className="font-medium text-gray-700">
              Sin lotes registrados
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Los lotes aparecerán aquí cuando registres entradas de inventario.
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">
                    Lote
                  </th>

                  <th className="px-4 py-3">
                    Producto
                  </th>

                  <th className="px-4 py-3">
                    Almacén
                  </th>

                  <th className="px-4 py-3">
                    Origen
                  </th>

                  <th className="px-4 py-3">
                    Proveedor
                  </th>

                  <th className="px-4 py-3">
                    Vencimiento
                  </th>

                  <th className="px-4 py-3">
                    Estado
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filteredLots.map(
                  (lot) => (
                    <tr
                      key={lot.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-4 font-semibold text-[#07076b]">
                        {lot.lot_number}
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-900">
                          {lot.product?.name ||
                            "—"}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {lot.product?.final_code ||
                            lot.product?.reference ||
                            ""}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-gray-700">
                        {lot.warehouse
                          ? `${lot.warehouse.code} · ${lot.warehouse.name}`
                          : "—"}
                      </td>

                      <td className="px-4 py-4 text-gray-600">
                        {lot.origin_reference
                          ? `${lot.origin_type || "Movimiento"} · ${lot.origin_reference}`
                          : lot.origin_type ||
                            "—"}
                      </td>

                      <td className="px-4 py-4 text-gray-600">
                        {lot.supplier_name ||
                          "—"}
                      </td>

                      <td className="px-4 py-4 text-gray-600">
                        {lot.expiration_date ||
                          "—"}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            lot.status ===
                            "Activo"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {lot.status}
                        </span>
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
