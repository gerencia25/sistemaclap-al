"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Supplier = {
  id: string;
  name: string;
  nit: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  payment_terms_days: number | null;
  status: "Activo" | "Inactivo";
};

const emptySupplier: Omit<Supplier, "id"> = {
  name: "",
  nit: "",
  contact_name: "",
  email: "",
  phone: "",
  city: "",
  address: "",
  payment_terms_days: 0,
  status: "Activo",
};

export default function ProveedoresPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptySupplier);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = editingSupplierId !== null;

  const inputClass =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#07076b] focus:ring-2 focus:ring-[#07076b]/10";

  useEffect(() => {
    fetchSuppliers();
  }, []);

  async function fetchSuppliers() {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(`Error cargando proveedores: ${error.message}`);
      setIsLoading(false);
      return;
    }

    setSuppliers((data ?? []) as Supplier[]);
    setIsLoading(false);
  }

  const filteredSuppliers = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return suppliers;

    return suppliers.filter((supplier) =>
      [
        supplier.name,
        supplier.nit ?? "",
        supplier.contact_name ?? "",
        supplier.email ?? "",
        supplier.phone ?? "",
        supplier.city ?? "",
        supplier.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [suppliers, search]);

  function updateForm(
    field: keyof Omit<Supplier, "id">,
    value: string | number
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openCreateModal() {
    setForm(emptySupplier);
    setEditingSupplierId(null);
    setIsModalOpen(true);
  }

  function openEditModal(supplier: Supplier) {
    setEditingSupplierId(supplier.id);

    setForm({
      name: supplier.name,
      nit: supplier.nit ?? "",
      contact_name: supplier.contact_name ?? "",
      email: supplier.email ?? "",
      phone: supplier.phone ?? "",
      city: supplier.city ?? "",
      address: supplier.address ?? "",
      payment_terms_days: supplier.payment_terms_days ?? 0,
      status: supplier.status,
    });

    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingSupplierId(null);
    setForm(emptySupplier);
  }

  async function handleSaveSupplier() {
    if (!form.name.trim()) {
      alert("Debes ingresar el nombre del proveedor.");
      return;
    }

    setIsSaving(true);

    const payload = {
      name: form.name.trim(),
      nit: form.nit || null,
      contact_name: form.contact_name || null,
      email: form.email || null,
      phone: form.phone || null,
      city: form.city || null,
      address: form.address || null,
      payment_terms_days: Number(form.payment_terms_days || 0),
      status: form.status,
      updated_at: new Date().toISOString(),
    };

    if (isEditing) {
      const { error } = await supabase
        .from("suppliers")
        .update(payload)
        .eq("id", editingSupplierId);

      if (error) {
        alert(`Error actualizando proveedor: ${error.message}`);
        setIsSaving(false);
        return;
      }

      alert("Proveedor actualizado correctamente.");
    } else {
      const { error } = await supabase.from("suppliers").insert(payload);

      if (error) {
        alert(`Error creando proveedor: ${error.message}`);
        setIsSaving(false);
        return;
      }

      alert("Proveedor creado correctamente.");
    }

    await fetchSuppliers();
    closeModal();
    setIsSaving(false);
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Configuración · Proveedores
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
            Proveedores
          </h1>

          <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
            Administra proveedores, condiciones de pago y datos de contacto para
            compras, recepciones e integración futura con Siigo.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:opacity-95"
        >
          Nuevo proveedor
        </button>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Base de proveedores
          </h2>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar proveedor, NIT, contacto, ciudad..."
            className={`${inputClass} md:max-w-md`}
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Proveedor</th>
                <th className="px-4 py-3">NIT</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Ciudad</th>
                <th className="px-4 py-3">Crédito</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {isLoading && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    Cargando proveedores...
                  </td>
                </tr>
              )}

              {!isLoading &&
                filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="transition hover:bg-gray-50">
                    <td className="px-4 py-4 font-semibold text-gray-900">
                      {supplier.name}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {supplier.nit || "—"}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {supplier.contact_name || "—"}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {supplier.email || "—"}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {supplier.phone || "—"}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {supplier.city || "—"}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {Number(supplier.payment_terms_days || 0)} días
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          supplier.status === "Activo"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {supplier.status}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <button
                        onClick={() => openEditModal(supplier)}
                        className="rounded-lg bg-[#07076b]/10 px-3 py-2 text-xs font-medium text-[#07076b] transition hover:bg-[#07076b]/20"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}

              {!isLoading && filteredSuppliers.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    No se encontraron proveedores.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
                  Configuración · Proveedores
                </p>

                <h2 className="text-2xl font-bold text-[#07076b]">
                  {isEditing ? "Editar proveedor" : "Nuevo proveedor"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Registra datos de contacto, ubicación y condiciones de pago.
                </p>
              </div>

              <button
                onClick={closeModal}
                className="rounded-full px-3 py-1 text-2xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label="Proveedor *">
                <input
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  placeholder="Nombre o razón social"
                  className={inputClass}
                />
              </Field>

              <Field label="NIT">
                <input
                  value={form.nit ?? ""}
                  onChange={(e) => updateForm("nit", e.target.value)}
                  placeholder="NIT / identificación"
                  className={inputClass}
                />
              </Field>

              <Field label="Contacto">
                <input
                  value={form.contact_name ?? ""}
                  onChange={(e) => updateForm("contact_name", e.target.value)}
                  placeholder="Persona de contacto"
                  className={inputClass}
                />
              </Field>

              <Field label="Email">
                <input
                  type="email"
                  value={form.email ?? ""}
                  onChange={(e) => updateForm("email", e.target.value)}
                  placeholder="correo@proveedor.com"
                  className={inputClass}
                />
              </Field>

              <Field label="Teléfono">
                <input
                  value={form.phone ?? ""}
                  onChange={(e) => updateForm("phone", e.target.value)}
                  placeholder="Teléfono"
                  className={inputClass}
                />
              </Field>

              <Field label="Ciudad">
                <input
                  value={form.city ?? ""}
                  onChange={(e) => updateForm("city", e.target.value)}
                  placeholder="Ciudad"
                  className={inputClass}
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Dirección">
                  <input
                    value={form.address ?? ""}
                    onChange={(e) => updateForm("address", e.target.value)}
                    placeholder="Dirección"
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="Días de crédito">
                <input
                  type="number"
                  value={form.payment_terms_days ?? 0}
                  onChange={(e) =>
                    updateForm("payment_terms_days", Number(e.target.value))
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Estado">
                <select
                  value={form.status}
                  onChange={(e) =>
                    updateForm("status", e.target.value as Supplier["status"])
                  }
                  className={inputClass}
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </Field>
            </div>

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={closeModal}
                disabled={isSaving}
                className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                onClick={handleSaveSupplier}
                disabled={isSaving}
                className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving
                  ? "Guardando..."
                  : isEditing
                  ? "Actualizar proveedor"
                  : "Guardar proveedor"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
    </div>
  );
}