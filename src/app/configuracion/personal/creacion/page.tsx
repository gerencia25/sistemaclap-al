"use client";

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

  document_type: string;
  document_number: string;
  first_name: string;
  last_name: string;
  full_name: string;

  area: string;
  position: string;
  direct_manager_id: string | null;

  email: string | null;
  phone: string | null;
  hire_date: string | null;
  contract_type: string | null;

  detailed_description: string | null;

  status: string;
  rejection_reason: string | null;

  created_employee_id: string | null;

  approved_at: string | null;
  rejected_at: string | null;
  completed_at: string | null;

  created_at: string;
  updated_at: string;
};

const statuses = ["Todos", "Pendiente", "Aprobada", "Rechazada", "Creado"];

function formatDate(date: string | null) {
  if (!date) return "Sin fecha";

  if (!date.includes("T")) {
    const [year, month, day] = date.split("-");
    if (!year || !month || !day) return "Sin fecha";
    return `${Number(day)}/${Number(month)}/${year}`;
  }

  return new Date(date).toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function getStatusStyles(status: string) {
  if (status === "Pendiente") return "bg-amber-50 text-amber-700";
  if (status === "Aprobada") return "bg-blue-50 text-blue-700";
  if (status === "Rechazada") return "bg-red-50 text-red-700";
  if (status === "Creado") return "bg-emerald-50 text-emerald-700";

  return "bg-gray-100 text-gray-700";
}

export default function CreacionPersonalPage() {
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");

  const [selectedRequest, setSelectedRequest] =
    useState<EmployeeRequest | null>(null);

  const [rejectingRequest, setRejectingRequest] =
    useState<EmployeeRequest | null>(null);

  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    fetchRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesSearch =
        !normalizedSearch ||
        request.request_number.toLowerCase().includes(normalizedSearch) ||
        request.full_name.toLowerCase().includes(normalizedSearch) ||
        request.document_number.toLowerCase().includes(normalizedSearch) ||
        request.area.toLowerCase().includes(normalizedSearch) ||
        request.position.toLowerCase().includes(normalizedSearch) ||
        request.requester_name.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "Todos" || request.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [requests, search, statusFilter]);

  const pendingCount = requests.filter(
    (request) => request.status === "Pendiente"
  ).length;

  const approvedCount = requests.filter(
    (request) => request.status === "Aprobada"
  ).length;

  const createdCount = requests.filter(
    (request) => request.status === "Creado"
  ).length;

  async function fetchRequests() {
    setLoading(true);

    const { data, error } = await supabase
      .from("employee_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(`Error cargando solicitudes de personal: ${error.message}`);
      setLoading(false);
      return;
    }

    setRequests((data ?? []) as EmployeeRequest[]);
    setLoading(false);
  }

async function approveRequest(request: EmployeeRequest) {
  const confirmApprove = confirm(
    `¿Deseas aprobar la solicitud ${request.request_number}?`
  );

  if (!confirmApprove) return;

  setActionLoading(true);

  const { error } = await supabase
    .from("employee_requests")
    .update({
      status: "Aprobada",
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", request.id);

  if (error) {
    setActionLoading(false);
    alert(`Error aprobando solicitud: ${error.message}`);
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
        employeeFullName: request.full_name,
        area: request.area,
        position: request.position,
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

async function rejectRequest() {
  if (!rejectingRequest) return;

  if (!rejectionReason.trim()) {
    alert("Debes escribir el motivo del rechazo.");
    return;
  }

  setActionLoading(true);

  const reason = rejectionReason.trim();

  const { error } = await supabase
    .from("employee_requests")
    .update({
      status: "Rechazada",
      rejection_reason: reason,
      rejected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", rejectingRequest.id);

  if (error) {
    setActionLoading(false);
    alert(`Error rechazando solicitud: ${error.message}`);
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
        employeeFullName: rejectingRequest.full_name,
        area: rejectingRequest.area,
        position: rejectingRequest.position,
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

  function openRejectModal(request: EmployeeRequest) {
    setRejectingRequest(request);
    setRejectionReason("");
  }

  return (
    <div className="space-y-8">
      <section>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
          Configuración · Personal · Creación
        </p>

        <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
          Creación de personal
        </h1>

        <p className="mt-3 max-w-4xl text-base leading-7 text-gray-600">
          Revisa las solicitudes de creación de personal, aprueba, rechaza y
          crea empleados en la base de datos maestra.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total solicitudes</p>
          <p className="mt-2 text-3xl font-bold text-[#07076b]">
            {requests.length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Pendientes</p>
          <p className="mt-2 text-3xl font-bold text-amber-700">
            {pendingCount}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Aprobadas</p>
          <p className="mt-2 text-3xl font-bold text-blue-700">
            {approvedCount}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Creados</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">
            {createdCount}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-gray-700">Buscar</label>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Solicitud, nombre, documento, área, cargo o solicitante"
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Estado</label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status === "Todos" ? "Todos los estados" : status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Solicitud
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Personal solicitado
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Documento
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
                filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
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
                        {request.full_name}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {request.email ?? "Sin correo"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-900">
                        {request.document_number}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {request.document_type}
                      </p>
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
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedRequest(request)}
                          className="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-[#07076b] transition hover:border-[#07076b] hover:bg-[#07076b] hover:text-white"
                        >
                          Ver
                        </button>

                        {request.status === "Pendiente" && (
                          <>
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => approveRequest(request)}
                              className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                            >
                              Aprobar
                            </button>

                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => openRejectModal(request)}
                              className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                            >
                              Rechazar
                            </button>
                          </>
                        )}

                        {request.status === "Aprobada" && (
                          <a
                            href={`/configuracion/personal/base-datos?requestId=${request.id}`}
                            className="rounded-full bg-[#07076b] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#05054f]"
                          >
                            Crear empleado
                          </a>
                        )}

                        {request.status === "Creado" && (
                          <span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
                            Empleado creado
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
          <div className="w-full max-w-4xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex flex-col justify-between gap-4 border-b border-gray-100 pb-5 md:flex-row md:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
                  Solicitud de creación
                </p>

                <h2 className="mt-2 text-2xl font-bold text-[#07076b]">
                  {selectedRequest.request_number}
                </h2>

                <span
                  className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusStyles(
                    selectedRequest.status
                  )}`}
                >
                  {selectedRequest.status}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
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
                    <span className="font-medium">Nombre:</span>{" "}
                    {selectedRequest.requester_name}
                  </p>
                  <p>
                    <span className="font-medium">Cargo:</span>{" "}
                    {selectedRequest.requester_position}
                  </p>
                  <p>
                    <span className="font-medium">Área:</span>{" "}
                    {selectedRequest.requester_area}
                  </p>
                  <p>
                    <span className="font-medium">Correo:</span>{" "}
                    {selectedRequest.requester_email}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <h3 className="font-semibold text-gray-900">
                  Información del empleado
                </h3>

                <div className="mt-3 space-y-2 text-sm text-gray-700">
                  <p>
                    <span className="font-medium">Nombre:</span>{" "}
                    {selectedRequest.full_name}
                  </p>
                  <p>
                    <span className="font-medium">Documento:</span>{" "}
                    {selectedRequest.document_type}{" "}
                    {selectedRequest.document_number}
                  </p>
                  <p>
                    <span className="font-medium">Área:</span>{" "}
                    {selectedRequest.area}
                  </p>
                  <p>
                    <span className="font-medium">Cargo:</span>{" "}
                    {selectedRequest.position}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <h3 className="font-semibold text-gray-900">
                  Información laboral
                </h3>

                <div className="mt-3 space-y-2 text-sm text-gray-700">
                  <p>
                    <span className="font-medium">Fecha estimada:</span>{" "}
                    {formatDate(selectedRequest.hire_date)}
                  </p>
                  <p>
                    <span className="font-medium">Contrato:</span>{" "}
                    {selectedRequest.contract_type ?? "Sin definir"}
                  </p>
                  <p>
                    <span className="font-medium">Correo empleado:</span>{" "}
                    {selectedRequest.email ?? "Sin correo"}
                  </p>
                  <p>
                    <span className="font-medium">Teléfono:</span>{" "}
                    {selectedRequest.phone ?? "Sin teléfono"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <h3 className="font-semibold text-gray-900">
                  Fechas de gestión
                </h3>

                <div className="mt-3 space-y-2 text-sm text-gray-700">
                  <p>
                    <span className="font-medium">Creada:</span>{" "}
                    {formatDate(selectedRequest.created_at)}
                  </p>
                  <p>
                    <span className="font-medium">Aprobada:</span>{" "}
                    {formatDate(selectedRequest.approved_at)}
                  </p>
                  <p>
                    <span className="font-medium">Rechazada:</span>{" "}
                    {formatDate(selectedRequest.rejected_at)}
                  </p>
                  <p>
                    <span className="font-medium">Empleado creado:</span>{" "}
                    {formatDate(selectedRequest.completed_at)}
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
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-5">
              {selectedRequest.status === "Pendiente" && (
                <>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => approveRequest(selectedRequest)}
                    className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    Aprobar solicitud
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => openRejectModal(selectedRequest)}
                    className="rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                  >
                    Rechazar solicitud
                  </button>
                </>
              )}

              {selectedRequest.status === "Aprobada" && (
                <a
                  href={`/configuracion/personal/base-datos?requestId=${selectedRequest.id}`}
                  className="rounded-full bg-[#07076b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#05054f]"
                >
                  Crear empleado
                </a>
              )}
            </div>
          </div>
        </div>
      )}

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
              Escribe el motivo por el cual se rechaza la solicitud de creación
              de personal.
            </p>

            <textarea
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
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
                {actionLoading ? "Rechazando..." : "Confirmar rechazo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
