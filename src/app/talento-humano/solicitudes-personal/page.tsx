"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type EmployeeRequest = {
  id: string;
  request_number: string;

  requester_area: string;
  requester_name: string;
  requester_position: string;
  requester_email: string;

  request_type: string;
  request_reason: string | null;

  area: string;
  position: string;

  area_id: string | null;
  position_id: string | null;

  requested_quantity: number;
  required_date: string | null;
  contract_type: string | null;

  replacement_employee_id: string | null;

  detailed_description: string | null;

  status: string;

  rejection_reason: string | null;
  cancellation_reason: string | null;

  closure_type: string | null;
  closure_reason: string | null;

  approved_at: string | null;
  rejected_at: string | null;
  in_progress_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;

  created_at: string;
  updated_at: string;
};

const statuses = [
  "Todos",
  "Pendiente",
  "Aprobada",
  "En gestión",
  "Cubierta",
  "Rechazada",
  "Cancelada",
];

function formatDate(date: string | null) {
  if (!date) return "Sin fecha";

  if (!date.includes("T")) {
    const [year, month, day] = date.split("-");

    if (!year || !month || !day) {
      return "Sin fecha";
    }

    return `${Number(day)}/${Number(month)}/${year}`;
  }

  return new Date(date).toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function getStatusStyles(status: string) {
  if (status === "Pendiente") {
    return "bg-amber-50 text-amber-700";
  }

  if (status === "Aprobada") {
    return "bg-blue-50 text-blue-700";
  }

  if (status === "En gestión") {
    return "bg-violet-50 text-violet-700";
  }

  if (status === "Cubierta") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "Rechazada") {
    return "bg-red-50 text-red-700";
  }

  if (status === "Cancelada") {
    return "bg-gray-100 text-gray-700";
  }

  return "bg-gray-100 text-gray-700";
}

export default function SolicitudesPersonalPage() {
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");

  const [selectedRequest, setSelectedRequest] =
    useState<EmployeeRequest | null>(null);

  // =======================================================
  // RECHAZO
  // =======================================================

  const [rejectingRequest, setRejectingRequest] =
    useState<EmployeeRequest | null>(null);

  const [rejectionReason, setRejectionReason] = useState("");

  // =======================================================
  // CANCELACIÓN
  // =======================================================

  const [cancelingRequest, setCancelingRequest] =
    useState<EmployeeRequest | null>(null);

  const [cancellationReason, setCancellationReason] = useState("");

  // =======================================================
  // COBERTURA
  // =======================================================

  const [fulfillmentCounts, setFulfillmentCounts] =
    useState<Record<string, number>>({});

  // =======================================================
  // CIERRE PARCIAL
  // =======================================================

  const [partialClosingRequest, setPartialClosingRequest] =
    useState<EmployeeRequest | null>(null);

  const [partialClosureReason, setPartialClosureReason] = useState("");

  useEffect(() => {
    fetchRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesSearch =
        !normalizedSearch ||
        request.request_number
          .toLowerCase()
          .includes(normalizedSearch) ||
        request.area
          .toLowerCase()
          .includes(normalizedSearch) ||
        request.position
          .toLowerCase()
          .includes(normalizedSearch) ||
        request.requester_name
          .toLowerCase()
          .includes(normalizedSearch) ||
        request.requester_area
          .toLowerCase()
          .includes(normalizedSearch) ||
        (request.request_reason ?? "")
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "Todos" ||
        request.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [requests, search, statusFilter]);

  const pendingCount = requests.filter(
    (request) => request.status === "Pendiente"
  ).length;

  const approvedCount = requests.filter(
    (request) => request.status === "Aprobada"
  ).length;

  const inProgressCount = requests.filter(
    (request) => request.status === "En gestión"
  ).length;

  const coveredCount = requests.filter(
    (request) => request.status === "Cubierta"
  ).length;

  const rejectedCount = requests.filter(
    (request) => request.status === "Rechazada"
  ).length;

  const cancelledCount = requests.filter(
    (request) => request.status === "Cancelada"
  ).length;

  // =======================================================
  // HELPERS
  // =======================================================

  function getFulfilledCount(requestId: string) {
    return fulfillmentCounts[requestId] ?? 0;
  }

  function canClosePartially(request: EmployeeRequest) {
    const fulfilledCount = getFulfilledCount(request.id);

    return (
      request.status === "En gestión" &&
      fulfilledCount > 0 &&
      fulfilledCount < request.requested_quantity
    );
  }

  // =======================================================
  // CARGAR SOLICITUDES + COBERTURA
  // =======================================================

  async function fetchRequests() {
    setLoading(true);

    const {
      data: requestsData,
      error: requestsError,
    } = await supabase
      .from("employee_requests")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (requestsError) {
      alert(
        `Error cargando solicitudes de personal: ${requestsError.message}`
      );

      setLoading(false);
      return;
    }

    const {
      data: fulfillmentData,
      error: fulfillmentError,
    } = await supabase
      .from("employee_request_fulfillments")
      .select("request_id");

    if (fulfillmentError) {
      alert(
        `Error cargando cobertura de solicitudes: ${fulfillmentError.message}`
      );

      setLoading(false);
      return;
    }

    const counts: Record<string, number> = {};

    for (const row of fulfillmentData ?? []) {
      const fulfillmentRequestId = row.request_id;

      if (!fulfillmentRequestId) {
        continue;
      }

      counts[fulfillmentRequestId] =
        (counts[fulfillmentRequestId] ?? 0) + 1;
    }

    setFulfillmentCounts(counts);

    setRequests(
      (requestsData ?? []) as EmployeeRequest[]
    );

    setLoading(false);
  }

  // =======================================================
  // APROBAR
  // =======================================================

  async function approveRequest(request: EmployeeRequest) {
    const confirmApprove = confirm(
      `¿Deseas aprobar la solicitud ${request.request_number}?`
    );

    if (!confirmApprove) return;

    setActionLoading(true);

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("employee_requests")
      .update({
        status: "Aprobada",
        approved_at: now,
        updated_at: now,
      })
      .eq("id", request.id);

    if (error) {
      setActionLoading(false);

      alert(
        `Error aprobando solicitud: ${error.message}`
      );

      return;
    }

    try {
      await fetch("/api/send-personal-approval-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: request.requester_email,
          requestNumber: request.request_number,
          requesterName: request.requester_name,
          requestReason: request.request_reason,
          area: request.area,
          position: request.position,
          requestedQuantity: request.requested_quantity,
          requiredDate: request.required_date,
        }),
      });
    } catch (emailError) {
      console.error(
        "Error enviando correo de aprobación de personal:",
        emailError
      );
    }

    await fetchRequests();

    setSelectedRequest(null);
    setActionLoading(false);
  }

  // =======================================================
  // RECHAZAR
  // =======================================================

  function openRejectModal(request: EmployeeRequest) {
    setRejectingRequest(request);
    setRejectionReason("");
  }

  async function rejectRequest() {
    if (!rejectingRequest) return;

    if (!rejectionReason.trim()) {
      alert(
        "Debes escribir el motivo del rechazo."
      );

      return;
    }

    setActionLoading(true);

    const now = new Date().toISOString();
    const reason = rejectionReason.trim();

    const { error } = await supabase
      .from("employee_requests")
      .update({
        status: "Rechazada",
        rejection_reason: reason,
        rejected_at: now,
        updated_at: now,
      })
      .eq("id", rejectingRequest.id);

    if (error) {
      setActionLoading(false);

      alert(
        `Error rechazando solicitud: ${error.message}`
      );

      return;
    }

    try {
      await fetch("/api/send-personal-rejection-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: rejectingRequest.requester_email,
          requestNumber: rejectingRequest.request_number,
          requesterName: rejectingRequest.requester_name,
          requestReason: rejectingRequest.request_reason,
          area: rejectingRequest.area,
          position: rejectingRequest.position,
          requestedQuantity:
            rejectingRequest.requested_quantity,
          requiredDate: rejectingRequest.required_date,
          rejectionReason: reason,
        }),
      });
    } catch (emailError) {
      console.error(
        "Error enviando correo de rechazo de personal:",
        emailError
      );
    }

    await fetchRequests();

    setRejectingRequest(null);
    setSelectedRequest(null);
    setRejectionReason("");
    setActionLoading(false);
  }

  // =======================================================
  // INICIAR GESTIÓN
  // =======================================================

  async function startManagement(request: EmployeeRequest) {
    const confirmStart = confirm(
      `¿Deseas iniciar la gestión de la solicitud ${request.request_number}?`
    );

    if (!confirmStart) return;

    setActionLoading(true);

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("employee_requests")
      .update({
        status: "En gestión",
        in_progress_at: now,
        updated_at: now,
      })
      .eq("id", request.id);

    if (error) {
      setActionLoading(false);

      alert(
        `Error iniciando la gestión: ${error.message}`
      );

      return;
    }

    await fetchRequests();

    setSelectedRequest(null);
    setActionLoading(false);
  }

  // =======================================================
  // CANCELAR
  // =======================================================

  function openCancelModal(request: EmployeeRequest) {
    setCancelingRequest(request);
    setCancellationReason("");
  }

  async function cancelRequest() {
    if (!cancelingRequest) return;

    if (!cancellationReason.trim()) {
      alert(
        "Debes escribir el motivo de la cancelación."
      );

      return;
    }

    setActionLoading(true);

    const now = new Date().toISOString();
    const reason = cancellationReason.trim();

    const { error } = await supabase
      .from("employee_requests")
      .update({
        status: "Cancelada",
        cancelled_at: now,
        cancellation_reason: reason,
        updated_at: now,
      })
      .eq("id", cancelingRequest.id);

    if (error) {
      setActionLoading(false);

      alert(
        `Error cancelando la solicitud: ${error.message}`
      );

      return;
    }

    await fetchRequests();

    setCancelingRequest(null);
    setSelectedRequest(null);
    setCancellationReason("");
    setActionLoading(false);
  }

  // =======================================================
  // CIERRE PARCIAL
  // =======================================================

  function openPartialCloseModal(request: EmployeeRequest) {
    const fulfilledCount = getFulfilledCount(request.id);

    if (request.status !== "En gestión") {
      alert(
        "Solo las solicitudes En gestión pueden cerrarse parcialmente."
      );

      return;
    }

    if (fulfilledCount <= 0) {
      alert(
        "La solicitud todavía no tiene personas vinculadas. Si ya no continuará, utiliza Cancelar solicitud."
      );

      return;
    }

    if (
      fulfilledCount >=
      request.requested_quantity
    ) {
      alert(
        "La solicitud ya alcanzó la cantidad requerida."
      );

      return;
    }

    setPartialClosingRequest(request);
    setPartialClosureReason("");
  }

  function closePartialCloseModal() {
    setPartialClosingRequest(null);
    setPartialClosureReason("");
  }

  async function closeRequestPartially() {
    if (!partialClosingRequest) {
      return;
    }

    if (!partialClosureReason.trim()) {
      alert(
        "Debes escribir el motivo del cierre parcial."
      );

      return;
    }

    const fulfilledCount =
      getFulfilledCount(
        partialClosingRequest.id
      );

    const confirmed = confirm(
      `¿Confirmas el cierre parcial de ${partialClosingRequest.request_number}?\n\n` +
        `Solicitadas: ${partialClosingRequest.requested_quantity}\n` +
        `Personas vinculadas: ${fulfilledCount}\n\n` +
        `La solicitud quedará Cubierta · Parcial y no se podrán registrar más personas desde este requerimiento.`
    );

    if (!confirmed) {
      return;
    }

    setActionLoading(true);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (
      sessionError ||
      !session?.access_token
    ) {
      setActionLoading(false);

      alert(
        "No se encontró una sesión válida. Inicia sesión nuevamente."
      );

      return;
    }

    const response = await fetch(
      "/api/talento-humano/solicitudes-personal/cerrar-parcial",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization:
            `Bearer ${session.access_token}`,
        },

        body: JSON.stringify({
          request_id:
            partialClosingRequest.id,

          closure_reason:
            partialClosureReason.trim(),
        }),
      }
    );

    const responseBody =
      await response.json();

    if (!response.ok) {
      setActionLoading(false);

      alert(
        responseBody?.error ??
          "No fue posible cerrar parcialmente la solicitud."
      );

      return;
    }

    const result =
      responseBody?.data;

    const notification =
      responseBody?.notification;

    let message =
      `Solicitud cerrada parcialmente.\n\n` +
      `${result?.request_number ?? partialClosingRequest.request_number}\n` +
      `Cobertura: ${result?.fulfilled_count ?? fulfilledCount} de ${
        result?.requested_quantity ??
        partialClosingRequest.requested_quantity
      }\n\n` +
      `Estado: Cubierta · Parcial.`;

    if (
      notification?.required &&
      notification?.sent === false
    ) {
      message +=
        `\n\n⚠️ La solicitud quedó cerrada correctamente, ` +
        `pero no fue posible enviar el correo final al solicitante.\n\n` +
        `${
          notification?.warning ??
          "Error enviando correo."
        }\n\n` +
        `NO vuelvas a cerrar la solicitud.`;
    } else {
      message +=
        `\n\nEl correo final fue enviado al solicitante.`;
    }

    await fetchRequests();

    closePartialCloseModal();
    setSelectedRequest(null);
    setActionLoading(false);

    alert(message);
  }

  // =======================================================
  // UI
  // =======================================================

  return (
    <div className="space-y-8">
      <section>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
          Talento Humano · Solicitudes de personal
        </p>

        <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
          Solicitudes de personal
        </h1>

        <p className="mt-3 max-w-4xl text-base leading-7 text-gray-600">
          Revisa las necesidades de personal enviadas por las
          diferentes áreas, aprueba o rechaza los requerimientos
          y realiza su seguimiento.
        </p>
      </section>

      {/* ===================================================
          CONTADORES
          =================================================== */}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Total solicitudes
          </p>

          <p className="mt-2 text-3xl font-bold text-[#07076b]">
            {requests.length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Pendientes
          </p>

          <p className="mt-2 text-3xl font-bold text-amber-700">
            {pendingCount}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Aprobadas
          </p>

          <p className="mt-2 text-3xl font-bold text-blue-700">
            {approvedCount}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            En gestión
          </p>

          <p className="mt-2 text-3xl font-bold text-violet-700">
            {inProgressCount}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Cubiertas
          </p>

          <p className="mt-2 text-3xl font-bold text-emerald-700">
            {coveredCount}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Rechazadas
          </p>

          <p className="mt-2 text-3xl font-bold text-red-700">
            {rejectedCount}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Canceladas
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-700">
            {cancelledCount}
          </p>
        </div>
      </section>

      {/* ===================================================
          FILTROS
          =================================================== */}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Buscar
            </label>

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Solicitud, motivo, área, cargo o solicitante"
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Estado
            </label>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
            >
              {statuses.map((status) => (
                <option
                  key={status}
                  value={status}
                >
                  {status === "Todos"
                    ? "Todos los estados"
                    : status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ===================================================
          TABLA
          =================================================== */}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Solicitud
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Necesidad
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Cantidad / Cobertura
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Área / Cargo
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Solicitante
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Estado
                </th>

                <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-sm text-gray-500"
                  >
                    Cargando solicitudes...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-sm text-gray-500"
                  >
                    No se encontraron solicitudes con ese criterio.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => {
                  const fulfilledCount =
                    getFulfilledCount(request.id);

                  return (
                    <tr
                      key={request.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-[#07076b]">
                          {request.request_number}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {formatDate(request.created_at)}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-gray-900">
                          {request.request_reason ??
                            "Sin motivo definido"}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          Requerida:{" "}
                          {formatDate(request.required_date)}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-gray-900">
                          {request.requested_quantity}{" "}
                          {request.requested_quantity === 1
                            ? "persona"
                            : "personas"}
                        </p>

                        {(request.status === "En gestión" ||
                          request.status === "Cubierta") && (
                          <p className="mt-1 text-xs font-medium text-violet-700">
                            Cobertura:{" "}
                            {fulfilledCount} de{" "}
                            {request.requested_quantity}
                          </p>
                        )}

                        {request.status === "Cubierta" &&
                          request.closure_type && (
                            <p className="mt-1 text-xs text-gray-500">
                              Cierre:{" "}
                              {request.closure_type}
                            </p>
                          )}
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-gray-900">
                          {request.area}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {request.position}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-gray-900">
                          {request.requester_name}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {request.requester_area}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusStyles(
                            request.status
                          )}`}
                        >
                          {request.status}
                        </span>

                        {request.status === "Cubierta" &&
                          request.closure_type && (
                            <p className="mt-2 text-xs font-medium text-gray-500">
                              {request.closure_type}
                            </p>
                          )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedRequest(
                                request
                              )
                            }
                            className="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-[#07076b] transition hover:border-[#07076b] hover:bg-[#07076b] hover:text-white"
                          >
                            Ver
                          </button>

                          {request.status ===
                            "Pendiente" && (
                            <>
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() =>
                                  approveRequest(
                                    request
                                  )
                                }
                                className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                              >
                                Aprobar
                              </button>

                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() =>
                                  openRejectModal(
                                    request
                                  )
                                }
                                className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                              >
                                Rechazar
                              </button>
                            </>
                          )}

                          {request.status ===
                            "Aprobada" && (
                            <>
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() =>
                                  startManagement(
                                    request
                                  )
                                }
                                className="rounded-full bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
                              >
                                Iniciar gestión
                              </button>

                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() =>
                                  openCancelModal(
                                    request
                                  )
                                }
                                className="rounded-full border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                              >
                                Cancelar
                              </button>
                            </>
                          )}

                          {request.status ===
                            "En gestión" && (
                            <>
                              <Link
                                href={`/talento-humano/personal/base-datos?requestId=${request.id}`}
                                className="rounded-full bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-700"
                              >
                                Registrar persona contratada
                              </Link>

                              {canClosePartially(
                                request
                              ) && (
                                <button
                                  type="button"
                                  disabled={actionLoading}
                                  onClick={() =>
                                    openPartialCloseModal(
                                      request
                                    )
                                  }
                                  className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700 transition hover:border-amber-600 hover:bg-amber-600 hover:text-white disabled:opacity-60"
                                >
                                  Cerrar parcialmente
                                </button>
                              )}

                              {getFulfilledCount(request.id) === 0 && (
  <button
    type="button"
    disabled={actionLoading}
    onClick={() =>
      openCancelModal(request)
    }
    className="rounded-full border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
  >
    Cancelar
  </button>
)}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ===================================================
          MODAL DETALLE
          =================================================== */}

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
          <div className="w-full max-w-4xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex flex-col justify-between gap-4 border-b border-gray-100 pb-5 md:flex-row md:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
                  Solicitud de personal
                </p>

                <h2 className="mt-2 text-2xl font-bold text-[#07076b]">
                  {selectedRequest.request_number}
                </h2>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusStyles(
                      selectedRequest.status
                    )}`}
                  >
                    {selectedRequest.status}
                  </span>

                  {selectedRequest.status ===
                    "Cubierta" &&
                    selectedRequest.closure_type && (
                      <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                        {selectedRequest.closure_type}
                      </span>
                    )}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedRequest(null)
                }
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <h3 className="font-semibold text-gray-900">
                  Información del solicitante
                </h3>

                <div className="mt-3 space-y-2 text-sm text-gray-700">
                  <p>
                    <span className="font-medium">
                      Nombre:
                    </span>{" "}
                    {selectedRequest.requester_name}
                  </p>

                  <p>
                    <span className="font-medium">
                      Cargo:
                    </span>{" "}
                    {selectedRequest.requester_position}
                  </p>

                  <p>
                    <span className="font-medium">
                      Área:
                    </span>{" "}
                    {selectedRequest.requester_area}
                  </p>

                  <p>
                    <span className="font-medium">
                      Correo:
                    </span>{" "}
                    {selectedRequest.requester_email}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <h3 className="font-semibold text-gray-900">
                  Necesidad de personal
                </h3>

                <div className="mt-3 space-y-2 text-sm text-gray-700">
                  <p>
                    <span className="font-medium">
                      Motivo:
                    </span>{" "}
                    {selectedRequest.request_reason ??
                      "Sin definir"}
                  </p>

                  <p>
                    <span className="font-medium">
                      Área requerida:
                    </span>{" "}
                    {selectedRequest.area}
                  </p>

                  <p>
                    <span className="font-medium">
                      Cargo requerido:
                    </span>{" "}
                    {selectedRequest.position}
                  </p>

                  <p>
                    <span className="font-medium">
                      Cantidad:
                    </span>{" "}
                    {selectedRequest.requested_quantity}{" "}
                    {selectedRequest.requested_quantity === 1
                      ? "persona"
                      : "personas"}
                  </p>

                  {(selectedRequest.status ===
                    "En gestión" ||
                    selectedRequest.status ===
                      "Cubierta") && (
                    <p>
                      <span className="font-medium">
                        Cobertura:
                      </span>{" "}
                      {getFulfilledCount(
                        selectedRequest.id
                      )}{" "}
                      de{" "}
                      {
                        selectedRequest.requested_quantity
                      }
                    </p>
                  )}

                  {selectedRequest.status ===
                    "Cubierta" &&
                    selectedRequest.closure_type && (
                      <p>
                        <span className="font-medium">
                          Tipo de cierre:
                        </span>{" "}
                        {
                          selectedRequest.closure_type
                        }
                      </p>
                    )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <h3 className="font-semibold text-gray-900">
                  Condiciones requeridas
                </h3>

                <div className="mt-3 space-y-2 text-sm text-gray-700">
                  <p>
                    <span className="font-medium">
                      Fecha requerida:
                    </span>{" "}
                    {formatDate(
                      selectedRequest.required_date
                    )}
                  </p>

                  <p>
                    <span className="font-medium">
                      Contrato sugerido:
                    </span>{" "}
                    {selectedRequest.contract_type ??
                      "Sin definir"}
                  </p>

                  <p>
                    <span className="font-medium">
                      Requiere reemplazo:
                    </span>{" "}
                    {selectedRequest.replacement_employee_id
                      ? "Sí"
                      : "No"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <h3 className="font-semibold text-gray-900">
                  Fechas de gestión
                </h3>

                <div className="mt-3 space-y-2 text-sm text-gray-700">
                  <p>
                    <span className="font-medium">
                      Creada:
                    </span>{" "}
                    {formatDate(
                      selectedRequest.created_at
                    )}
                  </p>

                  <p>
                    <span className="font-medium">
                      Aprobada:
                    </span>{" "}
                    {formatDate(
                      selectedRequest.approved_at
                    )}
                  </p>

                  <p>
                    <span className="font-medium">
                      En gestión:
                    </span>{" "}
                    {formatDate(
                      selectedRequest.in_progress_at
                    )}
                  </p>

                  <p>
                    <span className="font-medium">
                      Cubierta:
                    </span>{" "}
                    {formatDate(
                      selectedRequest.completed_at
                    )}
                  </p>

                  <p>
                    <span className="font-medium">
                      Rechazada:
                    </span>{" "}
                    {formatDate(
                      selectedRequest.rejected_at
                    )}
                  </p>

                  <p>
                    <span className="font-medium">
                      Cancelada:
                    </span>{" "}
                    {formatDate(
                      selectedRequest.cancelled_at
                    )}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 md:col-span-2">
                <h3 className="font-semibold text-gray-900">
                  Descripción / justificación
                </h3>

                <p className="mt-3 text-sm leading-6 text-gray-700">
                  {selectedRequest.detailed_description ??
                    "Sin descripción adicional."}
                </p>
              </div>

              {selectedRequest.rejection_reason && (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-4 md:col-span-2">
                  <h3 className="font-semibold text-red-800">
                    Motivo de rechazo
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-red-700">
                    {selectedRequest.rejection_reason}
                  </p>
                </div>
              )}

              {selectedRequest.cancellation_reason && (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 md:col-span-2">
                  <h3 className="font-semibold text-gray-800">
                    Motivo de cancelación
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-gray-700">
                    {
                      selectedRequest.cancellation_reason
                    }
                  </p>
                </div>
              )}

              {selectedRequest.closure_type ===
                "Parcial" &&
                selectedRequest.closure_reason && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 md:col-span-2">
                    <h3 className="font-semibold text-amber-800">
                      Motivo del cierre parcial
                    </h3>

                    <p className="mt-3 text-sm leading-6 text-amber-700">
                      {
                        selectedRequest.closure_reason
                      }
                    </p>
                  </div>
                )}
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-5">
              {selectedRequest.status ===
                "Pendiente" && (
                <>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() =>
                      approveRequest(
                        selectedRequest
                      )
                    }
                    className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    Aprobar solicitud
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() =>
                      openRejectModal(
                        selectedRequest
                      )
                    }
                    className="rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                  >
                    Rechazar solicitud
                  </button>
                </>
              )}

              {selectedRequest.status ===
                "Aprobada" && (
                <>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() =>
                      startManagement(
                        selectedRequest
                      )
                    }
                    className="rounded-full bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
                  >
                    Iniciar gestión
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() =>
                      openCancelModal(
                        selectedRequest
                      )
                    }
                    className="rounded-full border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                  >
                    Cancelar solicitud
                  </button>
                </>
              )}

              {selectedRequest.status ===
                "En gestión" && (
                <>
                  <Link
                    href={`/talento-humano/personal/base-datos?requestId=${selectedRequest.id}`}
                    className="rounded-full bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
                  >
                    Registrar persona contratada
                  </Link>

                  {canClosePartially(
                    selectedRequest
                  ) && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() =>
                        openPartialCloseModal(
                          selectedRequest
                        )
                      }
                      className="rounded-full border border-amber-300 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-700 transition hover:border-amber-600 hover:bg-amber-600 hover:text-white disabled:opacity-60"
                    >
                      Cerrar parcialmente
                    </button>
                  )}

                  {getFulfilledCount(selectedRequest.id) === 0 && (
  <button
    type="button"
    disabled={actionLoading}
    onClick={() =>
      openCancelModal(selectedRequest)
    }
    className="rounded-full border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
  >
    Cancelar solicitud
  </button>
)}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          MODAL RECHAZAR
          =================================================== */}

      {rejectingRequest && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
              Rechazar solicitud
            </p>

            <h2 className="mt-2 text-2xl font-bold text-[#07076b]">
              {rejectingRequest.request_number}
            </h2>

            <p className="mt-3 text-sm leading-6 text-gray-600">
              Escribe el motivo por el cual se rechaza esta
              solicitud de personal.
            </p>

            <textarea
              value={rejectionReason}
              onChange={(event) =>
                setRejectionReason(
                  event.target.value
                )
              }
              rows={5}
              className="mt-5 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
              placeholder="Motivo del rechazo..."
            />

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setRejectingRequest(null);
                  setRejectionReason("");
                }}
                className="rounded-full border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={rejectRequest}
                className="rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {actionLoading
                  ? "Rechazando..."
                  : "Confirmar rechazo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          MODAL CANCELAR
          =================================================== */}

      {cancelingRequest && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
              Cancelar solicitud
            </p>

            <h2 className="mt-2 text-2xl font-bold text-[#07076b]">
              {cancelingRequest.request_number}
            </h2>

            <p className="mt-3 text-sm leading-6 text-gray-600">
              Registra el motivo por el cual esta necesidad
              de personal ya no debe continuar en gestión.
            </p>

            <textarea
              value={cancellationReason}
              onChange={(event) =>
                setCancellationReason(
                  event.target.value
                )
              }
              rows={5}
              className="mt-5 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
              placeholder="Motivo de la cancelación..."
            />

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setCancelingRequest(null);
                  setCancellationReason("");
                }}
                className="rounded-full border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                Volver
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={cancelRequest}
                className="rounded-full bg-gray-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-900 disabled:opacity-60"
              >
                {actionLoading
                  ? "Cancelando..."
                  : "Confirmar cancelación"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          MODAL CERRAR PARCIALMENTE
          =================================================== */}

      {partialClosingRequest && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-amber-600">
              Talento Humano · Cierre parcial
            </p>

            <h2 className="mt-2 text-2xl font-bold text-[#07076b]">
              {partialClosingRequest.request_number}
            </h2>

            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">
                Cobertura parcial
              </p>

              <p className="mt-2 text-sm leading-6 text-amber-700">
                Se solicitaron{" "}
                <span className="font-bold">
                  {
                    partialClosingRequest.requested_quantity
                  }
                </span>{" "}
                {partialClosingRequest.requested_quantity ===
                1
                  ? "persona"
                  : "personas"}{" "}
                y actualmente hay{" "}
                <span className="font-bold">
                  {getFulfilledCount(
                    partialClosingRequest.id
                  )}
                </span>{" "}
                vinculadas.
              </p>
            </div>

            <p className="mt-5 text-sm leading-6 text-gray-600">
              Registra por qué Talento Humano cierra la solicitud
              sin completar la cantidad originalmente requerida.
              La cantidad solicitada no será modificada y la
              trazabilidad permanecerá intacta.
            </p>

            <textarea
              value={partialClosureReason}
              onChange={(event) =>
                setPartialClosureReason(
                  event.target.value
                )
              }
              rows={5}
              className="mt-5 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
              placeholder="Ej. El área solicitante confirmó que las vacantes restantes ya no son requeridas..."
            />

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                disabled={actionLoading}
                onClick={closePartialCloseModal}
                className="rounded-full border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-60"
              >
                Volver
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={closeRequestPartially}
                className="rounded-full bg-amber-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
              >
                {actionLoading
                  ? "Cerrando..."
                  : "Confirmar cierre parcial"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}