"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

const inputClassName =
  "w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-[#07076b]";

const initialForm = {
  requester_area: "",
  requester_name: "",
  requester_position: "",
  requester_email: "",
  request_type: "Creación",
  request_category: "Producto",
  classification_code: "",
  classification_name: "",
  product_code_to_deactivate: "",
  product_name_to_deactivate: "",
  detailed_description: "",
};

const classifications = [
  { code: "PTF", name: "Producto Terminado Fabricado" },
  { code: "PTC", name: "Producto Terminado Comercializado" },
  { code: "MPP", name: "Materia Prima Polímeros" },
  { code: "MPC", name: "Materia Prima Cartón" },
  { code: "INS", name: "Insumos" },
  { code: "ALQ", name: "Activos y Logística" },
  { code: "SRV", name: "Servicios" },
];

export default function SolicitudesCodigoPage() {
  const [form, setForm] = useState(initialForm);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function updateForm(field: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(initialForm);
    setAttachmentFile(null);
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

    if (!form.classification_code.trim()) {
      alert("Debes seleccionar una clasificación.");
      return false;
    }

    if (
      form.request_type === "Desactivación" &&
      !form.product_code_to_deactivate.trim()
    ) {
      alert("Debes ingresar el código que deseas desactivar.");
      return false;
    }

    if (!form.detailed_description.trim()) {
      alert("Debes ingresar la descripción detallada.");
      return false;
    }

    return true;
  }

  async function uploadAttachment(requestNumber: string) {
    if (!attachmentFile) {
      return {
        attachment_url: null,
        attachment_filename: null,
      };
    }

    const extension = attachmentFile.name.split(".").pop() ?? "file";
    const safeRequestNumber = requestNumber.replace(/[^A-Z0-9-]/gi, "_");
    const filePath = `${safeRequestNumber}/${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("item-code-request-attachments")
      .upload(filePath, attachmentFile, { upsert: false });

    if (uploadError) throw new Error(uploadError.message);

    const { data } = supabase.storage
      .from("item-code-request-attachments")
      .getPublicUrl(filePath);

    return {
      attachment_url: data.publicUrl,
      attachment_filename: attachmentFile.name,
    };
  }

  async function handleSubmit() {
    if (!validateForm()) return;

    setIsSaving(true);

    try {
      const selectedClassification = classifications.find(
        (item) => item.code === form.classification_code,
      );

      const payload = {
        request_number: "",
        requester_area: form.requester_area.trim(),
        requester_name: form.requester_name.trim(),
        requester_position: form.requester_position.trim(),
        requester_email: form.requester_email.trim() || null,
        request_type: form.request_type,
        request_category: form.request_category,
        classification_code: form.classification_code,
        classification_name: selectedClassification
          ? selectedClassification.name
          : null,
        product_code_to_deactivate:
          form.request_type === "Desactivación"
            ? form.product_code_to_deactivate.trim()
            : null,
        product_name_to_deactivate:
          form.request_type === "Desactivación"
            ? form.product_name_to_deactivate.trim() || null
            : null,
        detailed_description: form.detailed_description.trim(),
        status: "Pendiente",
      };

      const { data, error } = await supabase
        .from("item_code_requests")
        .insert(payload)
        .select("id, request_number")
        .single();

      if (error) throw new Error(error.message);

      const attachment = await uploadAttachment(data.request_number);

      if (attachment.attachment_url || attachment.attachment_filename) {
        const { error: updateError } = await supabase
          .from("item_code_requests")
          .update({
            attachment_url: attachment.attachment_url,
            attachment_filename: attachment.attachment_filename,
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.id);

        if (updateError) throw new Error(updateError.message);
      }
      
      await fetch("/api/send-code-request-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestNumber: data.request_number,
        }),
      });

      alert(`Solicitud creada correctamente: ${data.request_number}`);
      resetForm();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No se pudo crear la solicitud.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
          Configuración · Codificación · Formatos
        </p>

        <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
          Solicitud de código
        </h1>

        <p className="mt-3 max-w-4xl text-base leading-7 text-gray-600">
          Registra solicitudes de creación o desactivación de códigos para su
          posterior gestión por el área responsable de codificación.
        </p>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-6">
          <div>
            <p className="text-sm text-gray-500">Consecutivo</p>

            <h2 className="text-2xl font-bold text-[#07076b]">
              Se genera automáticamente
            </h2>
          </div>

          <div className="rounded-full bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
            Estado inicial: Pendiente
          </div>
        </div>

        <div className="space-y-10">
          <div>
            <h3 className="mb-4 text-lg font-semibold text-[#07076b]">
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

              <Field label="Correo electrónico">
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
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold text-[#07076b]">
              2. Tipo de solicitud
            </h3>

            <div className="flex gap-6">
              <label className="flex items-center gap-3 text-sm text-gray-700">
                <input
                  type="radio"
                  checked={form.request_type === "Creación"}
                  onChange={() => updateForm("request_type", "Creación")}
                />
                Creación
              </label>

              <label className="flex items-center gap-3 text-sm text-gray-700">
                <input
                  type="radio"
                  checked={form.request_type === "Desactivación"}
                  onChange={() => updateForm("request_type", "Desactivación")}
                />
                Desactivación
              </label>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold text-[#07076b]">
              3. Categoría y clasificación
            </h3>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label="Categoría *">
                <select
                  value={form.request_category}
                  onChange={(event) =>
                    updateForm("request_category", event.target.value)
                  }
                  className={inputClassName}
                >
                  <option value="Producto">Producto</option>
                  <option value="Servicio">Servicio</option>
                </select>
              </Field>

              <Field label="Clasificación *">
                <select
                  value={form.classification_code}
                  onChange={(event) =>
                    updateForm("classification_code", event.target.value)
                  }
                  className={inputClassName}
                >
                  <option value="">Seleccionar clasificación</option>
                  {classifications.map((classification) => (
                    <option
                      key={classification.code}
                      value={classification.code}
                    >
                      {classification.code} - {classification.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          {form.request_type === "Desactivación" && (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
              <h3 className="mb-4 text-lg font-semibold text-red-700">
                Código a desactivar
              </h3>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label="Código existente *">
                  <input
                    value={form.product_code_to_deactivate}
                    onChange={(event) =>
                      updateForm(
                        "product_code_to_deactivate",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                    placeholder="Ej: MPP-OR-PE-..."
                  />
                </Field>

                <Field label="Nombre del item">
                  <input
                    value={form.product_name_to_deactivate}
                    onChange={(event) =>
                      updateForm(
                        "product_name_to_deactivate",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                    placeholder="Nombre del producto si se conoce"
                  />
                </Field>
              </div>
            </div>
          )}

          <div>
            <h3 className="mb-4 text-lg font-semibold text-[#07076b]">
              4. Descripción detallada
            </h3>

            <textarea
              rows={6}
              value={form.detailed_description}
              onChange={(event) =>
                updateForm("detailed_description", event.target.value)
              }
              className={inputClassName}
              placeholder="Describe detalladamente la necesidad de creación o desactivación del código..."
            />
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold text-[#07076b]">
              5. Adjuntos
            </h3>

            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.doc,.docx"
              onChange={(event) =>
                setAttachmentFile(event.target.files?.[0] ?? null)
              }
              className="block w-full rounded-xl border border-gray-200 p-3"
            />

            {attachmentFile && (
              <p className="mt-2 text-sm text-gray-500">
                Archivo seleccionado: {attachmentFile.name}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-6">
            <button
              onClick={resetForm}
              disabled={isSaving}
              className="rounded-xl border border-gray-300 px-5 py-3 font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
            >
              Limpiar
            </button>

            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="rounded-xl bg-[#07076b] px-5 py-3 font-medium text-white transition hover:opacity-95 disabled:opacity-60"
            >
              {isSaving ? "Enviando..." : "Enviar solicitud"}
            </button>
          </div>
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
