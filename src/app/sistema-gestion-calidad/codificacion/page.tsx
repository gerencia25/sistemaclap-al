"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

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
  product_id_to_deactivate: string | null;
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
  reviewed_at: string | null;
  completed_at: string | null;
  reviewed_by: string | null;
  comments: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
};

export default function CodificacionPage() {
  const { session, hasPermission } = useAuth();

  const canApprove = hasPermission("CODIFICACION_APPROVE");

  const [requests, setRequests] = useState<ItemCodeRequest[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedRequest, setSelectedRequest] =
    useState<ItemCodeRequest | null>(null);
  const [requestToReject, setRequestToReject] =
    useState<ItemCodeRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  useEffect(() => {
    if (!session?.access_token) return;

    fetchRequests();
  }, [session?.access_token]);

  async function fetchRequests() {
    if (!session?.access_token) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        "/api/sistema-gestion-calidad/codificacion/solicitudes",
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error || "No se pudieron cargar las solicitudes.",
        );
      }

      setRequests(payload.requests ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las solicitudes.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRejectRequest() {
    if (!requestToReject || !session?.access_token) return;

    const reason = rejectionReason.trim();

    if (!reason) {
      alert("Debes registrar el motivo del rechazo.");
      return;
    }

    setIsRejecting(true);

    try {
      const response = await fetch(
        "/api/sistema-gestion-calidad/codificacion/solicitudes/rechazar",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            request_id: requestToReject.id,
            rejection_reason: reason,
          }),
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error || "No se pudo rechazar la solicitud.",
        );
      }

      setRequestToReject(null);
      setRejectionReason("");
      setSelectedRequest(null);

      await fetchRequests();

      if (
        requestToReject.requester_email &&
        payload.email_sent === false
      ) {
        alert(
          "Solicitud rechazada correctamente, pero no se pudo enviar el correo de notificación.",
        );
      } else {
        alert("Solicitud rechazada correctamente.");
      }
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No se pudo rechazar la solicitud.",
      );
    } finally {
      setIsRejecting(false);
    }
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
          request.requester_position,
          request.request_type,
          request.request_category,
          request.classification_code,
          request.classification_name ?? "",
          request.product_code_to_deactivate ?? "",
          request.product_name_to_deactivate ?? "",
          request.created_product_code ?? "",
          request.created_product_name ?? "",
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
      <section>
        <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
          Codificación
        </h1>

        <p className="mt-3 max-w-4xl text-base leading-7 text-gray-600">
          Consulta y controla las solicitudes de creación y desactivación de
          códigos recibidas por el Sistema de Gestión de la Calidad.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
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
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Solicitudes de código
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Bandeja de solicitudes recibidas para revisión de SC.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#07076b] focus:ring-2 focus:ring-[#07076b]/10 md:w-48"
            >
              <option value="Todos">Todos</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Creado">Creado</option>
              <option value="Desactivado">Desactivado</option>
              <option value="Rechazado">Rechazado</option>
            </select>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar solicitud..."
              className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#07076b] focus:ring-2 focus:ring-[#07076b]/10 md:w-80"
            />
          </div>
        </div>

        {errorMessage && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Consecutivo</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Solicitante</th>
                <th className="px-4 py-3">Área</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Clasificación</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {isLoading && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-10 text-center text-gray-500"
                  >
                    Cargando solicitudes...
                  </td>
                </tr>
              )}

              {!isLoading &&
                filteredRequests.map((request) => (
                  <tr
                    key={request.id}
                    className="transition hover:bg-gray-50"
                  >
                    <td className="px-4 py-4 font-semibold text-[#07076b]">
                      {request.request_number}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {formatDate(request.requested_at)}
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-900">
                        {request.requester_name}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
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

                    <td className="px-4 py-4 text-gray-600">
                      {request.created_product_code ||
                        request.product_code_to_deactivate ||
                        "N/A"}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="rounded-lg bg-[#07076b]/10 px-3 py-2 text-xs font-medium text-[#07076b] transition hover:bg-[#07076b]/20"
                        >
                          Ver
                        </button>

                        {canApprove && request.status === "Pendiente" && (
                          <button
                            onClick={() => setRequestToReject(request)}
                            className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100"
                          >
                            Rechazar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

              {!isLoading && filteredRequests.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-10 text-center text-gray-500"
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
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
                  Solicitud de código
                </p>

                <h2 className="mt-2 text-2xl font-bold text-[#07076b]">
                  {selectedRequest.request_number}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Registrada el {formatDate(selectedRequest.requested_at)}
                </p>
              </div>

              <button
                onClick={() => setSelectedRequest(null)}
                className="rounded-full px-3 py-1 text-2xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="space-y-5">
              <DetailSection title="Información del solicitante">
                <DetailItem
                  label="Nombre"
                  value={selectedRequest.requester_name}
                />
                <DetailItem
                  label="Cargo"
                  value={selectedRequest.requester_position}
                />
                <DetailItem
                  label="Área"
                  value={selectedRequest.requester_area}
                />
                <DetailItem
                  label="Correo"
                  value={selectedRequest.requester_email || "N/A"}
                />
              </DetailSection>

              <DetailSection title="Información de la solicitud">
                <DetailItem
                  label="Tipo"
                  value={selectedRequest.request_type}
                />
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
                <DetailItem
                  label="Estado"
                  value={selectedRequest.status}
                />
              </DetailSection>

              {selectedRequest.request_type === "Desactivación" && (
                <DetailSection title="Producto a desactivar">
                  <DetailItem
                    label="Código"
                    value={
                      selectedRequest.product_code_to_deactivate || "N/A"
                    }
                  />
                  <DetailItem
                    label="Producto"
                    value={
                      selectedRequest.product_name_to_deactivate || "N/A"
                    }
                  />
                </DetailSection>
              )}

              {selectedRequest.created_product_code && (
                <DetailSection title="Código creado">
                  <DetailItem
                    label="Código"
                    value={selectedRequest.created_product_code}
                  />
                  <DetailItem
                    label="Producto"
                    value={
                      selectedRequest.created_product_name || "N/A"
                    }
                  />
                </DetailSection>
              )}

              <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <h3 className="mb-3 text-lg font-semibold text-[#07076b]">
                  Descripción detallada
                </h3>

                <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
                  {selectedRequest.detailed_description}
                </p>
              </section>

              {selectedRequest.status === "Rechazado" && (
                <section className="rounded-2xl border border-red-100 bg-red-50 p-5">
                  <h3 className="mb-2 text-lg font-semibold text-red-700">
                    Motivo del rechazo
                  </h3>

                  <p className="whitespace-pre-wrap text-sm text-red-800">
                    {selectedRequest.rejection_reason ||
                      "No se registró motivo."}
                  </p>
                </section>
              )}

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
                {canApprove && selectedRequest.status === "Pendiente" && (
                  <button
                    onClick={() => {
                      setRequestToReject(selectedRequest);
                      setSelectedRequest(null);
                    }}
                    className="rounded-xl bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                  >
                    Rechazar solicitud
                  </button>
                )}

                <button
                  onClick={() => setSelectedRequest(null)}
                  className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {requestToReject && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5">
              <p className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
                Rechazo de solicitud
              </p>

              <h2 className="mt-2 text-2xl font-bold text-[#07076b]">
                {requestToReject.request_number}
              </h2>

              <p className="mt-2 text-sm text-gray-600">
                Registra el motivo por el cual esta solicitud no puede continuar.
              </p>
            </div>

            <textarea
              rows={5}
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              placeholder="Motivo del rechazo..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#07076b] focus:ring-2 focus:ring-[#07076b]/10"
            />

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setRequestToReject(null);
                  setRejectionReason("");
                }}
                disabled={isRejecting}
                className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                onClick={handleRejectRequest}
                disabled={isRejecting}
                className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {isRejecting ? "Rechazando..." : "Confirmar rechazo"}
              </button>
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
  tone: "default" | "warning" | "success";
}) {
  const toneClassName = {
    default: "text-[#07076b]",
    warning: "text-amber-700",
    success: "text-emerald-700",
  }[tone];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className={`mt-3 text-3xl font-bold ${toneClassName}`}>
        {value}
      </p>
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
      <h3 className="mb-4 text-lg font-semibold text-[#07076b]">
        {title}
      </h3>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-gray-800">
        {value}
      </p>
    </div>
  );
}
