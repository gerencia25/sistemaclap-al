"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type CompanyArea = {
  id: string;
  area_code: string;
  name: string;
  description: string | null;
  manager_employee_id: string | null;
  parent_area_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type CompanyPosition = {
  id: string;
  position_code: string;
  area_id: string;
  name: string;
  description: string | null;
  hierarchy_level: string;
  reports_to_position_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  company_areas?: {
    name: string;
  } | null;
};

const hierarchyLevels = [
  "Directivo",
  "Gerencial",
  "Coordinador",
  "Administrativo",
  "Operativo",
  "Aprendiz",
  "Otro",
];

export default function AreasCargosPage() {
  const [activeTab, setActiveTab] = useState<"areas" | "cargos">("areas");

  const [areas, setAreas] = useState<CompanyArea[]>([]);
  const [positions, setPositions] = useState<CompanyPosition[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [areaSearch, setAreaSearch] = useState("");
  const [positionSearch, setPositionSearch] = useState("");

  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false);

  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [editingPositionId, setEditingPositionId] = useState<string | null>(
    null
  );

  const [areaForm, setAreaForm] = useState({
    name: "",
    description: "",
    manager_employee_id: "",
    parent_area_id: "",
    status: "Activa",
  });

  const [positionForm, setPositionForm] = useState({
    area_id: "",
    name: "",
    description: "",
    hierarchy_level: "Operativo",
    reports_to_position_id: "",
    status: "Activo",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const filteredAreas = useMemo(() => {
    const normalizedSearch = areaSearch.trim().toLowerCase();

    return areas.filter((area) => {
      return (
        !normalizedSearch ||
        area.area_code.toLowerCase().includes(normalizedSearch) ||
        area.name.toLowerCase().includes(normalizedSearch) ||
        (area.description ?? "").toLowerCase().includes(normalizedSearch)
      );
    });
  }, [areas, areaSearch]);

  const filteredPositions = useMemo(() => {
    const normalizedSearch = positionSearch.trim().toLowerCase();

    return positions.filter((position) => {
      const areaName =
        areas.find((area) => area.id === position.area_id)?.name ?? "";

      return (
        !normalizedSearch ||
        position.position_code.toLowerCase().includes(normalizedSearch) ||
        position.name.toLowerCase().includes(normalizedSearch) ||
        areaName.toLowerCase().includes(normalizedSearch) ||
        position.hierarchy_level.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [positions, positionSearch, areas]);

  async function fetchData() {
    setLoading(true);

    const { data: areasData, error: areasError } = await supabase
      .from("company_areas")
      .select("*")
      .order("name", { ascending: true });

    if (areasError) {
      alert(`Error cargando áreas: ${areasError.message}`);
      setLoading(false);
      return;
    }

    const { data: positionsData, error: positionsError } = await supabase
      .from("company_positions")
      .select("*")
      .order("name", { ascending: true });

    if (positionsError) {
      alert(`Error cargando cargos: ${positionsError.message}`);
      setLoading(false);
      return;
    }

    setAreas((areasData ?? []) as CompanyArea[]);
    setPositions((positionsData ?? []) as CompanyPosition[]);
    setLoading(false);
  }

  async function generateAreaCode() {
    const { data, error } = await supabase
      .from("company_areas")
      .select("area_code")
      .ilike("area_code", "AR-%")
      .order("area_code", { ascending: false })
      .limit(1);

    if (error) throw new Error(error.message);

    const lastCode = data?.[0]?.area_code as string | undefined;
    const match = lastCode?.match(/AR-(\d+)/);
    const nextNumber = match ? Number(match[1]) + 1 : 1;

    return `AR-${String(nextNumber).padStart(6, "0")}`;
  }

  async function generatePositionCode() {
    const { data, error } = await supabase
      .from("company_positions")
      .select("position_code")
      .ilike("position_code", "CG-%")
      .order("position_code", { ascending: false })
      .limit(1);

    if (error) throw new Error(error.message);

    const lastCode = data?.[0]?.position_code as string | undefined;
    const match = lastCode?.match(/CG-(\d+)/);
    const nextNumber = match ? Number(match[1]) + 1 : 1;

    return `CG-${String(nextNumber).padStart(6, "0")}`;
  }

  function openCreateAreaModal() {
    setEditingAreaId(null);
    setAreaForm({
      name: "",
      description: "",
      manager_employee_id: "",
      parent_area_id: "",
      status: "Activa",
    });
    setIsAreaModalOpen(true);
  }

  function openEditAreaModal(area: CompanyArea) {
    setEditingAreaId(area.id);
    setAreaForm({
      name: area.name,
      description: area.description ?? "",
      manager_employee_id: area.manager_employee_id ?? "",
      parent_area_id: area.parent_area_id ?? "",
      status: area.status,
    });
    setIsAreaModalOpen(true);
  }

  function openCreatePositionModal() {
    setEditingPositionId(null);
    setPositionForm({
      area_id: areas[0]?.id ?? "",
      name: "",
      description: "",
      hierarchy_level: "Operativo",
      reports_to_position_id: "",
      status: "Activo",
    });
    setIsPositionModalOpen(true);
  }

  function openEditPositionModal(position: CompanyPosition) {
    setEditingPositionId(position.id);
    setPositionForm({
      area_id: position.area_id,
      name: position.name,
      description: position.description ?? "",
      hierarchy_level: position.hierarchy_level,
      reports_to_position_id: position.reports_to_position_id ?? "",
      status: position.status,
    });
    setIsPositionModalOpen(true);
  }

  async function saveArea() {
    if (!areaForm.name.trim()) {
      alert("El nombre del área es obligatorio.");
      return;
    }

    if (editingAreaId && areaForm.parent_area_id === editingAreaId) {
      alert("Un área no puede depender de sí misma.");
      return;
    }

    setSaving(true);

    const payload = {
      name: areaForm.name.trim(),
      description: areaForm.description.trim() || null,
      manager_employee_id: areaForm.manager_employee_id || null,
      parent_area_id: areaForm.parent_area_id || null,
      status: areaForm.status,
      updated_at: new Date().toISOString(),
    };

    if (editingAreaId) {
      const { error } = await supabase
        .from("company_areas")
        .update(payload)
        .eq("id", editingAreaId);

      if (error) {
        setSaving(false);
        alert(`Error actualizando área: ${error.message}`);
        return;
      }
    } else {
      let areaCode = "";

      try {
        areaCode = await generateAreaCode();
      } catch (error) {
        setSaving(false);
        alert(
          error instanceof Error
            ? `Error generando código de área: ${error.message}`
            : "Error generando código de área."
        );
        return;
      }

      const { error } = await supabase.from("company_areas").insert([
        {
          area_code: areaCode,
          ...payload,
        },
      ]);

      if (error) {
        setSaving(false);
        alert(`Error creando área: ${error.message}`);
        return;
      }
    }

    await fetchData();
    setSaving(false);
    setIsAreaModalOpen(false);
  }

  async function savePosition() {
    if (!positionForm.area_id || !positionForm.name.trim()) {
      alert("El área y el nombre del cargo son obligatorios.");
      return;
    }

    if (
      editingPositionId &&
      positionForm.reports_to_position_id === editingPositionId
    ) {
      alert("Un cargo no puede reportarse a sí mismo.");
      return;
    }

    setSaving(true);

    const payload = {
      area_id: positionForm.area_id,
      name: positionForm.name.trim(),
      description: positionForm.description.trim() || null,
      hierarchy_level: positionForm.hierarchy_level,
      reports_to_position_id: positionForm.reports_to_position_id || null,
      status: positionForm.status,
      updated_at: new Date().toISOString(),
    };

    if (editingPositionId) {
      const { error } = await supabase
        .from("company_positions")
        .update(payload)
        .eq("id", editingPositionId);

      if (error) {
        setSaving(false);
        alert(`Error actualizando cargo: ${error.message}`);
        return;
      }
    } else {
      let positionCode = "";

      try {
        positionCode = await generatePositionCode();
      } catch (error) {
        setSaving(false);
        alert(
          error instanceof Error
            ? `Error generando código de cargo: ${error.message}`
            : "Error generando código de cargo."
        );
        return;
      }

      const { error } = await supabase.from("company_positions").insert([
        {
          position_code: positionCode,
          ...payload,
        },
      ]);

      if (error) {
        setSaving(false);
        alert(`Error creando cargo: ${error.message}`);
        return;
      }
    }

    await fetchData();
    setSaving(false);
    setIsPositionModalOpen(false);
  }

  function getAreaName(areaId: string) {
    return areas.find((area) => area.id === areaId)?.name ?? "Sin área";
  }

  function getParentAreaName(areaId: string | null) {
    if (!areaId) return "Sin área superior";
    return areas.find((area) => area.id === areaId)?.name ?? "Sin área superior";
  }

  function getReportsToPositionName(positionId: string | null) {
    if (!positionId) return "Sin cargo superior";

    const position = positions.find((item) => item.id === positionId);
    if (!position) return "Sin cargo superior";

    return `${position.name} · ${getAreaName(position.area_id)}`;
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Configuración · Áreas y cargos
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
            Áreas y cargos
          </h1>

          <p className="mt-3 max-w-4xl text-base leading-7 text-gray-600">
            Administra la estructura organizacional de la empresa: áreas,
            cargos, niveles jerárquicos y relaciones entre cargos.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={openCreateAreaModal}
            className="rounded-full bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#05054f]"
          >
            Nueva área
          </button>

          <button
            type="button"
            onClick={openCreatePositionModal}
            disabled={areas.length === 0}
            className="rounded-full border border-[#07076b] px-5 py-3 text-sm font-semibold text-[#07076b] transition hover:bg-[#07076b] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Nuevo cargo
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Áreas</p>
          <p className="mt-2 text-3xl font-bold text-[#07076b]">
            {areas.length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Áreas activas</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">
            {areas.filter((area) => area.status === "Activa").length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Cargos</p>
          <p className="mt-2 text-3xl font-bold text-[#07076b]">
            {positions.length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Cargos activos</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">
            {positions.filter((position) => position.status === "Activo").length}
          </p>
        </div>
      </section>

      <section className="flex flex-wrap gap-3 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab("areas")}
          className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
            activeTab === "areas"
              ? "bg-[#07076b] text-white"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          Áreas
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("cargos")}
          className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
            activeTab === "cargos"
              ? "bg-[#07076b] text-white"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          Cargos
        </button>
      </section>

      {activeTab === "areas" && (
        <section className="space-y-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <label className="text-sm font-medium text-gray-700">
              Buscar áreas
            </label>
            <input
              type="text"
              value={areaSearch}
              onChange={(event) => setAreaSearch(event.target.value)}
              placeholder="Código, nombre o descripción"
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Código
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Área
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Área superior
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Estado
                    </th>
                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-10 text-center text-sm text-gray-500"
                      >
                        Cargando áreas...
                      </td>
                    </tr>
                  ) : filteredAreas.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-10 text-center text-sm text-gray-500"
                      >
                        No se encontraron áreas.
                      </td>
                    </tr>
                  ) : (
                    filteredAreas.map((area) => (
                      <tr key={area.id} className="hover:bg-gray-50">
                        <td className="px-5 py-4 text-sm font-bold text-[#07076b]">
                          {area.area_code}
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-gray-900">
                            {area.name}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {area.description ?? "Sin descripción"}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-700">
                          {getParentAreaName(area.parent_area_id)}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              area.status === "Activa"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {area.status}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => openEditAreaModal(area)}
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
          </div>
        </section>
      )}

      {activeTab === "cargos" && (
        <section className="space-y-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <label className="text-sm font-medium text-gray-700">
              Buscar cargos
            </label>
            <input
              type="text"
              value={positionSearch}
              onChange={(event) => setPositionSearch(event.target.value)}
              placeholder="Código, cargo, área o nivel"
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Código
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Cargo
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Área
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Nivel
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Reporta a
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Estado
                    </th>
                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-10 text-center text-sm text-gray-500"
                      >
                        Cargando cargos...
                      </td>
                    </tr>
                  ) : filteredPositions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-10 text-center text-sm text-gray-500"
                      >
                        No se encontraron cargos.
                      </td>
                    </tr>
                  ) : (
                    filteredPositions.map((position) => (
                      <tr key={position.id} className="hover:bg-gray-50">
                        <td className="px-5 py-4 text-sm font-bold text-[#07076b]">
                          {position.position_code}
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-gray-900">
                            {position.name}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {position.description ?? "Sin descripción"}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-700">
                          {getAreaName(position.area_id)}
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-700">
                          {position.hierarchy_level}
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-700">
                          {getReportsToPositionName(
                            position.reports_to_position_id
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              position.status === "Activo"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {position.status}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => openEditPositionModal(position)}
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
          </div>
        </section>
      )}

      {isAreaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex justify-between gap-4 border-b border-gray-100 pb-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
                  {editingAreaId ? "Editar área" : "Nueva área"}
                </p>
                <h2 className="mt-2 text-2xl font-bold text-[#07076b]">
                  {editingAreaId ? "Actualizar área" : "Crear área"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsAreaModalOpen(false)}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Nombre del área *
                </label>
                <input
                  type="text"
                  value={areaForm.name}
                  onChange={(event) =>
                    setAreaForm({ ...areaForm, name: event.target.value })
                  }
                  placeholder="Producción, Comercial, Gestión Humana..."
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Descripción
                </label>
                <textarea
                  value={areaForm.description}
                  onChange={(event) =>
                    setAreaForm({
                      ...areaForm,
                      description: event.target.value,
                    })
                  }
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Área superior
                </label>
                <select
                  value={areaForm.parent_area_id}
                  onChange={(event) =>
                    setAreaForm({
                      ...areaForm,
                      parent_area_id: event.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                >
                  <option value="">Sin área superior</option>
                  {areas
                    .filter((area) => area.id !== editingAreaId)
                    .map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Estado
                </label>
                <select
                  value={areaForm.status}
                  onChange={(event) =>
                    setAreaForm({ ...areaForm, status: event.target.value })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                >
                  <option value="Activa">Activa</option>
                  <option value="Inactiva">Inactiva</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-5">
              <button
                type="button"
                onClick={() => setIsAreaModalOpen(false)}
                className="rounded-full border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={saveArea}
                className="rounded-full bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#05054f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Guardando..."
                  : editingAreaId
                  ? "Actualizar área"
                  : "Guardar área"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isPositionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex justify-between gap-4 border-b border-gray-100 pb-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
                  {editingPositionId ? "Editar cargo" : "Nuevo cargo"}
                </p>
                <h2 className="mt-2 text-2xl font-bold text-[#07076b]">
                  {editingPositionId ? "Actualizar cargo" : "Crear cargo"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsPositionModalOpen(false)}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Área *
                </label>
                <select
                  value={positionForm.area_id}
                  onChange={(event) =>
                    setPositionForm({
                      ...positionForm,
                      area_id: event.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                >
                  <option value="">Seleccionar área</option>
                  {areas
                    .filter((area) => area.status === "Activa")
                    .map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Nombre del cargo *
                </label>
                <input
                  type="text"
                  value={positionForm.name}
                  onChange={(event) =>
                    setPositionForm({
                      ...positionForm,
                      name: event.target.value,
                    })
                  }
                  placeholder="Gerente de Producción, Operario de Extrusión..."
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Descripción
                </label>
                <textarea
                  value={positionForm.description}
                  onChange={(event) =>
                    setPositionForm({
                      ...positionForm,
                      description: event.target.value,
                    })
                  }
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Nivel jerárquico
                </label>
                <select
                  value={positionForm.hierarchy_level}
                  onChange={(event) =>
                    setPositionForm({
                      ...positionForm,
                      hierarchy_level: event.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                >
                  {hierarchyLevels.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Reporta a cargo
                </label>
                <select
                  value={positionForm.reports_to_position_id}
                  onChange={(event) =>
                    setPositionForm({
                      ...positionForm,
                      reports_to_position_id: event.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                >
                  <option value="">Sin cargo superior</option>
                  {positions
                    .filter((position) => position.id !== editingPositionId)
                    .map((position) => (
                      <option key={position.id} value={position.id}>
                        {position.name} · {getAreaName(position.area_id)}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Estado
                </label>
                <select
                  value={positionForm.status}
                  onChange={(event) =>
                    setPositionForm({
                      ...positionForm,
                      status: event.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-5">
              <button
                type="button"
                onClick={() => setIsPositionModalOpen(false)}
                className="rounded-full border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={savePosition}
                className="rounded-full bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#05054f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Guardando..."
                  : editingPositionId
                  ? "Actualizar cargo"
                  : "Guardar cargo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
