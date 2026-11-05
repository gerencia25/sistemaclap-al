"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useAuth } from "@/components/auth/AuthProvider";

type Reception = {
  id: string;
  receipt_number: string;
  purchase_order_number: string | null;
  supplier_name: string;
  receipt_date: string;
  supplier_invoice_number: string | null;
  supplier_remission_number: string | null;
  total: number;
  receipt_mode: string;
  authorization_reference: string | null;
  received_by: string | null;
  created_at: string | null;
  status: string;
};

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  const [year, month, day] =
    value.slice(0, 10).split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

export default function RecepcionesPage() {
  const {
    session,
  } = useAuth();

  const [
    receptions,
    setReceptions,
  ] = useState<Reception[]>([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const loadReceptions =
    useCallback(async () => {
      if (!session?.access_token) {
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const response =
          await fetch(
            "/api/abastecimiento-logistica/inventarios/recepciones/listado",
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
              "No se pudieron cargar las recepciones.",
          );
        }

        setReceptions(
          payload.data ?? [],
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las recepciones.",
        );
      } finally {
        setIsLoading(false);
      }
    }, [
      session?.access_token,
    ]);

  useEffect(() => {
    void loadReceptions();
  }, [loadReceptions]);

  function getStatusClass(
    status: string,
  ) {
    if (
      status === "Recibido"
    ) {
      return "bg-emerald-50 text-emerald-700";
    }

    if (
      status === "Parcial"
    ) {
      return "bg-blue-50 text-blue-700";
    }

    return "bg-gray-100 text-gray-700";
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Almacenes e Inventarios · Recepciones
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
            Recepciones de inventario
          </h1>

          <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
            Consulta las entradas registradas desde órdenes de compra
            o mediante entradas directas.
          </p>
        </div>

        <Link
          href="/abastecimiento-logistica/recepciones/nueva"
          className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:opacity-95"
        >
          Nueva recepción
        </Link>
      </section>

      {errorMessage && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700">
            {errorMessage}
          </p>
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            Recepciones registradas
          </h2>

          {!isLoading && (
            <p className="mt-1 text-sm text-gray-500">
              {receptions.length} recepción
              {receptions.length === 1
                ? ""
                : "es"}
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="py-14 text-center text-sm text-gray-500">
            Cargando recepciones...
          </div>
        ) : receptions.length === 0 ? (
          <div className="py-14 text-center">
            <p className="font-semibold text-gray-900">
              No hay recepciones registradas.
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Las nuevas entradas aparecerán aquí automáticamente.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full min-w-[1150px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">
                    Recepción
                  </th>

                  <th className="px-4 py-3">
                    Origen
                  </th>

                  <th className="px-4 py-3">
                    Proveedor
                  </th>

                  <th className="px-4 py-3">
                    Fecha
                  </th>

                  <th className="px-4 py-3">
                    Factura
                  </th>

                  <th className="px-4 py-3">
                    Referencia
                  </th>

                  <th className="px-4 py-3">
                    Total
                  </th>

                  <th className="px-4 py-3">
                    Estado
                  </th>

                  <th className="px-4 py-3">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {receptions.map(
                  (reception) => (
                    <tr
                      key={
                        reception.id
                      }
                      className="transition hover:bg-gray-50"
                    >
                      <td className="px-4 py-4">
                        <p className="font-bold text-[#07076b]">
                          {
                            reception.receipt_number
                          }
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {
                            reception.receipt_mode
                          }
                        </p>
                      </td>

                      <td className="px-4 py-4 text-gray-700">
                        {reception.purchase_order_number ||
                          "Entrada directa"}
                      </td>

                      <td className="px-4 py-4 font-medium text-gray-900">
                        {
                          reception.supplier_name
                        }
                      </td>

                      <td className="px-4 py-4 text-gray-600">
                        {formatDate(
                          reception.receipt_date,
                        )}
                      </td>

                      <td className="px-4 py-4 text-gray-700">
                        {reception.supplier_invoice_number ||
                          "—"}
                      </td>

                      <td className="px-4 py-4 text-gray-700">
                        {reception.authorization_reference ||
                          "—"}
                      </td>

                      <td className="px-4 py-4 font-semibold text-gray-900">
                        $
                        {Number(
                          reception.total ||
                            0,
                        ).toLocaleString(
                          "es-CO",
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                            reception.status,
                          )}`}
                        >
                          {
                            reception.status
                          }
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <Link
                          href={`/abastecimiento-logistica/recepciones/${reception.id}`}
                          className="inline-flex rounded-lg bg-[#07076b]/10 px-3 py-2 text-xs font-medium text-[#07076b] transition hover:bg-[#07076b]/20"
                        >
                          Ver detalle
                        </Link>
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
