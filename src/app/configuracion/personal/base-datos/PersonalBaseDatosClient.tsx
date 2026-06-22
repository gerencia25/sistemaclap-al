"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Employee = {
  id: string;
  employee_code: string;
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
  employment_status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type EmployeeRequest = {
  id: string;
  request_number: string;
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
};

type EmployeeForm = {
  document_type: string;
  document_number: string;
  first_name: string;
  last_name: string;
  area: string;
  position: string;
  direct_manager_id: string;
  email: string;
  phone: string;
  hire_date: string;
  contract_type: string;
  employment_status: string;
  notes: string;
};

const emptyForm: EmployeeForm = {
  document_type: "Cédula de ciudadanía",
  document_number: "",
  first_name: "",
  last_name: "",
  area: "",
  position: "",
  direct_manager_id: "",
  email: "",
  phone: "",
  hire_date: "",
  contract_type: "",
  employment_status: "Activo",
  notes: "",
};

const documentTypes = [
  "Cédula de ciudadanía",
  "Cédula de extranjería",
  "Pasaporte",
  "Permiso especial de permanencia",
  "Otro",
];

const contractTypes = [
  "Término indefinido",
  "Término fijo",
  "Obra o labor",
  "Prestación de servicios",
  "Aprendizaje",
  "Temporal",
  "Otro",
];

const employmentStatuses = ["Activo", "Inactivo", "Retirado", "Suspendido"];

function formatDate(date: string | null) {
  if (!date) return "Sin fecha";

  const [year, month, day] = date.split("-");

  if (!year || !month || !day) return "Sin fecha";

  return `${Number(day)}/${Number(month)}/${year}`;
}

export default function PersonalBaseDatosClient() {
  const searchParams = useSearchParams();
  const requestId = searchParams.get("requestId");

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("Todos");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(
    null
  );
  const [linkedRequest, setLinkedRequest] = useState<EmployeeRequest | null>(
    null
  );

  const [form, setForm] = useState<EmployeeForm>(emptyForm);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (requestId) {
      fetchLinkedRequest(requestId);
    }
  }, [requestId]);

  const areas = useMemo(() => {
    const uniqueAreas = Array.from(
      new Set(employees.map((employee) => employee.area).filter(Boolean))
    );

    return uniqueAreas.sort();
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesSearch =
        !normalizedSearch ||
        employee.employee_code.toLowerCase().includes(normalizedSearch) ||
        employee.full_name.toLowerCase().includes(normalizedSearch) ||
        employee.document_number.toLowerCase().includes(normalizedSearch) ||
        employee.area.toLowerCase().includes(normalizedSearch) ||
        employee.position.toLowerCase().includes(normalizedSearch);

      const matchesArea =
        areaFilter === "Todos" || employee.area === areaFilter;

      const matchesStatus =
        statusFilter === "Todos" ||
        employee.employment_status === statusFilter;

      return matchesSearch && matchesArea && matchesStatus;
    });
  }, [employees, search, areaFilter, statusFilter]);

  const activeEmployees = employees.filter(
    (employee) => employee.employment_status === "Activo"
  ).length;

  const inactiveEmployees = employees.length - activeEmployees;

  async function fetchEmployees() {
    setLoading(true);

    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(`Error cargando personal: ${error.message}`);
      setLoading(false);
      return;
    }

    setEmployees((data ?? []) as Employee[]);
    setLoading(false);
  }

  async function fetchLinkedRequest(id: string) {
    const { data, error } = await supabase
      .from("employee_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      alert(`Error cargando la solicitud de personal: ${error.message}`);
      return;
    }

    const request = data as EmployeeRequest;

    setLinkedRequest(request);
    setEditingEmployeeId(null);
    setForm({
      document_type: request.document_type ?? "Cédula de ciudadanía",
      document_number: request.document_number ?? "",
      first_name: request.first_name ?? "",
      last_name: request.last_name ?? "",
      area: request.area ?? "",
      position: request.position ?? "",
      direct_manager_id: request.direct_manager_id ?? "",
      email: request.email ?? "",
      phone: request.phone ?? "",
      hire_date: request.hire_date ?? "",
      contract_type: request.contract_type ?? "",
      employment_status: "Activo",
      notes: request.detailed_description ?? "",
    });
    setIsModalOpen(true);
  }

  async function generateEmployeeCode() {
    const { data, error } = await supabase
      .from("employees")
      .select("employee_code")
      .ilike("employee_code", "EMP-%")
      .order("employee_code", { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(error.message);
    }

    const lastCode = data?.[0]?.employee_code as string | undefined;
    const match = lastCode?.match(/EMP-(\d+)/);
    const nextNumber = match ? Number(match[1]) + 1 : 1;

    return `EMP-${String(nextNumber).padStart(6, "0")}`;
  }

  function getManagerName(managerId: string | null) {
    if (!managerId) return "Sin jefe directo";

    const manager = employees.find((employee) => employee.id === managerId);
    return manager?.full_name ?? "Sin jefe directo";
  }

  function openCreateModal() {
    setEditingEmployeeId(null);
    setLinkedRequest(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  }

  function openEditModal(employee: Employee) {
    setEditingEmployeeId(employee.id);
    setLinkedRequest(null);
    setForm({
      document_type: employee.document_type,
      document_number: employee.document_number,
      first_name: employee.first_name,
      last_name: employee.last_name,
      area: employee.area,
      position: employee.position,
      direct_manager_id: employee.direct_manager_id ?? "",
      email: employee.email ?? "",
      phone: employee.phone ?? "",
      hire_date: employee.hire_date ?? "",
      contract_type: employee.contract_type ?? "",
      employment_status: employee.employment_status,
      notes: employee.notes ?? "",
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingEmployeeId(null);
    setLinkedRequest(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const firstName = form.first_name.trim();
    const lastName = form.last_name.trim();
    const fullName = `${firstName} ${lastName}`.trim();

    if (
      !form.document_type ||
      !form.document_number.trim() ||
      !firstName ||
      !lastName ||
      !form.area.trim() ||
      !form.position.trim()
    ) {
      alert("Completa los campos obligatorios.");
      return;
    }

    if (editingEmployeeId && form.direct_manager_id === editingEmployeeId) {
      alert("Un empleado no puede ser su propio jefe directo.");
      return;
    }

    setSaving(true);

    const payload = {
      document_type: form.document_type,
      document_number: form.document_number.trim(),
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      area: form.area.trim(),
      position: form.position.trim(),
      direct_manager_id: form.direct_manager_id || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      hire_date: form.hire_date || null,
      contract_type: form.contract_type || null,
      employment_status: form.employment_status,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (editingEmployeeId) {
      const { error } = await supabase
        .from("employees")
        .update(payload)
        .eq("id", editingEmployeeId);

      if (error) {
        setSaving(false);
        alert(`Error actualizando empleado: ${error.message}`);
        return;
      }
    } else {
      let employeeCode = "";

      try {
        employeeCode = await generateEmployeeCode();
      } catch (error) {
        setSaving(false);
        alert(
          error instanceof Error
            ? `Error generando código de empleado: ${error.message}`
            : "Error generando código de empleado."
        );
        return;
      }

      const { data: insertedEmployee, error } = await supabase
        .from("employees")
        .insert([
          {
            employee_code: employeeCode,
            ...payload,
          },
        ])
        .select("id")
        .single();

      if (error) {
        setSaving(false);
        alert(`Error creando empleado: ${error.message}`);
        return;
      }

      if (linkedRequest && insertedEmployee?.id) {
        const { error: requestError } = await supabase
          .from("employee_requests")
          .update({
            status: "Creado",
            created_employee_id: insertedEmployee.id,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", linkedRequest.id);

        if (requestError) {
          alert(
            `El empleado fue creado, pero no se pudo actualizar la solicitud: ${requestError.message}`
          );
        }
      }
    }

    await fetchEmployees();

    setSaving(false);
    closeModal();
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Configuración · Personal · Base de datos
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
            Base de datos de personal
          </h1>

          <p className="mt-3 max-w-4xl text-base leading-7 text-gray-600">
            Administra el maestro de empleados de la organización, su área,
            cargo, jefe directo, datos de contacto y estado laboral.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-full bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#05054f]"
        >
          Nuevo empleado
        </button>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total empleados</p>
          <p className="mt-2 text-3xl font-bold text-[#07076b]">
            {employees.length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Activos</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">
            {activeEmployees}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Inactivos / retirados
          </p>
          <p className="mt-2 text-3xl font-bold text-amber-700">
            {inactiveEmployees}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Buscar
            </label>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Código, nombre, documento, área o cargo"
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Área</label>
            <select
              value={areaFilter}
              onChange={(event) => setAreaFilter(event.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
            >
              <option value="Todos">Todas las áreas</option>
              {areas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Estado</label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
            >
              <option value="Todos">Todos los estados</option>
              {employmentStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
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
                  Código
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Empleado
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Documento
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Área / Cargo
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Jefe directo
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Contacto
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
                    colSpan={8}
                    className="px-5 py-10 text-center text-sm text-gray-500"
                  >
                    Cargando personal...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-10 text-center text-sm text-gray-500"
                  >
                    No se encontraron empleados con ese criterio.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 text-sm font-semibold text-[#07076b]">
                      {employee.employee_code}
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-gray-900">
                        {employee.full_name}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Ingreso: {formatDate(employee.hire_date)}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-900">
                        {employee.document_number}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {employee.document_type}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-900">
                        {employee.area}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {employee.position}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-700">
                      {getManagerName(employee.direct_manager_id)}
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-900">
                        {employee.email ?? "Sin correo"}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {employee.phone ?? "Sin teléfono"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          employee.employment_status === "Activo"
                            ? "bg-emerald-50 text-emerald-700"
                            : employee.employment_status === "Retirado"
                            ? "bg-gray-100 text-gray-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {employee.employment_status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openEditModal(employee)}
                        className="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-[#07076b] transition hover:border-[#07076b] hover:bg-[#07076b] hover:text-white"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
          <div className="w-full max-w-5xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex flex-col justify-between gap-4 border-b border-gray-100 pb-5 md:flex-row md:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
                  {editingEmployeeId
                    ? "Editar empleado"
                    : linkedRequest
                    ? `Solicitud ${linkedRequest.request_number}`
                    : "Nuevo empleado"}
                </p>

                <h2 className="mt-2 text-2xl font-bold text-[#07076b]">
                  {editingEmployeeId
                    ? "Actualizar empleado"
                    : "Registrar empleado"}
                </h2>

                {linkedRequest && (
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                    Este empleado se creará a partir de una solicitud aprobada.
                    Al guardar, la solicitud quedará marcada como Creado.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-8">
              <section>
                <h3 className="text-base font-semibold text-gray-900">
                  Información básica
                </h3>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Tipo de documento *
                    </label>
                    <select
                      value={form.document_type}
                      onChange={(event) =>
                        setForm({ ...form, document_type: event.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                    >
                      {documentTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Número de documento *
                    </label>
                    <input
                      type="text"
                      value={form.document_number}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          document_number: event.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Nombres *
                    </label>
                    <input
                      type="text"
                      value={form.first_name}
                      onChange={(event) =>
                        setForm({ ...form, first_name: event.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Apellidos *
                    </label>
                    <input
                      type="text"
                      value={form.last_name}
                      onChange={(event) =>
                        setForm({ ...form, last_name: event.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                    />
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-base font-semibold text-gray-900">
                  Información laboral
                </h3>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Área *
                    </label>
                    <input
                      type="text"
                      value={form.area}
                      onChange={(event) =>
                        setForm({ ...form, area: event.target.value })
                      }
                      placeholder="Producción, Comercial, Logística..."
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Cargo *
                    </label>
                    <input
                      type="text"
                      value={form.position}
                      onChange={(event) =>
                        setForm({ ...form, position: event.target.value })
                      }
                      placeholder="Gerente, Auxiliar, Operario..."
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Jefe directo
                    </label>
                    <select
                      value={form.direct_manager_id}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          direct_manager_id: event.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                    >
                      <option value="">Sin jefe directo</option>
                      {employees
                        .filter((employee) => employee.id !== editingEmployeeId)
                        .map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.full_name} · {employee.position}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Fecha de ingreso
                    </label>
                    <input
                      type="date"
                      value={form.hire_date}
                      onChange={(event) =>
                        setForm({ ...form, hire_date: event.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Tipo de contrato
                    </label>
                    <select
                      value={form.contract_type}
                      onChange={(event) =>
                        setForm({ ...form, contract_type: event.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                    >
                      <option value="">Seleccionar</option>
                      {contractTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Estado laboral
                    </label>
                    <select
                      value={form.employment_status}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          employment_status: event.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                    >
                      {employmentStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-base font-semibold text-gray-900">
                  Contacto y observaciones
                </h3>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Correo
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        setForm({ ...form, email: event.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Teléfono
                    </label>
                    <input
                      type="text"
                      value={form.phone}
                      onChange={(event) =>
                        setForm({ ...form, phone: event.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">
                      Observaciones
                    </label>
                    <textarea
                      value={form.notes}
                      onChange={(event) =>
                        setForm({ ...form, notes: event.target.value })
                      }
                      rows={4}
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                    />
                  </div>
                </div>
              </section>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#05054f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Guardando..."
                    : editingEmployeeId
                    ? "Actualizar empleado"
                    : "Guardar empleado"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
