"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase";

type CustomerType = "REGISTERED" | "PROSPECT";

type Customer = {
  id: string;
  identification_number: string;
  verification_digit: string | null;
  first_name: string | null;
  last_name: string | null;
  business_name: string | null;
  commercial_name: string | null;
  city: string | null;
  address: string | null;
  phone_indicative: string | null;
  phone: string | null;
  email: string | null;
  payment_terms: string | null;
  currency: string | null;
};

type Prospect = {
  id: string;
  prospect_code: string | null;
  name: string;
  document_type: string | null;
  document_number: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  estimated_segment_id: string | null;
};

type BusinessLine = {
  id: string;
  code: string;
  name: string;
};

type Segment = {
  id: string;
  code: string;
  name: string;
};

type CustomerProfile = {
  id: string;
  third_party_id: string;
  customer_segment_id: string | null;
  seller_user_id: string | null;
};

function getCustomerName(customer: Customer) {
  if (customer.business_name?.trim()) return customer.business_name.trim();
  if (customer.commercial_name?.trim()) return customer.commercial_name.trim();

  return [customer.first_name, customer.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function getCustomerDocument(customer: Customer) {
  if (!customer.identification_number) return "";

  return customer.verification_digit
    ? `${customer.identification_number}-${customer.verification_digit}`
    : customer.identification_number;
}

export default function NuevaCotizacionProductoLineaPage() {
  const { systemUser } = useAuth();

  const [customerType, setCustomerType] =
    useState<CustomerType>("REGISTERED");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [businessLines, setBusinessLines] = useState<BusinessLine[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [customerProfiles, setCustomerProfiles] = useState<CustomerProfile[]>(
    [],
  );

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedProspectId, setSelectedProspectId] = useState("");
  const [selectedBusinessLineId, setSelectedBusinessLineId] = useState("");
  const [selectedSegmentId, setSelectedSegmentId] = useState("");

  const [customerSearch, setCustomerSearch] = useState("");
  const [prospectSearch, setProspectSearch] = useState("");

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setIsLoading(true);
    setErrorMessage("");

    const [
      customersResult,
      prospectsResult,
      businessLinesResult,
      segmentsResult,
      profilesResult,
    ] = await Promise.all([
      supabase
        .from("third_parties")
        .select(
          `
            id,
            identification_number,
            verification_digit,
            first_name,
            last_name,
            business_name,
            commercial_name,
            city,
            address,
            phone_indicative,
            phone,
            email,
            payment_terms,
            currency
          `,
        )
        .eq("is_customer", true)
        .eq("status", "Activo")
        .order("business_name"),

      supabase
        .from("commercial_prospects")
        .select(
          `
            id,
            prospect_code,
            name,
            document_type,
            document_number,
            contact_name,
            email,
            phone,
            city,
            address,
            estimated_segment_id
          `,
        )
        .eq("status", "Activo")
        .order("name"),

      supabase
        .from("commercial_business_lines")
        .select("id, code, name")
        .eq("status", "Activo")
        .order("display_order"),

      supabase
        .from("commercial_customer_segments")
        .select("id, code, name")
        .eq("status", "Activo")
        .order("display_order"),

      supabase
        .from("commercial_customer_profiles")
        .select(
          `
            id,
            third_party_id,
            customer_segment_id,
            seller_user_id
          `,
        )
        .eq("status", "Activo"),
    ]);

    const firstError =
      customersResult.error ||
      prospectsResult.error ||
      businessLinesResult.error ||
      segmentsResult.error ||
      profilesResult.error;

    if (firstError) {
      setErrorMessage(firstError.message);
      setIsLoading(false);
      return;
    }

    setCustomers((customersResult.data ?? []) as Customer[]);
    setProspects((prospectsResult.data ?? []) as Prospect[]);
    setBusinessLines((businessLinesResult.data ?? []) as BusinessLine[]);
    setSegments((segmentsResult.data ?? []) as Segment[]);
    setCustomerProfiles(
      (profilesResult.data ?? []) as CustomerProfile[],
    );

    setIsLoading(false);
  }

  const selectedCustomer = useMemo(
    () => customers.find((item) => item.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );

  const selectedProspect = useMemo(
    () => prospects.find((item) => item.id === selectedProspectId) ?? null,
    [prospects, selectedProspectId],
  );

  const selectedCustomerProfile = useMemo(
    () =>
      customerProfiles.find(
        (profile) => profile.third_party_id === selectedCustomerId,
      ) ?? null,
    [customerProfiles, selectedCustomerId],
  );

  const customerHasOfficialSegment = Boolean(
    selectedCustomerProfile?.customer_segment_id,
  );

  const filteredCustomers = useMemo(() => {
    const term = customerSearch.toLowerCase().trim();

    if (!term) return customers;

    return customers.filter((customer) =>
      [
        getCustomerName(customer),
        customer.identification_number,
        customer.commercial_name ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [customers, customerSearch]);

  const filteredProspects = useMemo(() => {
    const term = prospectSearch.toLowerCase().trim();

    if (!term) return prospects;

    return prospects.filter((prospect) =>
      [
        prospect.name,
        prospect.document_number ?? "",
        prospect.contact_name ?? "",
        prospect.email ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [prospects, prospectSearch]);

  function resetRecipient() {
    setSelectedCustomerId("");
    setSelectedProspectId("");
    setSelectedSegmentId("");

    setContactName("");
    setContactEmail("");
    setContactPhone("");
    setAddress("");
    setCity("");
  }

  function handleCustomerTypeChange(type: CustomerType) {
    setCustomerType(type);
    resetRecipient();
  }

  function handleCustomerChange(customerId: string) {
    setSelectedCustomerId(customerId);

    const customer = customers.find((item) => item.id === customerId);
    const profile = customerProfiles.find(
      (item) => item.third_party_id === customerId,
    );

    if (!customer) {
      setSelectedSegmentId("");
      setContactName("");
      setContactEmail("");
      setContactPhone("");
      setAddress("");
      setCity("");
      return;
    }

    setSelectedSegmentId(profile?.customer_segment_id ?? "");

    setContactName("");
    setContactEmail(customer.email ?? "");

    const phone = [customer.phone_indicative, customer.phone]
      .filter(Boolean)
      .join(" ");

    setContactPhone(phone);
    setAddress(customer.address ?? "");
    setCity(customer.city ?? "");
  }

  function handleProspectChange(prospectId: string) {
    setSelectedProspectId(prospectId);

    const prospect = prospects.find((item) => item.id === prospectId);

    if (!prospect) {
      setSelectedSegmentId("");
      setContactName("");
      setContactEmail("");
      setContactPhone("");
      setAddress("");
      setCity("");
      return;
    }

    setSelectedSegmentId(prospect.estimated_segment_id ?? "");
    setContactName(prospect.contact_name ?? "");
    setContactEmail(prospect.email ?? "");
    setContactPhone(prospect.phone ?? "");
    setAddress(prospect.address ?? "");
    setCity(prospect.city ?? "");
  }

  const recipientSelected =
    customerType === "REGISTERED"
      ? Boolean(selectedCustomerId)
      : Boolean(selectedProspectId);

  const informationComplete =
    recipientSelected &&
    Boolean(selectedBusinessLineId) &&
    Boolean(selectedSegmentId) &&
    Boolean(systemUser?.id);

  return (
    <div className="space-y-8">
      <section className="max-w-4xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
          Dirección Comercial
        </p>

        <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
          Producto de línea
        </h1>

        <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
          Inicia una cotización utilizando productos codificados y listas de
          precios vigentes.
        </p>
      </section>

      {errorMessage && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
          <p className="text-sm font-semibold text-red-700">
            No se pudo cargar la información comercial.
          </p>
          <p className="mt-1 text-sm text-red-600">{errorMessage}</p>
        </div>
      )}

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 border-b border-gray-100 pb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#07076b] text-sm font-bold text-white">
                1
              </div>

              <h2 className="text-xl font-bold text-[#07076b]">
                Información comercial
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Define a quién se cotiza, la línea de negocio y los datos que
                quedarán asociados a esta propuesta.
              </p>
            </div>

            {!isLoading && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  informationComplete
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {informationComplete ? "Información completa" : "Pendiente"}
              </span>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="py-10 text-center text-sm text-gray-500">
            Cargando clientes, prospectos y parámetros comerciales...
          </div>
        ) : (
          <div className="space-y-8">
            <div>
              <p className="mb-3 text-sm font-semibold text-gray-900">
                ¿A quién se realiza la cotización?
              </p>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handleCustomerTypeChange("REGISTERED")}
                  className={`rounded-2xl border p-4 text-left transition ${
                    customerType === "REGISTERED"
                      ? "border-[#07076b] bg-[#07076b]/[0.03] ring-2 ring-[#07076b]/10"
                      : "border-gray-200 hover:border-[#07076b]/20"
                  }`}
                >
                  <p className="font-semibold text-[#07076b]">
                    Cliente registrado
                  </p>

                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    Cliente ya creado y aprobado en el Maestro de Terceros.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleCustomerTypeChange("PROSPECT")}
                  className={`rounded-2xl border p-4 text-left transition ${
                    customerType === "PROSPECT"
                      ? "border-[#07076b] bg-[#07076b]/[0.03] ring-2 ring-[#07076b]/10"
                      : "border-gray-200 hover:border-[#07076b]/20"
                  }`}
                >
                  <p className="font-semibold text-[#07076b]">Prospecto</p>

                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    Cliente potencial que todavía no requiere creación formal
                    como tercero.
                  </p>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label="Línea de negocio *">
                <select
                  value={selectedBusinessLineId}
                  onChange={(event) =>
                    setSelectedBusinessLineId(event.target.value)
                  }
                  className={inputClassName}
                >
                  <option value="">Seleccionar línea de negocio</option>

                  {businessLines.map((line) => (
                    <option key={line.id} value={line.id}>
                      {line.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Vendedor responsable">
                <input
                  value={systemUser?.full_name ?? ""}
                  readOnly
                  className={`${inputClassName} bg-gray-50`}
                  placeholder="Usuario actual"
                />
              </Field>
            </div>

            {customerType === "REGISTERED" ? (
              <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-5">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Field label="Buscar cliente">
                      <input
                        value={customerSearch}
                        onChange={(event) =>
                          setCustomerSearch(event.target.value)
                        }
                        placeholder="Buscar por razón social, nombre o NIT..."
                        className={inputClassName}
                      />
                    </Field>
                  </div>

                  <div className="md:col-span-2">
                    <Field label="Cliente *">
                      <select
                        value={selectedCustomerId}
                        onChange={(event) =>
                          handleCustomerChange(event.target.value)
                        }
                        className={inputClassName}
                      >
                        <option value="">Seleccionar cliente</option>

                        {filteredCustomers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {getCustomerName(customer)} ·{" "}
                            {getCustomerDocument(customer)}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  {selectedCustomer && (
                    <>
                      <Field label="NIT / Identificación">
                        <input
                          value={getCustomerDocument(selectedCustomer)}
                          readOnly
                          className={`${inputClassName} bg-gray-50`}
                        />
                      </Field>

                      <Field label="Forma de pago habitual">
                        <input
                          value={selectedCustomer.payment_terms ?? "Sin definir"}
                          readOnly
                          className={`${inputClassName} bg-gray-50`}
                        />
                      </Field>

                      <Field label="Moneda">
                        <input
                          value={selectedCustomer.currency ?? "COP"}
                          readOnly
                          className={`${inputClassName} bg-gray-50`}
                        />
                      </Field>

                      <Field label="Segmento comercial *">
                        <select
                          value={selectedSegmentId}
                          onChange={(event) =>
                            setSelectedSegmentId(event.target.value)
                          }
                          disabled={customerHasOfficialSegment}
                          className={`${inputClassName} disabled:bg-gray-50`}
                        >
                          <option value="">Seleccionar segmento</option>

                          {segments.map((segment) => (
                            <option key={segment.id} value={segment.id}>
                              {segment.name}
                            </option>
                          ))}
                        </select>

                        {customerHasOfficialSegment ? (
                          <p className="mt-2 text-xs text-emerald-700">
                            Clasificación tomada del perfil comercial del
                            cliente.
                          </p>
                        ) : (
                          <p className="mt-2 text-xs text-amber-700">
                            Este cliente todavía no tiene clasificación
                            comercial registrada. Selecciona una para esta
                            cotización.
                          </p>
                        )}
                      </Field>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-5">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Field label="Buscar prospecto">
                      <input
                        value={prospectSearch}
                        onChange={(event) =>
                          setProspectSearch(event.target.value)
                        }
                        placeholder="Buscar por nombre, contacto, correo o documento..."
                        className={inputClassName}
                      />
                    </Field>
                  </div>

                  <div className="md:col-span-2">
                    <Field label="Prospecto *">
                      <select
                        value={selectedProspectId}
                        onChange={(event) =>
                          handleProspectChange(event.target.value)
                        }
                        className={inputClassName}
                      >
                        <option value="">Seleccionar prospecto</option>

                        {filteredProspects.map((prospect) => (
                          <option key={prospect.id} value={prospect.id}>
                            {prospect.name}
                            {prospect.document_number
                              ? ` · ${prospect.document_number}`
                              : ""}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  {selectedProspect && (
                    <Field label="Segmento comercial estimado *">
                      <select
                        value={selectedSegmentId}
                        onChange={(event) =>
                          setSelectedSegmentId(event.target.value)
                        }
                        className={inputClassName}
                      >
                        <option value="">Seleccionar segmento</option>

                        {segments.map((segment) => (
                          <option key={segment.id} value={segment.id}>
                            {segment.name}
                          </option>
                        ))}
                      </select>

                      <p className="mt-2 text-xs text-gray-500">
                        Clasificación interna. No se mostrará al prospecto en la
                        cotización.
                      </p>
                    </Field>
                  )}
                </div>
              </div>
            )}

            {recipientSelected && (
              <div>
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-gray-900">
                    Datos de contacto para esta cotización
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    Se precargan desde el cliente o prospecto, pero puedes
                    ajustarlos para esta propuesta sin modificar el maestro.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Field label="Contacto">
                    <input
                      value={contactName}
                      onChange={(event) => setContactName(event.target.value)}
                      className={inputClassName}
                      placeholder="Nombre de la persona de contacto"
                    />
                  </Field>

                  <Field label="Correo">
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(event) => setContactEmail(event.target.value)}
                      className={inputClassName}
                      placeholder="correo@cliente.com"
                    />
                  </Field>

                  <Field label="Teléfono">
                    <input
                      value={contactPhone}
                      onChange={(event) => setContactPhone(event.target.value)}
                      className={inputClassName}
                      placeholder="Teléfono"
                    />
                  </Field>

                  <Field label="Ciudad">
                    <input
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                      className={inputClassName}
                      placeholder="Ciudad"
                    />
                  </Field>

                  <div className="md:col-span-2">
                    <Field label="Dirección">
                      <input
                        value={address}
                        onChange={(event) => setAddress(event.target.value)}
                        className={inputClassName}
                        placeholder="Dirección"
                      />
                    </Field>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {informationComplete
              ? "Información comercial completa"
              : "Completa la información requerida"}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            {informationComplete
              ? "La cotización está lista para continuar con los productos."
              : "Debes seleccionar destinatario, línea de negocio y segmento comercial."}
          </p>
        </div>

        <button
          type="button"
          disabled={!informationComplete}
          className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continuar a productos →
        </button>
      </section>
    </div>
  );
}

const inputClassName =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#07076b] focus:ring-2 focus:ring-[#07076b]/10";

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