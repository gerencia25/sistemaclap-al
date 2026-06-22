"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Employee = {
  id: string;
  full_name: string;
  position: string;
  employment_status: string;
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

  area: string;
  position: string;
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

  area: "",
  position: "",
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
  const [form, setForm] = useState<RequestForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [createdRequestNumber, setCreatedRequestNumber] = useState<
    string | null
  >(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    const { data, error } = await supabase
      .from("employees")
      .select("id, full_name, position, employment_status")
      .eq("employment_status", "Activo")
      .order("full_name", { ascending: true });

    if (error) {
      alert(`Error cargando empleados: ${error.message}`);
      return;
    }

    setEmployees((data ?? []) as Employee[]);
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
      !form.area.trim() ||
      !form.position.trim()
    ) {
      alert("Completa todos los campos obligatorios.");
      return;
    }

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

        area: form.area.trim(),
        position: form.position.trim(),

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
              <input
                type="text"
                value={form.area}
                onChange={(event) =>
                  setForm({ ...form, area: event.target.value })
                }
                placeholder="Producción, Comercial, Operaciones..."
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
                placeholder="Operario, Auxiliar, Coordinador..."
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
