"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type ThirdParty = {
  id: string;
  is_customer: boolean;
  is_supplier: boolean;
  is_other: boolean;

  person_type: string;
  identification_type: string;
  identification_number: string;
  verification_digit: string | null;
  first_name: string | null;
  last_name: string | null;
  business_name: string | null;
  commercial_name: string | null;

  country: string | null;
  department: string | null;
  city: string | null;
  address: string | null;
  phone_indicative: string | null;
  phone: string | null;
  email: string | null;

  electronic_invoice_email: string | null;
  fiscal_responsibility: string | null;
  iva_regime: string | null;
  ciiu_activity: string | null;
  postal_code: string | null;
  is_vat_responsible: boolean;
  is_grand_taxpayer: boolean;
  is_self_withholder: boolean;
  is_vat_withholding_agent: boolean;

  payment_terms: string | null;
  currency: string | null;
  credit_limit: number | null;
  price_list: string | null;
  seller: string | null;
  collector: string | null;

  siigo_sync_enabled: boolean;
  siigo_sync_status: string | null;
  siigo_third_party_id: string | null;
  siigo_last_sync_at: string | null;

  observations: string | null;
  status: string;
};

type MasterOption = {
  id: string;
  code: string;
  name: string;
  status: string;
};

type PaymentTermOption = MasterOption & {
  days: number;
};

type CurrencyOption = MasterOption & {
  symbol: string | null;
};

type ContactDraft = {
  first_name: string;
  last_name: string;
  phone_indicative: string;
  phone: string;
  email: string;
  position: string;
};

const emptyContact: ContactDraft = {
  first_name: "",
  last_name: "",
  phone_indicative: "57",
  phone: "",
  email: "",
  position: "",
};

const emptyThirdParty: Omit<ThirdParty, "id" | "siigo_third_party_id" | "siigo_last_sync_at"> = {
  is_customer: true,
  is_supplier: false,
  is_other: false,

  person_type: "Empresa",
  identification_type: "NIT",
  identification_number: "",
  verification_digit: "",
  first_name: "",
  last_name: "",
  business_name: "",
  commercial_name: "",

  country: "Colombia",
  department: "",
  city: "",
  address: "",
  phone_indicative: "57",
  phone: "",
  email: "",

  electronic_invoice_email: "",
  fiscal_responsibility: "R-99-PN - No aplica / Otros",
  iva_regime: "No aplica",
  ciiu_activity: "",
  postal_code: "",
  is_vat_responsible: false,
  is_grand_taxpayer: false,
  is_self_withholder: false,
  is_vat_withholding_agent: false,

  payment_terms: "",
  currency: "COP",
  credit_limit: 0,
  price_list: "",
  seller: "",
  collector: "",

  siigo_sync_enabled: true,
  siigo_sync_status: "Pendiente",

  observations: "",
  status: "Activo",
};

export default function TercerosPage() {
  const [thirdParties, setThirdParties] = useState<ThirdParty[]>([]);
  const [identificationTypes, setIdentificationTypes] = useState<MasterOption[]>([]);
  const [fiscalResponsibilities, setFiscalResponsibilities] = useState<MasterOption[]>([]);
  const [vatRegimes, setVatRegimes] = useState<MasterOption[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTermOption[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newThirdParty, setNewThirdParty] = useState(emptyThirdParty);
  const [contacts, setContacts] = useState<ContactDraft[]>([]);

  const inputClassName =
    "w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#07076b] focus:ring-2 focus:ring-[#07076b]/10 disabled:bg-gray-50 disabled:text-gray-400";

  useEffect(() => {
    fetchThirdParties();
    fetchMasterData();
  }, []);

  async function fetchThirdParties() {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("third_parties")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(`Error cargando terceros: ${error.message}`);
      setIsLoading(false);
      return;
    }

    setThirdParties((data ?? []) as ThirdParty[]);
    setIsLoading(false);
  }

  async function fetchMasterData() {
    const [
      identificationTypesResponse,
      fiscalResponsibilitiesResponse,
      vatRegimesResponse,
      paymentTermsResponse,
      currenciesResponse,
    ] = await Promise.all([
      supabase
        .from("third_party_identification_types")
        .select("*")
        .eq("status", "Activo")
        .order("name"),
      supabase
        .from("third_party_fiscal_responsibilities")
        .select("*")
        .eq("status", "Activo")
        .order("code"),
      supabase
        .from("third_party_vat_regimes")
        .select("*")
        .eq("status", "Activo")
        .order("name"),
      supabase
        .from("third_party_payment_terms")
        .select("*")
        .eq("status", "Activo")
        .order("days"),
      supabase
        .from("third_party_currencies")
        .select("*")
        .eq("status", "Activo")
        .order("code"),
    ]);

    setIdentificationTypes((identificationTypesResponse.data ?? []) as MasterOption[]);
    setFiscalResponsibilities((fiscalResponsibilitiesResponse.data ?? []) as MasterOption[]);
    setVatRegimes((vatRegimesResponse.data ?? []) as MasterOption[]);
    setPaymentTerms((paymentTermsResponse.data ?? []) as PaymentTermOption[]);
    setCurrencies((currenciesResponse.data ?? []) as CurrencyOption[]);
  }

  function getFiscalResponsibilityLabel(option: MasterOption) {
    return `${option.code} - ${option.name}`;
  }

  function getCurrencyLabel(option: CurrencyOption) {
    return `${option.code} - ${option.name}`;
  }

  const filteredThirdParties = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return thirdParties;

    return thirdParties.filter((thirdParty) =>
      [
        thirdParty.business_name ?? "",
        thirdParty.commercial_name ?? "",
        thirdParty.first_name ?? "",
        thirdParty.last_name ?? "",
        thirdParty.identification_number,
        thirdParty.city ?? "",
        thirdParty.email ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [thirdParties, search]);

  function getDisplayName(thirdParty: ThirdParty) {
    if (thirdParty.person_type === "Persona") {
      return (
        `${thirdParty.first_name ?? ""} ${thirdParty.last_name ?? ""}`.trim() ||
        thirdParty.commercial_name ||
        "Sin nombre"
      );
    }

    return (
      thirdParty.business_name ||
      thirdParty.commercial_name ||
      "Sin razón social"
    );
  }

  function updateNewThirdParty(
    field: keyof typeof emptyThirdParty,
    value: string | number | boolean,
  ) {
    setNewThirdParty((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function addContact() {
    setContacts((current) => [...current, { ...emptyContact }]);
  }

  function removeContact(index: number) {
    setContacts((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    );
  }

  function updateContact(
    index: number,
    field: keyof ContactDraft,
    value: string,
  ) {
    setContacts((current) =>
      current.map((contact, currentIndex) =>
        currentIndex === index ? { ...contact, [field]: value } : contact,
      ),
    );
  }

  function closeModal() {
    setIsModalOpen(false);
    setNewThirdParty(emptyThirdParty);
    setContacts([]);
  }

  function validateThirdParty() {
    if (
      !newThirdParty.is_customer &&
      !newThirdParty.is_supplier &&
      !newThirdParty.is_other
    ) {
      alert("Debes seleccionar al menos un rol: Cliente, Proveedor u Otro.");
      return false;
    }

    if (!newThirdParty.identification_number.trim()) {
      alert("Debes ingresar la identificación del tercero.");
      return false;
    }

    if (
      newThirdParty.person_type === "Empresa" &&
      !newThirdParty.business_name?.trim()
    ) {
      alert("Debes ingresar la razón social.");
      return false;
    }

    if (
      newThirdParty.person_type === "Persona" &&
      !newThirdParty.first_name?.trim() &&
      !newThirdParty.last_name?.trim()
    ) {
      alert("Debes ingresar nombres o apellidos de la persona.");
      return false;
    }

    const contactsWithData = contacts.filter((contact) =>
      [
        contact.first_name,
        contact.last_name,
        contact.phone,
        contact.email,
        contact.position,
      ]
        .join("")
        .trim(),
    );

    const invalidContact = contactsWithData.some(
      (contact) => !contact.first_name.trim(),
    );

    if (invalidContact) {
      alert("Cada contacto agregado debe tener al menos nombre.");
      return false;
    }

    return true;
  }

  async function handleSaveThirdParty() {
    if (!validateThirdParty()) return;

    setIsSaving(true);

    try {
      const payload = {
        ...newThirdParty,
        verification_digit: newThirdParty.verification_digit || null,
        first_name: newThirdParty.first_name || null,
        last_name: newThirdParty.last_name || null,
        business_name: newThirdParty.business_name || null,
        commercial_name: newThirdParty.commercial_name || null,
        department: newThirdParty.department || null,
        city: newThirdParty.city || null,
        address: newThirdParty.address || null,
        phone_indicative: newThirdParty.phone_indicative || null,
        phone: newThirdParty.phone || null,
        email: newThirdParty.email || null,
        electronic_invoice_email:
          newThirdParty.electronic_invoice_email || null,
        fiscal_responsibility:
          newThirdParty.fiscal_responsibility || null,
        iva_regime: newThirdParty.iva_regime || null,
        ciiu_activity: newThirdParty.ciiu_activity || null,
        postal_code: newThirdParty.postal_code || null,
        payment_terms: newThirdParty.payment_terms || null,
        currency: newThirdParty.currency || null,
        credit_limit: Number(newThirdParty.credit_limit || 0),
        price_list: newThirdParty.price_list || null,
        seller: newThirdParty.seller || null,
        collector: newThirdParty.collector || null,
        observations: newThirdParty.observations || null,
        updated_at: new Date().toISOString(),
      };

      const { data: insertedThirdParty, error } = await supabase
        .from("third_parties")
        .insert(payload)
        .select("id")
        .single();

      if (error) throw new Error(error.message);

      const contactsToSave = contacts
        .filter((contact) =>
          [
            contact.first_name,
            contact.last_name,
            contact.phone,
            contact.email,
            contact.position,
          ]
            .join("")
            .trim(),
        )
        .map((contact, index) => ({
          third_party_id: insertedThirdParty.id,
          first_name: contact.first_name.trim(),
          last_name: contact.last_name.trim() || null,
          phone_indicative: contact.phone_indicative.trim() || null,
          phone: contact.phone.trim() || null,
          email: contact.email.trim() || null,
          position: contact.position.trim() || null,
          is_primary: index === 0,
          status: "Activo",
        }));

      if (contactsToSave.length > 0) {
        const { error: contactsError } = await supabase
          .from("third_party_contacts")
          .insert(contactsToSave);

        if (contactsError) throw new Error(contactsError.message);
      }

      alert("Tercero creado correctamente.");
      await fetchThirdParties();
      closeModal();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el tercero.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Configuración · Terceros
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
            Maestro de Terceros
          </h1>

          <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
            Administra clientes, proveedores y otros terceros en una única base
            maestra preparada para facturación electrónica e integración con
            SIIGO.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:opacity-95"
        >
          Nuevo tercero
        </button>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Base de terceros
          </h2>

          <input
            type="text"
            placeholder="Buscar tercero, identificación, ciudad, correo..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={`${inputClassName} md:max-w-md`}
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Roles</th>
                <th className="px-4 py-3">Nombre / Razón social</th>
                <th className="px-4 py-3">Identificación</th>
                <th className="px-4 py-3">Ciudad</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Correo</th>
                <th className="px-4 py-3">Facturación electrónica</th>
                <th className="px-4 py-3">SIIGO</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {isLoading && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    Cargando terceros...
                  </td>
                </tr>
              )}

              {!isLoading &&
                filteredThirdParties.map((thirdParty) => (
                  <tr key={thirdParty.id} className="transition hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {thirdParty.is_customer && (
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                            Cliente
                          </span>
                        )}

                        {thirdParty.is_supplier && (
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                            Proveedor
                          </span>
                        )}

                        {thirdParty.is_other && (
                          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                            Otro
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4 font-medium text-gray-900">
                      {getDisplayName(thirdParty)}
                      {thirdParty.commercial_name && (
                        <p className="mt-1 text-xs font-normal text-gray-500">
                          {thirdParty.commercial_name}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {thirdParty.identification_type}{" "}
                      {thirdParty.identification_number}
                      {thirdParty.verification_digit
                        ? `-${thirdParty.verification_digit}`
                        : ""}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {thirdParty.city || "N/A"}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {thirdParty.phone || "N/A"}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {thirdParty.email || "N/A"}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {thirdParty.electronic_invoice_email || "N/A"}
                    </td>

                    <td className="px-4 py-4">
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                        {thirdParty.siigo_sync_status || "Pendiente"}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          thirdParty.status === "Activo"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {thirdParty.status}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <button className="rounded-lg bg-[#07076b]/10 px-3 py-2 text-xs font-medium text-[#07076b] transition hover:bg-[#07076b]/20">
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}

              {!isLoading && filteredThirdParties.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    No se encontraron terceros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
                  Configuración · Terceros
                </p>
                <h2 className="text-2xl font-bold text-[#07076b]">
                  Nuevo tercero
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Registra clientes, proveedores u otros terceros en una única
                  base maestra.
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

            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-6 border-b border-gray-100 pb-5">
                <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#07076b] text-sm font-bold text-white">
                  1
                </div>
                <h3 className="text-xl font-bold text-[#07076b]">
                  Roles del tercero
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Un tercero puede ser cliente, proveedor u otro al mismo tiempo.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <CheckboxField
                  label="Cliente"
                  checked={newThirdParty.is_customer}
                  onChange={(value) => updateNewThirdParty("is_customer", value)}
                />
                <CheckboxField
                  label="Proveedor"
                  checked={newThirdParty.is_supplier}
                  onChange={(value) => updateNewThirdParty("is_supplier", value)}
                />
                <CheckboxField
                  label="Otro"
                  checked={newThirdParty.is_other}
                  onChange={(value) => updateNewThirdParty("is_other", value)}
                />
              </div>
            </section>

            <section className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-6 border-b border-gray-100 pb-5">
                <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#07076b] text-sm font-bold text-white">
                  2
                </div>
                <h3 className="text-xl font-bold text-[#07076b]">
                  Datos básicos
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label="Tipo persona">
                  <select
                    value={newThirdParty.person_type}
                    onChange={(event) =>
                      updateNewThirdParty("person_type", event.target.value)
                    }
                    className={inputClassName}
                  >
                    <option value="Empresa">Empresa</option>
                    <option value="Persona">Persona</option>
                  </select>
                </Field>

                <Field label="Tipo identificación">
                  <select
                    value={newThirdParty.identification_type}
                    onChange={(event) =>
                      updateNewThirdParty(
                        "identification_type",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  >
                    {identificationTypes.map((type) => (
                      <option key={type.id} value={type.code}>
                        {type.code} - {type.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Identificación *">
                  <input
                    value={newThirdParty.identification_number}
                    onChange={(event) =>
                      updateNewThirdParty(
                        "identification_number",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                    placeholder="Ej: 900123456"
                  />
                </Field>

                <Field label="DV">
                  <input
                    value={newThirdParty.verification_digit ?? ""}
                    onChange={(event) =>
                      updateNewThirdParty(
                        "verification_digit",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                    placeholder="Ej: 1"
                  />
                </Field>

                {newThirdParty.person_type === "Persona" ? (
                  <>
                    <Field label="Nombres *">
                      <input
                        value={newThirdParty.first_name ?? ""}
                        onChange={(event) =>
                          updateNewThirdParty("first_name", event.target.value)
                        }
                        className={inputClassName}
                      />
                    </Field>

                    <Field label="Apellidos">
                      <input
                        value={newThirdParty.last_name ?? ""}
                        onChange={(event) =>
                          updateNewThirdParty("last_name", event.target.value)
                        }
                        className={inputClassName}
                      />
                    </Field>
                  </>
                ) : (
                  <Field label="Razón social *">
                    <input
                      value={newThirdParty.business_name ?? ""}
                      onChange={(event) =>
                        updateNewThirdParty("business_name", event.target.value)
                      }
                      className={inputClassName}
                      placeholder="Nombre legal de la empresa"
                    />
                  </Field>
                )}

                <Field label="Nombre comercial">
                  <input
                    value={newThirdParty.commercial_name ?? ""}
                    onChange={(event) =>
                      updateNewThirdParty("commercial_name", event.target.value)
                    }
                    className={inputClassName}
                  />
                </Field>
              </div>
            </section>

            <section className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-6 border-b border-gray-100 pb-5">
                <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#07076b] text-sm font-bold text-white">
                  3
                </div>
                <h3 className="text-xl font-bold text-[#07076b]">
                  Ubicación y contacto
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label="País">
                  <input
                    value={newThirdParty.country ?? ""}
                    onChange={(event) =>
                      updateNewThirdParty("country", event.target.value)
                    }
                    className={inputClassName}
                  />
                </Field>

                <Field label="Departamento">
                  <input
                    value={newThirdParty.department ?? ""}
                    onChange={(event) =>
                      updateNewThirdParty("department", event.target.value)
                    }
                    className={inputClassName}
                  />
                </Field>

                <Field label="Ciudad">
                  <input
                    value={newThirdParty.city ?? ""}
                    onChange={(event) =>
                      updateNewThirdParty("city", event.target.value)
                    }
                    className={inputClassName}
                  />
                </Field>

                <Field label="Dirección">
                  <input
                    value={newThirdParty.address ?? ""}
                    onChange={(event) =>
                      updateNewThirdParty("address", event.target.value)
                    }
                    className={inputClassName}
                  />
                </Field>

                <Field label="Indicativo">
                  <input
                    value={newThirdParty.phone_indicative ?? ""}
                    onChange={(event) =>
                      updateNewThirdParty(
                        "phone_indicative",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  />
                </Field>

                <Field label="Teléfono">
                  <input
                    value={newThirdParty.phone ?? ""}
                    onChange={(event) =>
                      updateNewThirdParty("phone", event.target.value)
                    }
                    className={inputClassName}
                  />
                </Field>

                <Field label="Correo principal">
                  <input
                    type="email"
                    value={newThirdParty.email ?? ""}
                    onChange={(event) =>
                      updateNewThirdParty("email", event.target.value)
                    }
                    className={inputClassName}
                  />
                </Field>
              </div>
            </section>

            <section className="mt-8 rounded-3xl border border-indigo-100 bg-indigo-50 p-6 shadow-sm">
              <div className="mb-6 border-b border-indigo-100 pb-5">
                <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#07076b] text-sm font-bold text-white">
                  4
                </div>
                <h3 className="text-xl font-bold text-[#07076b]">
                  Tributario y facturación electrónica
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Información clave para facturación electrónica, responsabilidades fiscales y datos tributarios.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label="Correo facturación electrónica">
                  <input
                    type="email"
                    value={newThirdParty.electronic_invoice_email ?? ""}
                    onChange={(event) =>
                      updateNewThirdParty(
                        "electronic_invoice_email",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  />
                </Field>

                <Field label="Responsabilidad fiscal">
                  <select
                    value={newThirdParty.fiscal_responsibility ?? ""}
                    onChange={(event) =>
                      updateNewThirdParty(
                        "fiscal_responsibility",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  >
                    <option value="">Seleccionar responsabilidad</option>
                    {fiscalResponsibilities.map((responsibility) => {
                      const label = getFiscalResponsibilityLabel(responsibility);
                      return (
                        <option key={responsibility.id} value={label}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </Field>

                <Field label="Régimen IVA">
                  <select
                    value={newThirdParty.iva_regime ?? ""}
                    onChange={(event) =>
                      updateNewThirdParty("iva_regime", event.target.value)
                    }
                    className={inputClassName}
                  >
                    <option value="">Seleccionar régimen</option>
                    {vatRegimes.map((regime) => (
                      <option key={regime.id} value={regime.name}>
                        {regime.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Actividad económica CIIU">
                  <input
                    value={newThirdParty.ciiu_activity ?? ""}
                    onChange={(event) =>
                      updateNewThirdParty("ciiu_activity", event.target.value)
                    }
                    className={inputClassName}
                  />
                </Field>

                <Field label="Código postal">
                  <input
                    value={newThirdParty.postal_code ?? ""}
                    onChange={(event) =>
                      updateNewThirdParty("postal_code", event.target.value)
                    }
                    className={inputClassName}
                  />
                </Field>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <CheckboxField
                  label="Responsable de IVA"
                  checked={newThirdParty.is_vat_responsible}
                  onChange={(value) =>
                    updateNewThirdParty("is_vat_responsible", value)
                  }
                />
                <CheckboxField
                  label="Gran contribuyente"
                  checked={newThirdParty.is_grand_taxpayer}
                  onChange={(value) =>
                    updateNewThirdParty("is_grand_taxpayer", value)
                  }
                />
                <CheckboxField
                  label="Autorretenedor"
                  checked={newThirdParty.is_self_withholder}
                  onChange={(value) =>
                    updateNewThirdParty("is_self_withholder", value)
                  }
                />
                <CheckboxField
                  label="Agente retenedor IVA"
                  checked={newThirdParty.is_vat_withholding_agent}
                  onChange={(value) =>
                    updateNewThirdParty("is_vat_withholding_agent", value)
                  }
                />
              </div>
            </section>

            <section className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-6 border-b border-gray-100 pb-5">
                <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#07076b] text-sm font-bold text-white">
                  5
                </div>
                <h3 className="text-xl font-bold text-[#07076b]">
                  Comercial, compras y observaciones
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label="Condición de pago">
                  <select
                    value={newThirdParty.payment_terms ?? ""}
                    onChange={(event) =>
                      updateNewThirdParty("payment_terms", event.target.value)
                    }
                    className={inputClassName}
                  >
                    <option value="">Seleccionar condición</option>
                    {paymentTerms.map((term) => (
                      <option key={term.id} value={term.name}>
                        {term.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Moneda">
                  <select
                    value={newThirdParty.currency ?? "COP"}
                    onChange={(event) =>
                      updateNewThirdParty("currency", event.target.value)
                    }
                    className={inputClassName}
                  >
                    <option value="">Seleccionar moneda</option>
                    {currencies.map((currency) => {
                      const label = getCurrencyLabel(currency);
                      return (
                        <option key={currency.id} value={currency.code}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </Field>

                <Field label="Cupo crédito">
                  <input
                    type="number"
                    min={0}
                    value={newThirdParty.credit_limit ?? 0}
                    onChange={(event) =>
                      updateNewThirdParty(
                        "credit_limit",
                        Number(event.target.value || 0),
                      )
                    }
                    className={inputClassName}
                  />
                </Field>

                <Field label="Lista de precios">
                  <input
                    value={newThirdParty.price_list ?? ""}
                    onChange={(event) =>
                      updateNewThirdParty("price_list", event.target.value)
                    }
                    className={inputClassName}
                  />
                </Field>

                <Field label="Vendedor">
                  <input
                    value={newThirdParty.seller ?? ""}
                    onChange={(event) =>
                      updateNewThirdParty("seller", event.target.value)
                    }
                    className={inputClassName}
                  />
                </Field>

                <Field label="Cobrador">
                  <input
                    value={newThirdParty.collector ?? ""}
                    onChange={(event) =>
                      updateNewThirdParty("collector", event.target.value)
                    }
                    className={inputClassName}
                  />
                </Field>

                <div className="md:col-span-2">
                  <Field label="Observaciones">
                    <textarea
                      rows={3}
                      value={newThirdParty.observations ?? ""}
                      onChange={(event) =>
                        updateNewThirdParty("observations", event.target.value)
                      }
                      className={inputClassName}
                    />
                  </Field>
                </div>

                <Field label="Estado">
                  <select
                    value={newThirdParty.status}
                    onChange={(event) =>
                      updateNewThirdParty("status", event.target.value)
                    }
                    className={inputClassName}
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </Field>

                <div className="md:col-span-2">
                  <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h4 className="text-base font-semibold text-[#07076b]">
                          Contactos del tercero
                        </h4>
                        <p className="mt-1 text-sm text-gray-500">
                          Agrega las personas de contacto para comunicación comercial, compras, cartera o facturación.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={addContact}
                        className="rounded-xl border border-[#07076b]/20 bg-white px-4 py-2 text-sm font-semibold text-[#07076b] transition hover:bg-[#07076b]/5"
                      >
                        + Añadir nuevo contacto
                      </button>
                    </div>

                    {contacts.length === 0 && (
                      <div className="mt-4 rounded-xl bg-white p-4 text-sm text-gray-500">
                        Aún no has agregado contactos para este tercero.
                      </div>
                    )}

                    {contacts.length > 0 && (
                      <div className="mt-5 space-y-4">
                        {contacts.map((contact, index) => (
                          <div
                            key={index}
                            className="rounded-2xl border border-gray-200 bg-white p-4"
                          >
                            <div className="mb-4 flex items-center justify-between gap-3">
                              <h5 className="text-sm font-semibold text-gray-700">
                                Contacto {index + 1}
                              </h5>

                              <button
                                type="button"
                                onClick={() => removeContact(index)}
                                className="text-sm font-medium text-red-600 hover:underline"
                              >
                                Eliminar
                              </button>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <Field label="Nombre *">
                                <input
                                  value={contact.first_name}
                                  onChange={(event) =>
                                    updateContact(index, "first_name", event.target.value)
                                  }
                                  className={inputClassName}
                                  placeholder="Nombre del contacto"
                                />
                              </Field>

                              <Field label="Apellido">
                                <input
                                  value={contact.last_name}
                                  onChange={(event) =>
                                    updateContact(index, "last_name", event.target.value)
                                  }
                                  className={inputClassName}
                                  placeholder="Apellido del contacto"
                                />
                              </Field>

                              <Field label="Teléfono">
                                <div className="grid grid-cols-[90px_1fr] gap-3">
                                  <input
                                    value={contact.phone_indicative}
                                    onChange={(event) =>
                                      updateContact(
                                        index,
                                        "phone_indicative",
                                        event.target.value,
                                      )
                                    }
                                    className={inputClassName}
                                    placeholder="57"
                                  />

                                  <input
                                    value={contact.phone}
                                    onChange={(event) =>
                                      updateContact(index, "phone", event.target.value)
                                    }
                                    className={inputClassName}
                                    placeholder="Número de teléfono"
                                  />
                                </div>
                              </Field>

                              <Field label="Correo">
                                <input
                                  type="email"
                                  value={contact.email}
                                  onChange={(event) =>
                                    updateContact(index, "email", event.target.value)
                                  }
                                  className={inputClassName}
                                  placeholder="correo@empresa.com"
                                />
                              </Field>

                              <Field label="Cargo">
                                <input
                                  value={contact.position}
                                  onChange={(event) =>
                                    updateContact(index, "position", event.target.value)
                                  }
                                  className={inputClassName}
                                  placeholder="Compras, Gerencia, Contabilidad..."
                                />
                              </Field>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-8 rounded-3xl border border-indigo-100 bg-indigo-50 p-6 shadow-sm">
              <div className="mb-6 border-b border-indigo-100 pb-5">
                <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#07076b] text-sm font-bold text-white">
                  6
                </div>
                <h3 className="text-xl font-bold text-[#07076b]">
                  Integración SIIGO
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Controla si este tercero debe sincronizarse con SIIGO y consulta su estado de integración.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label="Estado SIIGO">
                  <input
                    value={newThirdParty.siigo_sync_status ?? "Pendiente"}
                    readOnly
                    className={`${inputClassName} bg-white font-semibold text-[#07076b]`}
                  />
                </Field>

                <div className="flex items-end">
                  <CheckboxField
                    label="Sincronizar con SIIGO"
                    checked={newThirdParty.siigo_sync_enabled}
                    onChange={(value) =>
                      updateNewThirdParty("siigo_sync_enabled", value)
                    }
                  />
                </div>
              </div>
            </section>

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={closeModal}
                disabled={isSaving}
                className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                onClick={handleSaveThirdParty}
                disabled={isSaving}
                className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Guardando..." : "Guardar tercero"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 text-sm text-gray-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-[#07076b] focus:ring-[#07076b]"
      />
      {label}
    </label>
  );
}
