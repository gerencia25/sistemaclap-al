"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type ItemCodeRequest = {
  id: string;
  request_number: string;
  requester_area: string;
  requester_name: string;
  requester_position: string;
  requester_email: string | null;
  request_type: string;
  request_category: string;
  classification_code: string;
  classification_name: string | null;
  product_code_to_deactivate: string | null;
  product_name_to_deactivate: string | null;
  detailed_description: string;
  attachment_url: string | null;
  attachment_filename: string | null;
  status: string;
  created_product_id: string | null;
  created_product_code: string | null;
  created_product_name: string | null;
  requested_at: string | null;
  completed_at: string | null;
  comments: string | null;
};

export default function CreacionCodigoPage() {
  const [requests, setRequests] = useState<ItemCodeRequest[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] =
    useState<ItemCodeRequest | null>(null);

  const inputClassName =
    "w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#07076b] focus:ring-2 focus:ring-[#07076b]/10";

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("item_code_requests")
      .select("*")
      .order("requested_at", { ascending: false });

    if (error) {
      alert(`Error cargando solicitudes: ${error.message}`);
      setIsLoading(false);
      return;
    }

    setRequests((data ?? []) as ItemCodeRequest[]);
    setIsLoading(false);
  }

  const filteredRequests = useMemo(() => {
    const term = search.toLowerCase().trim();

    return requests.filter((request) => {
      const matchesStatus =
        statusFilter === "Todos" || request.status === statusFilter;

      const matchesSearch =
        !term ||
        [
          request.request_number,
          request.requester_area,
          request.requester_name,
          request.request_type,
          request.request_category,
          request.classification_code,
          request.classification_name ?? "",
          request.product_code_to_deactivate ?? "",
          request.product_name_to_deactivate ?? "",
          request.detailed_description,
          request.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);

      return matchesStatus && matchesSearch;
    });
  }, [requests, search, statusFilter]);

  function formatDate(value: string | null) {
    if (!value) return "N/A";

    return new Intl.DateTimeFormat("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  function getStatusClassName(status: string) {
    if (status === "Pendiente") {
      return "bg-amber-50 text-amber-700";
    }

    if (status === "En revisión") {
      return "bg-blue-50 text-blue-700";
    }

    if (status === "Creado" || status === "Desactivado") {
      return "bg-emerald-50 text-emerald-700";
    }

    if (status === "Rechazado") {
      return "bg-red-50 text-red-700";
    }

    return "bg-gray-100 text-gray-600";
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Configuración · Codificación
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
            Creación de código
          </h1>

          <p className="mt-3 max-w-4xl text-base leading-7 text-gray-600">
            Gestiona las solicitudes de creación o desactivación de códigos,
            revisa pendientes y controla el historial del proceso.
          </p>
        </div>

        <Link
          href="/configuracion/codificacion/base-datos-productos"
          className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:opacity-95"
        >
          Crear nuevo código
        </Link>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-4">
        <SummaryCard
          title="Total solicitudes"
          value={requests.length}
          tone="default"
        />
        <SummaryCard
          title="Pendientes"
          value={requests.filter((item) => item.status === "Pendiente").length}
          tone="warning"
        />
        <SummaryCard
          title="En revisión"
          value={
            requests.filter((item) => item.status === "En revisión").length
          }
          tone="info"
        />
        <SummaryCard
          title="Cerradas"
          value={
            requests.filter((item) =>
              ["Creado", "Desactivado", "Rechazado"].includes(item.status),
            ).length
          }
          tone="success"
        />
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Historial de solicitudes
          </h2>

          <div className="flex flex-col gap-3 md:flex-row">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={`${inputClassName} md:w-48`}
            >
              <option value="Todos">Todos</option>
              <option value="Pendiente">Pendiente</option>
              <option value="En revisión">En revisión</option>
              <option value="Creado">Creado</option>
              <option value="Desactivado">Desactivado</option>
              <option value="Rechazado">Rechazado</option>
            </select>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar solicitud, solicitante, clasificación..."
              className={`${inputClassName} md:w-96`}
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Consecutivo</th>
                <th className="px-4 py-3">Fecha solicitud</th>
                <th className="px-4 py-3">Solicitante</th>
                <th className="px-4 py-3">Área</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Clasificación</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Código creado</th>
                <th className="px-4 py-3">Fecha creación</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {isLoading && (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    Cargando solicitudes...
                  </td>
                </tr>
              )}

              {!isLoading &&
                filteredRequests.map((request) => (
                  <tr key={request.id} className="transition hover:bg-gray-50">
                    <td className="px-4 py-4 font-semibold text-[#07076b]">
                      {request.request_number}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {formatDate(request.requested_at)}
                    </td>

                    <td className="px-4 py-4 font-medium text-gray-900">
                      {request.requester_name}
                      <p className="mt-1 text-xs font-normal text-gray-500">
                        {request.requester_position}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {request.requester_area}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {request.request_type}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {request.request_category}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {request.classification_code}
                      {request.classification_name && (
                        <p className="mt-1 text-xs text-gray-500">
                          {request.classification_name}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClassName(
                          request.status,
                        )}`}
                      >
                        {request.status}
                      </span>
                    </td>

                    <td className="px-4 py-4">
  {request.created_product_code ? (
    <>
      <p className="font-medium text-gray-800">
        {request.created_product_code}
      </p>

      {request.created_product_name && (
        <p className="mt-1 text-xs text-gray-500">
          {request.created_product_name}
        </p>
      )}
    </>
  ) : (
    <span className="text-gray-500">N/A</span>
  )}
</td>

<td className="px-4 py-4 text-gray-600">
  {request.completed_at
    ? formatDate(request.completed_at)
    : "N/A"}
</td>

                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="rounded-lg bg-[#07076b]/10 px-3 py-2 text-xs font-medium text-[#07076b] transition hover:bg-[#07076b]/20"
                        >
                          Ver
                        </button>

                        {request.status === "Pendiente" && (
                          <Link
                            href={`/configuracion/productos?requestId=${request.id}`}
                            className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                          >
                            Crear código
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

              {!isLoading && filteredRequests.length === 0 && (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    No se encontraron solicitudes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
                  Solicitud de código
                </p>

                <h2 className="text-2xl font-bold text-[#07076b]">
                  {selectedRequest.request_number}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Registrada el {formatDate(selectedRequest.requested_at)}
                </p>
              </div>

              <button
                onClick={() => setSelectedRequest(null)}
                className="rounded-full px-3 py-1 text-2xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                aria-label="Cerrar modal"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              <DetailSection title="Información del solicitante">
                <DetailItem label="Área" value={selectedRequest.requester_area} />
                <DetailItem
                  label="Nombre"
                  value={selectedRequest.requester_name}
                />
                <DetailItem
                  label="Cargo"
                  value={selectedRequest.requester_position}
                />
                <DetailItem
                  label="Correo"
                  value={selectedRequest.requester_email || "N/A"}
                />
              </DetailSection>

              <DetailSection title="Solicitud">
                <DetailItem label="Tipo" value={selectedRequest.request_type} />
                <DetailItem
                  label="Categoría"
                  value={selectedRequest.request_category}
                />
                <DetailItem
                  label="Clasificación"
                  value={`${selectedRequest.classification_code} - ${
                    selectedRequest.classification_name || ""
                  }`}
                />
                <DetailItem label="Estado" value={selectedRequest.status} />
              </DetailSection>

              {selectedRequest.request_type === "Desactivación" && (
                <DetailSection title="Código a desactivar">
                  <DetailItem
                    label="Código"
                    value={selectedRequest.product_code_to_deactivate || "N/A"}
                  />
                  <DetailItem
                    label="Nombre"
                    value={selectedRequest.product_name_to_deactivate || "N/A"}
                  />
                </DetailSection>
              )}

              <section className="rounded-2xl border border-gray-200 bg-white p-5">
                <h3 className="mb-3 text-lg font-semibold text-[#07076b]">
                  Descripción detallada
                </h3>

                <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
                  {selectedRequest.detailed_description}
                </p>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-5">
                <h3 className="mb-3 text-lg font-semibold text-[#07076b]">
                  Adjuntos
                </h3>

                {selectedRequest.attachment_url ? (
                  <a
                    href={selectedRequest.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-[#07076b] underline"
                  >
                    {selectedRequest.attachment_filename || "Ver adjunto"}
                  </a>
                ) : (
                  <p className="text-sm text-gray-500">
                    Esta solicitud no tiene adjuntos.
                  </p>
                )}
              </section>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-6">
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                >
                  Cerrar
                </button>

                {selectedRequest.status === "Pendiente" && (
                  <Link
                    href={`/configuracion/productos?requestId=${selectedRequest.id}`}
                    className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95"
                  >
                    Crear código
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: number;
  tone: "default" | "warning" | "info" | "success";
}) {
  const toneClassName = {
    default: "bg-white text-[#07076b]",
    warning: "bg-amber-50 text-amber-700",
    info: "bg-blue-50 text-blue-700",
    success: "bg-emerald-50 text-emerald-700",
  }[tone];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className={`mt-3 text-3xl font-bold ${toneClassName}`}>{value}</p>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
      <h3 className="mb-4 text-lg font-semibold text-[#07076b]">{title}</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-gray-800">{value}</p>
    </div>
  );
}