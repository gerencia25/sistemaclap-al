"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type ThirdPartyRequest = {
  id: string;
  request_number: string;
  requester_area: string;
  requester_name: string;
  requester_position: string;
  requester_email: string;
  request_type: string;
  category: string;
  detailed_description: string;
  rut_file_url: string;
  rut_file_name: string | null;
  chamber_commerce_file_url: string | null;
  chamber_commerce_file_name: string | null;
  customer_knowledge_file_url: string | null;
  customer_knowledge_file_name: string | null;
  supplier_knowledge_file_url: string | null;
  supplier_knowledge_file_name: string | null;
  status: string;
  rejection_reason: string | null;
  created_third_party_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export default function CreacionTercerosPage() {
  const [requests, setRequests] = useState<ThirdPartyRequest[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ThirdPartyRequest | null>(null);
  const [requestToReject, setRequestToReject] = useState<ThirdPartyRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  const inputClassName =
    "w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#07076b] focus:ring-2 focus:ring-[#07076b]/10";

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("third_party_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(`Error cargando solicitudes: ${error.message}`);
      setIsLoading(false);
      return;
    }

    setRequests((data ?? []) as ThirdPartyRequest[]);
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
          request.category,
          request.detailed_description,
          request.status,
          request.rejection_reason ?? "",
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
    if (status === "Pendiente") return "bg-amber-50 text-amber-700";
    if (status === "Aprobada") return "bg-blue-50 text-blue-700";
    if (status === "Creado") return "bg-emerald-50 text-emerald-700";
    if (status === "Rechazada") return "bg-red-50 text-red-700";
    return "bg-gray-100 text-gray-600";
  }

  async function handleApproveRequest(request: ThirdPartyRequest) {
    const { error } = await supabase
      .from("third_party_requests")
      .update({
  status: "Aprobada",
  approved_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})
      .eq("id", request.id);

    if (error) {
      alert(`No se pudo aprobar la solicitud: ${error.message}`);
      return;
    }
    await fetch("/api/send-third-party-approval-email", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    requestNumber: request.request_number,
    requesterEmail: request.requester_email,
    requesterName: request.requester_name,
    category: request.category,
  }),
});
    await fetchRequests();
    setSelectedRequest(null);
    alert("Solicitud aprobada correctamente.");
  }

  async function handleRejectRequest() {
    if (!requestToReject) return;

    if (!rejectionReason.trim()) {
      alert("Debes escribir el motivo del rechazo.");
      return;
    }

    setIsRejecting(true);

    const { error } = await supabase
      .from("third_party_requests")
      .update({
  status: "Rechazada",
  rejection_reason: rejectionReason.trim(),
  rejected_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})
      .eq("id", requestToReject.id);

    setIsRejecting(false);

    if (error) {
      alert(`No se pudo rechazar la solicitud: ${error.message}`);
      return;
    }
    await fetch("/api/send-third-party-rejection-email", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    requestNumber: requestToReject.request_number,
    requesterEmail: requestToReject.requester_email,
    requesterName: requestToReject.requester_name,
    rejectionReason: rejectionReason.trim(),
  }),
});
    setRequestToReject(null);
    setRejectionReason("");
    await fetchRequests();

    alert("Solicitud rechazada correctamente.");
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Configuración · Terceros
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
            Creación de terceros
          </h1>

          <p className="mt-3 max-w-4xl text-base leading-7 text-gray-600">
            Gestiona las solicitudes de creación o desactivación de terceros,
            revisa pendientes y controla el historial del proceso.
          </p>
        </div>

        <Link
          href="/configuracion/terceros/base-datos"
          className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:opacity-95"
        >
          Ir a base de terceros
        </Link>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <SummaryCard title="Total solicitudes" value={requests.length} tone="default" />
        <SummaryCard
          title="Pendientes"
          value={requests.filter((item) => item.status === "Pendiente").length}
          tone="warning"
        />
        <SummaryCard
          title="Cerradas"
          value={requests.filter((item) => ["Creado", "Rechazada"].includes(item.status)).length}
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
              <option value="Aprobada">Aprobada</option>
              <option value="Creado">Creado</option>
              <option value="Rechazada">Rechazada</option>
            </select>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar solicitud, solicitante, categoría..."
              className={`${inputClassName} md:w-96`}
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Consecutivo</th>
                <th className="px-4 py-3">Fecha solicitud</th>
                <th className="px-4 py-3">Solicitante</th>
                <th className="px-4 py-3">Área</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Última actualización</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {isLoading && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500">
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
                      {formatDate(request.created_at)}
                    </td>

                    <td className="px-4 py-4 font-medium text-gray-900">
                      {request.requester_name}
                      <p className="mt-1 text-xs font-normal text-gray-500">
                        {request.requester_position}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-gray-600">{request.requester_area}</td>
                    <td className="px-4 py-4 text-gray-600">{request.request_type}</td>
                    <td className="px-4 py-4 text-gray-600">{request.category}</td>

                    <td className="px-4 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClassName(request.status)}`}>
                        {request.status}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {formatDate(request.updated_at)}
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
                          <button
                            onClick={() => handleApproveRequest(request)}
                            className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                          >
                            Aprobar
                          </button>
                        )}

                        {request.status === "Pendiente" && (
                          <button
                            onClick={() => setRequestToReject(request)}
                            className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100"
                          >
                            Rechazar
                          </button>
                        )}

                        {request.status === "Aprobada" && !request.created_third_party_id && (
  <Link
    href={`/configuracion/terceros/base-datos?requestId=${request.id}`}
    className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
  >
    Crear tercero
  </Link>
)}

{request.status === "Creado" && request.created_third_party_id && (
  <span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
    Tercero creado
  </span>
)}
                      </div>
                    </td>
                  </tr>
                ))}

              {!isLoading && filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500">
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
                  Solicitud de tercero
                </p>

                <h2 className="text-2xl font-bold text-[#07076b]">
                  {selectedRequest.request_number}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Registrada el {formatDate(selectedRequest.created_at)}
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
                <DetailItem label="Nombre" value={selectedRequest.requester_name} />
                <DetailItem label="Cargo" value={selectedRequest.requester_position} />
                <DetailItem label="Correo" value={selectedRequest.requester_email || "N/A"} />
              </DetailSection>

              <DetailSection title="Solicitud">
                <DetailItem label="Tipo" value={selectedRequest.request_type} />
                <DetailItem label="Categoría" value={selectedRequest.category} />
                <DetailItem label="Estado" value={selectedRequest.status} />
              </DetailSection>

              <section className="rounded-2xl border border-gray-200 bg-white p-5">
                <h3 className="mb-3 text-lg font-semibold text-[#07076b]">
                  Descripción detallada
                </h3>

                <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
                  {selectedRequest.detailed_description}
                </p>
              </section>

              {selectedRequest.status === "Rechazada" && (
                <section className="rounded-2xl border border-red-100 bg-red-50 p-5">
                  <h3 className="mb-3 text-lg font-semibold text-red-700">
                    Motivo del rechazo
                  </h3>

                  <p className="whitespace-pre-wrap text-sm leading-6 text-red-800">
                    {selectedRequest.rejection_reason || "No se registró motivo."}
                  </p>
                </section>
              )}

              <section className="rounded-2xl border border-gray-200 bg-white p-5">
                <h3 className="mb-4 text-lg font-semibold text-[#07076b]">
                  Adjuntos
                </h3>

                <div className="flex flex-wrap gap-2">
                  <AttachmentLink label="RUT" url={selectedRequest.rut_file_url} />
                  <AttachmentLink label="Cámara de comercio" url={selectedRequest.chamber_commerce_file_url} />
                  <AttachmentLink label="Conocimiento cliente" url={selectedRequest.customer_knowledge_file_url} />
                  <AttachmentLink label="Conocimiento proveedor" url={selectedRequest.supplier_knowledge_file_url} />
                </div>
              </section>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-6">
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                >
                  Cerrar
                </button>

                {selectedRequest.status === "Pendiente" && (
                  <button
                    onClick={() => handleApproveRequest(selectedRequest)}
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Aprobar solicitud
                  </button>
                )}

                {selectedRequest.status === "Pendiente" && (
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

                {selectedRequest.status === "Aprobada" &&
  !selectedRequest.created_third_party_id && (
    <Link
      href={`/configuracion/terceros/base-datos?requestId=${selectedRequest.id}`}
      className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95"
    >
      Crear tercero
    </Link>
)}

{selectedRequest.status === "Creado" &&
  selectedRequest.created_third_party_id && (
    <span className="rounded-xl bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700">
      Tercero creado
    </span>
)}
              </div>
            </div>
          </div>
        </div>
      )}

      {requestToReject && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5">
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
                Rechazo de solicitud
              </p>

              <h2 className="text-2xl font-bold text-[#07076b]">
                {requestToReject.request_number}
              </h2>

              <p className="mt-2 text-sm text-gray-600">
                Escribe el motivo por el cual esta solicitud no puede continuar.
              </p>
            </div>

            <textarea
              rows={5}
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              placeholder="Ejemplo: La solicitud no contiene la documentación requerida..."
              className={inputClassName}
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

function AttachmentLink({
  label,
  url,
}: {
  label: string;
  url: string | null;
}) {
  if (!url) {
    return (
      <span className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-500">
        {label}: N/A
      </span>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="rounded-lg bg-[#07076b]/10 px-3 py-2 text-xs font-medium text-[#07076b] transition hover:bg-[#07076b]/20"
    >
      Ver {label}
    </a>
  );
}