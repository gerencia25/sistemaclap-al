"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

const inputClassName =
  "w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#07076b] focus:ring-2 focus:ring-[#07076b]/10";

const initialForm = {
  requester_area: "",
  requester_name: "",
  requester_position: "",
  requester_email: "",
  request_type: "Creación",
  category: "Cliente",
  detailed_description: "",
};

export default function SolicitudTercerosPage() {
  const [form, setForm] = useState(initialForm);
  const [rutFile, setRutFile] = useState<File | null>(null);
  const [chamberFile, setChamberFile] = useState<File | null>(null);
  const [customerKnowledgeFile, setCustomerKnowledgeFile] =
    useState<File | null>(null);
  const [supplierKnowledgeFile, setSupplierKnowledgeFile] =
    useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function updateForm(field: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(initialForm);
    setRutFile(null);
    setChamberFile(null);
    setCustomerKnowledgeFile(null);
    setSupplierKnowledgeFile(null);
  }

  async function generateRequestNumber() {
    const { count, error } = await supabase
      .from("third_party_requests")
      .select("*", { count: "exact", head: true });

    if (error) throw new Error(error.message);

    const nextNumber = (count ?? 0) + 1;
    return `ST-${String(nextNumber).padStart(6, "0")}`;
  }

  async function uploadFile(
    requestNumber: string,
    file: File | null,
    label: string,
  ) {
    if (!file) {
      return {
        file_url: null,
        file_name: null,
      };
    }

    const safeLabel = label.replace(/[^A-Z0-9-]/gi, "_");
    const safeName = file.name.replace(/[^A-Z0-9-.]/gi, "_");
    const filePath = `${requestNumber}/${safeLabel}-${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("third-party-request-attachments")
      .upload(filePath, file, { upsert: false });

    if (uploadError) throw new Error(uploadError.message);

    const { data } = supabase.storage
      .from("third-party-request-attachments")
      .getPublicUrl(filePath);

    return {
      file_url: data.publicUrl,
      file_name: file.name,
    };
  }

  function validateForm() {
    if (!form.requester_area.trim()) {
      alert("Debes ingresar el área solicitante.");
      return false;
    }

    if (!form.requester_name.trim()) {
      alert("Debes ingresar el nombre del solicitante.");
      return false;
    }

    if (!form.requester_position.trim()) {
      alert("Debes ingresar el cargo del solicitante.");
      return false;
    }

    if (!form.requester_email.trim()) {
      alert("Debes ingresar el correo electrónico.");
      return false;
    }

    if (!form.detailed_description.trim()) {
      alert("Debes ingresar la descripción detallada.");
      return false;
    }

    if (!rutFile) {
      alert("Debes adjuntar el RUT. Este documento es obligatorio.");
      return false;
    }

    if (form.category === "Cliente" && !customerKnowledgeFile) {
      alert("Para cliente debes adjuntar el conocimiento de cliente.");
      return false;
    }

    if (form.category === "Proveedor" && !supplierKnowledgeFile) {
      alert("Para proveedor debes adjuntar el conocimiento de proveedor.");
      return false;
    }

    return true;
  }

  async function handleSubmit() {
    if (!validateForm()) return;

    setIsSaving(true);

    try {
      const requestNumber = await generateRequestNumber();

      const rut = await uploadFile(requestNumber, rutFile, "RUT");
      const chamber = await uploadFile(
        requestNumber,
        chamberFile,
        "CAMARA_COMERCIO",
      );
      const customerKnowledge = await uploadFile(
        requestNumber,
        customerKnowledgeFile,
        "CONOCIMIENTO_CLIENTE",
      );
      const supplierKnowledge = await uploadFile(
        requestNumber,
        supplierKnowledgeFile,
        "CONOCIMIENTO_PROVEEDOR",
      );

      const { error } = await supabase.from("third_party_requests").insert({
        request_number: requestNumber,

        requester_area: form.requester_area.trim(),
        requester_name: form.requester_name.trim(),
        requester_position: form.requester_position.trim(),
        requester_email: form.requester_email.trim(),

        request_type: form.request_type,
        category: form.category,
        detailed_description: form.detailed_description.trim(),

        rut_file_url: rut.file_url,
        rut_file_name: rut.file_name,

        chamber_commerce_file_url: chamber.file_url,
        chamber_commerce_file_name: chamber.file_name,

        customer_knowledge_file_url: customerKnowledge.file_url,
        customer_knowledge_file_name: customerKnowledge.file_name,

        supplier_knowledge_file_url: supplierKnowledge.file_url,
        supplier_knowledge_file_name: supplierKnowledge.file_name,

        status: "Pendiente",
        updated_at: new Date().toISOString(),
      });
      
      if (error) throw new Error(error.message);

      await fetch("/api/send-third-party-request-email", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    requestNumber,
    requesterName: form.requester_name,
    requesterArea: form.requester_area,
    requestType: form.request_type,
    category: form.category,
  }),
});

      alert(`Solicitud enviada correctamente. Consecutivo: ${requestNumber}`);
      resetForm();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No se pudo enviar la solicitud.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
          Configuración · Terceros · Formatos
        </p>

        <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
          Solicitud de terceros
        </h1>

        <p className="mt-3 max-w-4xl text-base leading-7 text-gray-600">
          Formulario oficial para solicitar la creación o desactivación de
          clientes y proveedores.
        </p>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-6">
          <div>
            <p className="text-sm text-gray-500">Consecutivo</p>
            <h2 className="text-2xl font-bold text-[#07076b]">
              Se genera automáticamente
            </h2>
          </div>

          <span className="rounded-full bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
            Estado inicial: Pendiente
          </span>
        </div>

        <div className="mt-8 space-y-10">
          <section>
            <h3 className="mb-5 text-lg font-bold text-[#07076b]">
              1. Información del solicitante
            </h3>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label="Área *">
                <input
                  value={form.requester_area}
                  onChange={(event) =>
                    updateForm("requester_area", event.target.value)
                  }
                  className={inputClassName}
                />
              </Field>

              <Field label="Nombre solicitante *">
                <input
                  value={form.requester_name}
                  onChange={(event) =>
                    updateForm("requester_name", event.target.value)
                  }
                  className={inputClassName}
                />
              </Field>

              <Field label="Cargo *">
                <input
                  value={form.requester_position}
                  onChange={(event) =>
                    updateForm("requester_position", event.target.value)
                  }
                  className={inputClassName}
                />
              </Field>

              <Field label="Correo electrónico *">
                <input
                  type="email"
                  value={form.requester_email}
                  onChange={(event) =>
                    updateForm("requester_email", event.target.value)
                  }
                  className={inputClassName}
                />
              </Field>
            </div>
          </section>

          <section>
            <h3 className="mb-5 text-lg font-bold text-[#07076b]">
              2. Tipo de solicitud
            </h3>

            <div className="flex flex-wrap gap-6">
              {["Creación", "Desactivación"].map((option) => (
                <label key={option} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={form.request_type === option}
                    onChange={() => updateForm("request_type", option)}
                  />
                  {option}
                </label>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-5 text-lg font-bold text-[#07076b]">
              3. Categoría
            </h3>

            <Field label="Categoría *">
              <select
                value={form.category}
                onChange={(event) => updateForm("category", event.target.value)}
                className={inputClassName}
              >
                <option value="Cliente">Cliente</option>
                <option value="Proveedor">Proveedor</option>
              </select>
            </Field>
          </section>

          <section>
            <h3 className="mb-5 text-lg font-bold text-[#07076b]">
              4. Descripción detallada
            </h3>

            <textarea
              rows={7}
              value={form.detailed_description}
              onChange={(event) =>
                updateForm("detailed_description", event.target.value)
              }
              placeholder="Describe detalladamente la necesidad de creación o desactivación del tercero..."
              className={inputClassName}
            />
          </section>

          <section>
            <h3 className="mb-5 text-lg font-bold text-[#07076b]">
              5. Adjuntos
            </h3>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FileField
                label="Subir RUT *"
                file={rutFile}
                onChange={setRutFile}
              />

              <FileField
                label="Subir Cámara de comercio"
                file={chamberFile}
                onChange={setChamberFile}
              />

              <FileField
                label={`Subir Conocimiento de cliente ${
                  form.category === "Cliente" ? "*" : ""
                }`}
                file={customerKnowledgeFile}
                onChange={setCustomerKnowledgeFile}
              />

              <FileField
                label={`Subir Conocimiento proveedor ${
                  form.category === "Proveedor" ? "*" : ""
                }`}
                file={supplierKnowledgeFile}
                onChange={setSupplierKnowledgeFile}
              />
            </div>
          </section>
        </div>

        <div className="mt-10 flex justify-end gap-3 border-t border-gray-100 pt-6">
          <button
            onClick={resetForm}
            disabled={isSaving}
            className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
          >
            Limpiar
          </button>

          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
          >
            {isSaving ? "Enviando..." : "Enviar solicitud"}
          </button>
        </div>
      </section>
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

function FileField({
  label,
  file,
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <input
        type="file"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        className="block w-full rounded-xl border border-gray-300 p-3 text-sm"
      />

      {file && (
        <p className="mt-2 text-xs text-gray-500">
          Archivo seleccionado: {file.name}
        </p>
      )}
    </div>
  );
}