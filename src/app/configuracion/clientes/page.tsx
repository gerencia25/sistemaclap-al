"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

const categories = [
  "Alimentos",
  "Farmacéutica",
  "Cosmética",
  "Industrial",
  "Aseo",
  "Veterinaria",
  "Otra",
];

type Customer = {
  id: string;
  name: string;
  nit: string;
  category: string;
  contact: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  status: "Activo" | "Inactivo";
};

const emptyCustomer: Omit<Customer, "id"> = {
  name: "",
  nit: "",
  category: "Alimentos",
  contact: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  status: "Activo",
};

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState(emptyCustomer);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(
    null
  );

  const isEditing = editingCustomerId !== null;

  const inputClassName =
    "w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#07076b] focus:ring-2 focus:ring-[#07076b]/10";

  const fetchCustomers = async () => {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(`Error cargando clientes: ${error.message}`);
      setIsLoading(false);
      return;
    }

    setCustomers((data ?? []) as Customer[]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return customers;

    return customers.filter((customer) =>
      [
        customer.name,
        customer.nit,
        customer.category,
        customer.contact ?? "",
        customer.email ?? "",
        customer.phone ?? "",
        customer.city ?? "",
        customer.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [customers, search]);

  const updateNewCustomer = (
    field: keyof Omit<Customer, "id">,
    value: string
  ) => {
    setNewCustomer((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomerId(customer.id);

    setNewCustomer({
      name: customer.name,
      nit: customer.nit,
      category: customer.category,
      contact: customer.contact ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      address: customer.address ?? "",
      city: customer.city ?? "",
      status: customer.status,
    });

    setIsModalOpen(true);
  };

  const handleSaveCustomer = async () => {
    if (!newCustomer.name || !newCustomer.nit) {
      alert("Debes ingresar al menos el nombre del cliente y el NIT.");
      return;
    }

    setIsSaving(true);

    if (isEditing) {
      const { error } = await supabase
        .from("customers")
        .update({
          name: newCustomer.name,
          nit: newCustomer.nit,
          category: newCustomer.category,
          contact: newCustomer.contact || null,
          email: newCustomer.email || null,
          phone: newCustomer.phone || null,
          address: newCustomer.address || null,
          city: newCustomer.city || null,
          status: newCustomer.status,
        })
        .eq("id", editingCustomerId);

      if (error) {
        alert(`Error actualizando cliente: ${error.message}`);
        setIsSaving(false);
        return;
      }

      alert("Cliente actualizado correctamente");
    } else {
      const { error } = await supabase.from("customers").insert({
        name: newCustomer.name,
        nit: newCustomer.nit,
        category: newCustomer.category,
        contact: newCustomer.contact || null,
        email: newCustomer.email || null,
        phone: newCustomer.phone || null,
        address: newCustomer.address || null,
        city: newCustomer.city || null,
        status: newCustomer.status,
      });

      if (error) {
        alert(`Error creando cliente: ${error.message}`);
        setIsSaving(false);
        return;
      }

      alert("Cliente creado correctamente");
    }

    await fetchCustomers();

    setNewCustomer(emptyCustomer);
    setEditingCustomerId(null);
    setIsModalOpen(false);
    setIsSaving(false);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCustomerId(null);
    setNewCustomer(emptyCustomer);
  };

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Configuración · Clientes
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
            Clientes
          </h1>

          <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
            Consulta y administra la información comercial de los clientes de
            A&L Multiformas.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:opacity-95"
        >
          Nuevo cliente
        </button>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Base de clientes
          </h2>

          <input
            type="text"
            placeholder="Buscar cliente, NIT o ciudad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClassName} md:max-w-sm`}
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">NIT</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Ciudad</th>
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
                    Cargando clientes...
                  </td>
                </tr>
              )}

              {!isLoading &&
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="transition hover:bg-gray-50">
                    <td className="px-4 py-4 font-medium text-gray-900">
                      {customer.name}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {customer.nit}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {customer.category}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {customer.contact || "—"}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {customer.email || "—"}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {customer.phone || "—"}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {customer.city || "—"}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          customer.status === "Activo"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {customer.status}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleEditCustomer(customer)}
                        className="rounded-lg bg-[#07076b]/10 px-3 py-2 text-xs font-medium text-[#07076b] transition hover:bg-[#07076b]/20"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}

              {!isLoading && filteredCustomers.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    No se encontraron clientes con ese criterio.
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
                  Configuración · Clientes
                </p>

                <h2 className="text-2xl font-bold text-[#07076b]">
                  {isEditing ? "Editar cliente" : "Nuevo cliente"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {isEditing
                    ? "Actualiza la información comercial del cliente."
                    : "Registra la información comercial básica del cliente."}
                </p>
              </div>

              <button
                onClick={closeModal}
                className="rounded-full px-3 py-1 text-2xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                aria-label="Cerrar modal"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Nombre del cliente *
                </label>

                <input
                  value={newCustomer.name}
                  onChange={(e) => updateNewCustomer("name", e.target.value)}
                  placeholder="Ej: PROMOPLAST S.A.S"
                  className={inputClassName}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  NIT *
                </label>

                <input
                  value={newCustomer.nit}
                  onChange={(e) => updateNewCustomer("nit", e.target.value)}
                  placeholder="Ej: 901014904-2"
                  className={inputClassName}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Categoría
                </label>

                <select
                  value={newCustomer.category}
                  onChange={(e) =>
                    updateNewCustomer("category", e.target.value)
                  }
                  className={inputClassName}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Contacto
                </label>

                <input
                  value={newCustomer.contact ?? ""}
                  onChange={(e) =>
                    updateNewCustomer("contact", e.target.value)
                  }
                  placeholder="Nombre del contacto"
                  className={inputClassName}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Email
                </label>

                <input
                  type="email"
                  value={newCustomer.email ?? ""}
                  onChange={(e) => updateNewCustomer("email", e.target.value)}
                  placeholder="correo@empresa.com"
                  className={inputClassName}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Teléfono
                </label>

                <input
                  value={newCustomer.phone ?? ""}
                  onChange={(e) => updateNewCustomer("phone", e.target.value)}
                  placeholder="Número de contacto"
                  className={inputClassName}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Ciudad
                </label>

                <input
                  value={newCustomer.city ?? ""}
                  onChange={(e) => updateNewCustomer("city", e.target.value)}
                  placeholder="Ciudad"
                  className={inputClassName}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Dirección
                </label>

                <input
                  value={newCustomer.address ?? ""}
                  onChange={(e) =>
                    updateNewCustomer("address", e.target.value)
                  }
                  placeholder="Dirección"
                  className={inputClassName}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Estado
                </label>

                <select
                  value={newCustomer.status}
                  onChange={(e) => updateNewCustomer("status", e.target.value)}
                  className={inputClassName}
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-end gap-4">
              <button
                onClick={closeModal}
                className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
              >
                Cancelar
              </button>

              <button
                onClick={handleSaveCustomer}
                disabled={isSaving}
                className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving
                  ? "Guardando..."
                  : isEditing
                  ? "Actualizar cliente"
                  : "Guardar cliente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}