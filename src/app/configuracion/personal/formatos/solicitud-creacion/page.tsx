"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Employee = {
  id: string;
  full_name: string;
  position: string;
  employment_status: string;
};

type CompanyArea = {
  id: string;
  name: string;
  status: string;
};

type CompanyPosition = {
  id: string;
  area_id: string;
  name: string;
  status: string;
};

type RequestForm = {
  requester_area: string;
  requester_name: string;
  requester_position: string;
  requester_email: string;

  document_type: string;
  document_number: string;
  first_name: string;
  last_name: string;

  area_id: string;
  position_id: string;

  direct_manager_id: string;
  email: string;
  phone: string;
  hire_date: string;
  contract_type: string;

  detailed_description: string;
};

const emptyForm: RequestForm = {
  requester_area: "",
  requester_name: "",
  requester_position: "",
  requester_email: "",

  document_type: "Cédula de ciudadanía",
  document_number: "",
  first_name: "",
  last_name: "",

  area_id: "",
  position_id: "",

  direct_manager_id: "",
  email: "",
  phone: "",
  hire_date: "",
  contract_type: "",

  detailed_description: "",
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

export default function SolicitudCreacionPersonalPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [areas, setAreas] = useState<CompanyArea[]>([]);
  const [positions, setPositions] = useState<CompanyPosition[]>([]);

  const [form, setForm] = useState<RequestForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [createdRequestNumber, setCreatedRequestNumber] = useState<string | null>(
    null
  );

  useEffect(() => {
    fetchInitialData();
  }, []);

  const filteredPositions = useMemo(() => {
    return positions.filter((position) => position.area_id === form.area_id);
  }, [positions, form.area_id]);

  const selectedArea = useMemo(() => {
    return areas.find((area) => area.id === form.area_id) ?? null;
  }, [areas, form.area_id]);

  const selectedPosition = useMemo(() => {
    return positions.find((position) => position.id === form.position_id) ?? null;
  }, [positions, form.position_id]);

  async function fetchInitialData() {
    const { data: employeesData, error: employeesError } = await supabase
      .from("employees")
      .select("id, full_name, position, employment_status")
      .eq("employment_status", "Activo")
      .order("full_name", { ascending: true });

    if (employeesError) {
      alert(`Error cargando empleados: ${employeesError.message}`);
      return;
    }

    const { data: areasData, error: areasError } = await supabase
      .from("company_areas")
      .select("id, name, status")
      .eq("status", "Activa")
      .order("name", { ascending: true });

    if (areasError) {
      alert(`Error cargando áreas: ${areasError.message}`);
      return;
    }

    const { data: positionsData, error: positionsError } = await supabase
      .from("company_positions")
      .select("id, area_id, name, status")
      .eq("status", "Activo")
      .order("name", { ascending: true });

    if (positionsError) {
      alert(`Error cargando cargos: ${positionsError.message}`);
      return;
    }

    setEmployees((employeesData ?? []) as Employee[]);
    setAreas((areasData ?? []) as CompanyArea[]);
    setPositions((positionsData ?? []) as CompanyPosition[]);
  }

  async function generateRequestNumber() {
    const { data, error } = await supabase
      .from("employee_requests")
      .select("request_number")
      .ilike("request_number", "SCP-%")
      .order("request_number", { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(error.message);
    }

    const lastCode = data?.[0]?.request_number as string | undefined;
    const match = lastCode?.match(/SCP-(\d+)/);
    const nextNumber = match ? Number(match[1]) + 1 : 1;

    return `SCP-${String(nextNumber).padStart(6, "0")}`;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const firstName = form.first_name.trim();
    const lastName = form.last_name.trim();
    const fullName = `${firstName} ${lastName}`.trim();

    if (
      !form.requester_area.trim() ||
      !form.requester_name.trim() ||
      !form.requester_position.trim() ||
      !form.requester_email.trim() ||
      !form.document_type ||
      !form.document_number.trim() ||
      !firstName ||
      !lastName ||
      !form.area_id ||
      !form.position_id
    ) {
      alert("Completa todos los campos obligatorios.");
      return;
    }

    if (!selectedArea || !selectedPosition) {
      alert("Selecciona un área y cargo válidos.");
      return;
    }

    const areaName = selectedArea.name;
    const positionName = selectedPosition.name;

    setSaving(true);
    setCreatedRequestNumber(null);

    let requestNumber = "";

    try {
      requestNumber = await generateRequestNumber();
    } catch (error) {
      setSaving(false);
      alert(
        error instanceof Error
          ? `Error generando consecutivo: ${error.message}`
          : "Error generando consecutivo."
      );
      return;
    }

    const { error } = await supabase.from("employee_requests").insert([
      {
        request_number: requestNumber,

        requester_area: form.requester_area.trim(),
        requester_name: form.requester_name.trim(),
        requester_position: form.requester_position.trim(),
        requester_email: form.requester_email.trim(),

        request_type: "Creación",

        document_type: form.document_type,
        document_number: form.document_number.trim(),

        first_name: firstName,
        last_name: lastName,
        full_name: fullName,

        area_id: form.area_id,
        position_id: form.position_id,
        area: areaName,
        position: positionName,

        direct_manager_id: form.direct_manager_id || null,

        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        hire_date: form.hire_date || null,
        contract_type: form.contract_type || null,

        detailed_description: form.detailed_description.trim() || null,

        status: "Pendiente",
        updated_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      setSaving(false);
      alert(`Error creando solicitud: ${error.message}`);
      return;
    }

    try {
      await fetch("/api/send-personal-request-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestNumber,
          requesterName: form.requester_name.trim(),
          requesterArea: form.requester_area.trim(),
          requesterPosition: form.requester_position.trim(),
          requesterEmail: form.requester_email.trim(),
          employeeFullName: fullName,
          documentNumber: form.document_number.trim(),
          area: areaName,
          position: positionName,
          hireDate: form.hire_date || null,
          contractType: form.contract_type || null,
          detailedDescription: form.detailed_description.trim() || null,
        }),
      });
    } catch (emailError) {
      console.error("Error enviando correo de solicitud de personal:", emailError);
    }

    setCreatedRequestNumber(requestNumber);
    setForm(emptyForm);
    setSaving(false);
  }

  return (
    <div className="space-y-8">
      <section>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
          Configuración · Personal · Formatos
        </p>

        <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
          Solicitud creación de personal
        </h1>

        <p className="mt-3 max-w-4xl text-base leading-7 text-gray-600">
          Diligencia este formulario para solicitar la creación de un nuevo
          empleado en la base de datos de personal.
        </p>
      </section>

      {createdRequestNumber && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-semibold text-emerald-800">
            Solicitud creada correctamente
          </p>
          <p className="mt-1 text-sm text-emerald-700">
            Consecutivo generado:{" "}
            <span className="font-bold">{createdRequestNumber}</span>
          </p>
        </section>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <section>
          <h2 className="text-xl font-bold text-[#07076b]">
            1. Información del solicitante
          </h2>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Área solicitante *
              </label>
              <input
                type="text"
                value={form.requester_area}
                onChange={(event) =>
                  setForm({ ...form, requester_area: event.target.value })
                }
                placeholder="Producción, Comercial, Gestión Humana..."
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Nombre del solicitante *
              </label>
              <input
                type="text"
                value={form.requester_name}
                onChange={(event) =>
                  setForm({ ...form, requester_name: event.target.value })
                }
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Cargo del solicitante *
              </label>
              <input
                type="text"
                value={form.requester_position}
                onChange={(event) =>
                  setForm({ ...form, requester_position: event.target.value })
                }
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Correo del solicitante *
              </label>
              <input
                type="email"
                value={form.requester_email}
                onChange={(event) =>
                  setForm({ ...form, requester_email: event.target.value })
                }
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#07076b]">
            2. Información básica del personal
          </h2>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
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
                  setForm({ ...form, document_number: event.target.value })
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
          <h2 className="text-xl font-bold text-[#07076b]">
            3. Información laboral
          </h2>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Área *
              </label>
              <select
                value={form.area_id}
                onChange={(event) =>
                  setForm({
                    ...form,
                    area_id: event.target.value,
                    position_id: "",
                  })
                }
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
              >
                <option value="">Seleccionar área</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Cargo *
              </label>
              <select
                value={form.position_id}
                onChange={(event) =>
                  setForm({ ...form, position_id: event.target.value })
                }
                disabled={!form.area_id}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b] disabled:cursor-not-allowed disabled:bg-gray-50"
              >
                <option value="">
                  {form.area_id ? "Seleccionar cargo" : "Primero selecciona un área"}
                </option>
                {filteredPositions.map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Jefe directo
              </label>
              <select
                value={form.direct_manager_id}
                onChange={(event) =>
                  setForm({ ...form, direct_manager_id: event.target.value })
                }
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
              >
                <option value="">Sin jefe directo</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name} · {employee.position}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Fecha estimada de ingreso
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
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#07076b]">
            4. Contacto y observaciones
          </h2>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Correo del empleado
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
                Descripción / justificación
              </label>
              <textarea
                value={form.detailed_description}
                onChange={(event) =>
                  setForm({
                    ...form,
                    detailed_description: event.target.value,
                  })
                }
                rows={5}
                placeholder="Describe la necesidad de creación del nuevo empleado, área, cargo o cualquier información adicional."
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
          <button
            type="button"
            onClick={() => {
              setForm(emptyForm);
              setCreatedRequestNumber(null);
            }}
            className="rounded-full border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            Limpiar
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#05054f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Enviando solicitud..." : "Crear solicitud"}
          </button>
        </div>
      </form>
    </div>
  );
}
