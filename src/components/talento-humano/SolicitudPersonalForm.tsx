"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth/AuthProvider";

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

type Employee = {
  id: string;
  full_name: string;
  area_id: string | null;
  position_id: string | null;
  employment_status: string;
};

type RequestForm = {
  requester_area: string;
  requester_name: string;
  requester_position: string;
  requester_email: string;

  request_reason: string;

  area_id: string;
  position_id: string;

  requested_quantity: number;
  required_date: string;
  contract_type: string;

  replacement_employee_id: string;

  detailed_description: string;
};

const requestReasons = [
  "Aumento de carga",
  "Reemplazo por retiro o renuncia",
  "Reemplazo de personal",
  "Vacante disponible",
  "Necesidad temporal",
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

function isReplacementReason(reason: string) {
  return reason === "Reemplazo por retiro o renuncia" ||
    reason === "Reemplazo de personal";
}

export default function SolicitudPersonalForm({
  originLabel,
}: {
  originLabel: string;
}) {
  const { systemUser } = useAuth();

  const [areas, setAreas] = useState<CompanyArea[]>([]);
  const [positions, setPositions] = useState<CompanyPosition[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [form, setForm] = useState<RequestForm>({
    requester_area: originLabel,
    requester_name: "",
    requester_position: "",
    requester_email: "",

    request_reason: "",

    area_id: "",
    position_id: "",

    requested_quantity: 1,
    required_date: "",
    contract_type: "",

    replacement_employee_id: "",

    detailed_description: "",
  });

  const [saving, setSaving] = useState(false);

  const [createdRequestNumber, setCreatedRequestNumber] =
    useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    async function loadRequester() {
      if (!systemUser) return;

      let positionName = "Sin cargo registrado";

      if (systemUser.employee_id) {
        const { data: employeeData } = await supabase
          .from("employees")
          .select("position_id, position")
          .eq("id", systemUser.employee_id)
          .maybeSingle();

        if (employeeData?.position_id) {
          const { data: positionData } = await supabase
            .from("company_positions")
            .select("name")
            .eq("id", employeeData.position_id)
            .maybeSingle();

          if (positionData?.name) {
            positionName = positionData.name;
          } else if (employeeData.position) {
            positionName = employeeData.position;
          }
        } else if (employeeData?.position) {
          positionName = employeeData.position;
        }
      }

      setForm((current) => ({
        ...current,
        requester_area: originLabel,
        requester_name: systemUser.full_name ?? "",
        requester_position: positionName,
        requester_email: systemUser.email ?? "",
      }));
    }

    loadRequester();
  }, [systemUser, originLabel]);

  const filteredPositions = useMemo(() => {
    return positions.filter(
      (position) => position.area_id === form.area_id
    );
  }, [positions, form.area_id]);

  const selectedArea = useMemo(() => {
    return areas.find((area) => area.id === form.area_id) ?? null;
  }, [areas, form.area_id]);

  const selectedPosition = useMemo(() => {
    return (
      positions.find(
        (position) => position.id === form.position_id
      ) ?? null
    );
  }, [positions, form.position_id]);

  const replacementEmployees = useMemo(() => {
    if (!form.area_id || !form.position_id) return [];

    return employees.filter(
      (employee) =>
        employee.area_id === form.area_id &&
        employee.position_id === form.position_id
    );
  }, [employees, form.area_id, form.position_id]);

  const selectedReplacementEmployee = useMemo(() => {
    return (
      employees.find(
        (employee) =>
          employee.id === form.replacement_employee_id
      ) ?? null
    );
  }, [employees, form.replacement_employee_id]);

  async function fetchInitialData() {
    const [
      areasResult,
      positionsResult,
      employeesResult,
    ] = await Promise.all([
      supabase
        .from("company_areas")
        .select("id, name, status")
        .eq("status", "Activa")
        .order("name", { ascending: true }),

      supabase
        .from("company_positions")
        .select("id, area_id, name, status")
        .eq("status", "Activo")
        .order("name", { ascending: true }),

      supabase
        .from("employees")
        .select(
          "id, full_name, area_id, position_id, employment_status"
        )
        .order("full_name", { ascending: true }),
    ]);

    if (areasResult.error) {
      alert(
        `Error cargando áreas: ${areasResult.error.message}`
      );
      return;
    }

    if (positionsResult.error) {
      alert(
        `Error cargando cargos: ${positionsResult.error.message}`
      );
      return;
    }

    if (employeesResult.error) {
      alert(
        `Error cargando personal: ${employeesResult.error.message}`
      );
      return;
    }

    setAreas((areasResult.data ?? []) as CompanyArea[]);
    setPositions(
      (positionsResult.data ?? []) as CompanyPosition[]
    );
    setEmployees((employeesResult.data ?? []) as Employee[]);
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

    const lastCode =
      data?.[0]?.request_number as string | undefined;

    const match = lastCode?.match(/SCP-(\d+)/);

    const nextNumber = match
      ? Number(match[1]) + 1
      : 1;

    return `SCP-${String(nextNumber).padStart(6, "0")}`;
  }

  function handleAreaChange(areaId: string) {
    setForm((current) => ({
      ...current,
      area_id: areaId,
      position_id: "",
      replacement_employee_id: "",
    }));
  }

  function handlePositionChange(positionId: string) {
    setForm((current) => ({
      ...current,
      position_id: positionId,
      replacement_employee_id: "",
    }));
  }

  function handleReasonChange(reason: string) {
    setForm((current) => ({
      ...current,
      request_reason: reason,
      replacement_employee_id: isReplacementReason(reason)
        ? current.replacement_employee_id
        : "",
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !form.requester_area.trim() ||
      !form.requester_name.trim() ||
      !form.requester_email.trim() ||
      !form.request_reason ||
      !form.area_id ||
      !form.position_id ||
      form.requested_quantity < 1 ||
      !form.detailed_description.trim()
    ) {
      alert("Completa todos los campos obligatorios.");
      return;
    }

    if (!selectedArea || !selectedPosition) {
      alert("Selecciona un área y cargo válidos.");
      return;
    }

    if (
      isReplacementReason(form.request_reason) &&
      !form.replacement_employee_id
    ) {
      alert(
        "Selecciona la persona que será reemplazada."
      );
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

    const { error } = await supabase
      .from("employee_requests")
      .insert([
        {
          request_number: requestNumber,

          requester_area:
            form.requester_area.trim(),
          requester_name:
            form.requester_name.trim(),
          requester_position:
            form.requester_position.trim() ||
            "Sin cargo registrado",
          requester_email:
            form.requester_email.trim(),

          request_type: "Solicitud de personal",
          request_reason: form.request_reason,

          area_id: form.area_id,
          position_id: form.position_id,

          area: selectedArea.name,
          position: selectedPosition.name,

          requested_quantity:
            form.requested_quantity,

          required_date:
            form.required_date || null,

          contract_type:
            form.contract_type || null,

          replacement_employee_id:
            form.replacement_employee_id || null,

          detailed_description:
            form.detailed_description.trim(),

          status: "Pendiente",
          updated_at: new Date().toISOString(),
        },
      ]);

    if (error) {
      setSaving(false);

      alert(
        `Error creando solicitud: ${error.message}`
      );

      return;
    }

    try {
      await fetch(
        "/api/send-personal-request-email",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requestNumber,

            requesterName:
              form.requester_name.trim(),
            requesterArea:
              form.requester_area.trim(),
            requesterPosition:
              form.requester_position.trim() ||
              "Sin cargo registrado",
            requesterEmail:
              form.requester_email.trim(),

            requestReason:
              form.request_reason,

            area:
              selectedArea.name,
            position:
              selectedPosition.name,

            requestedQuantity:
              form.requested_quantity,
            requiredDate:
              form.required_date || null,
            contractType:
              form.contract_type || null,

            replacementEmployeeName:
              selectedReplacementEmployee?.full_name ??
              null,

            detailedDescription:
              form.detailed_description.trim(),
          }),
        }
      );
    } catch (emailError) {
      console.error(
        "Error enviando correo de solicitud de personal:",
        emailError
      );
    }

    setCreatedRequestNumber(requestNumber);

    setForm((current) => ({
      requester_area: originLabel,
      requester_name: current.requester_name,
      requester_position:
        current.requester_position,
      requester_email:
        current.requester_email,

      request_reason: "",

      area_id: "",
      position_id: "",

      requested_quantity: 1,
      required_date: "",
      contract_type: "",

      replacement_employee_id: "",

      detailed_description: "",
    }));

    setSaving(false);
  }

  return (
    <div className="space-y-8">
      <section>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
          {originLabel} · Solicitud de personal
        </p>

        <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
          Solicitud de personal
        </h1>

        <p className="mt-3 max-w-4xl text-base leading-7 text-gray-600">
          Registra una necesidad de personal para que
          Talento Humano pueda revisar y gestionar el
          requerimiento.
        </p>
      </section>

      {createdRequestNumber && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-semibold text-emerald-800">
            Solicitud creada correctamente
          </p>

          <p className="mt-1 text-sm text-emerald-700">
            Consecutivo generado:{" "}
            <span className="font-bold">
              {createdRequestNumber}
            </span>
          </p>
        </section>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[#07076b]">
              Información del solicitante
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Estos datos se toman automáticamente del
              usuario que está realizando la solicitud.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Área solicitante
              </label>

              <input
                value={form.requester_area}
                readOnly
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Nombre del solicitante
              </label>

              <input
                value={form.requester_name}
                readOnly
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Cargo
              </label>

              <input
                value={form.requester_position}
                readOnly
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Correo
              </label>

              <input
                value={form.requester_email}
                readOnly
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[#07076b]">
              Necesidad de personal
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Describe el cargo y la necesidad que debe
              gestionar Talento Humano.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Motivo de la solicitud *
              </label>

              <select
                value={form.request_reason}
                onChange={(event) =>
                  handleReasonChange(event.target.value)
                }
                required
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-[#07076b]"
              >
                <option value="">
                  Selecciona un motivo
                </option>

                {requestReasons.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Cantidad de personas *
              </label>

              <input
                type="number"
                min={1}
                value={form.requested_quantity}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    requested_quantity: Math.max(
                      1,
                      Number(event.target.value) || 1
                    ),
                  }))
                }
                required
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-[#07076b]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Área donde se requiere *
              </label>

              <select
                value={form.area_id}
                onChange={(event) =>
                  handleAreaChange(event.target.value)
                }
                required
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-[#07076b]"
              >
                <option value="">
                  Selecciona un área
                </option>

                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Cargo requerido *
              </label>

              <select
                value={form.position_id}
                onChange={(event) =>
                  handlePositionChange(
                    event.target.value
                  )
                }
                disabled={!form.area_id}
                required
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none disabled:bg-gray-50 disabled:text-gray-400 focus:border-[#07076b]"
              >
                <option value="">
                  {form.area_id
                    ? "Selecciona un cargo"
                    : "Primero selecciona un área"}
                </option>

                {filteredPositions.map((position) => (
                  <option
                    key={position.id}
                    value={position.id}
                  >
                    {position.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Fecha requerida
              </label>

              <input
                type="date"
                value={form.required_date}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    required_date:
                      event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-[#07076b]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Tipo de contrato sugerido
              </label>

              <select
                value={form.contract_type}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    contract_type:
                      event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-[#07076b]"
              >
                <option value="">
                  Sin definir
                </option>

                {contractTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isReplacementReason(
            form.request_reason
          ) && (
            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Persona a reemplazar *
              </label>

              <select
                value={
                  form.replacement_employee_id
                }
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    replacement_employee_id:
                      event.target.value,
                  }))
                }
                disabled={
                  !form.area_id ||
                  !form.position_id
                }
                required
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none disabled:bg-gray-50 disabled:text-gray-400 focus:border-[#07076b]"
              >
                <option value="">
                  {!form.area_id ||
                  !form.position_id
                    ? "Primero selecciona área y cargo"
                    : replacementEmployees.length === 0
                    ? "No hay personal registrado en este cargo"
                    : "Selecciona la persona"}
                </option>

                {replacementEmployees.map(
                  (employee) => (
                    <option
                      key={employee.id}
                      value={employee.id}
                    >
                      {employee.full_name} ·{" "}
                      {employee.employment_status}
                    </option>
                  )
                )}
              </select>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Justificación / necesidad / perfil requerido *
            </label>

            <textarea
              value={form.detailed_description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  detailed_description:
                    event.target.value,
                }))
              }
              rows={6}
              required
              placeholder="Describe por qué se requiere el personal, principales necesidades del cargo, experiencia o conocimientos requeridos y cualquier información relevante para Talento Humano."
              className="w-full resize-y rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-[#07076b]"
            />
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#07076b] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Enviando..."
              : "Enviar solicitud"}
          </button>
        </div>
      </form>
    </div>
  );
}