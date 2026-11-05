"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

type Category = {
  id: string;
  code: string;
  name: string;
};

type RequestType =
  | "Creación"
  | "Desactivación";

const inputClassName =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#07076b] focus:ring-2 focus:ring-[#07076b]/10";

export default function SolicitudCodigoAbastecimientoPage() {
  const { session } = useAuth();

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [requestType, setRequestType] =
    useState<RequestType>("Creación");

  const [
    classificationCode,
    setClassificationCode,
  ] = useState("");

  const [
    detailedDescription,
    setDetailedDescription,
  ] = useState("");

  const [
    productCodeToDeactivate,
    setProductCodeToDeactivate,
  ] = useState("");

  const [
    productNameToDeactivate,
    setProductNameToDeactivate,
  ] = useState("");

  const [attachment, setAttachment] =
    useState<File | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const loadCategories = useCallback(
    async () => {
      if (!session?.access_token) return;

      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch(
          "/api/sistema-gestion-calidad/codificacion/solicitudes/clasificaciones",
          {
            headers: {
              Authorization:
                `Bearer ${session.access_token}`,
            },
            cache: "no-store",
          },
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
              "No se pudieron cargar las clasificaciones.",
          );
        }

        setCategories(
          result.categories ?? [],
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las clasificaciones.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [session?.access_token],
  );

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  function resetForm() {
    setRequestType("Creación");
    setClassificationCode("");
    setDetailedDescription("");
    setProductCodeToDeactivate("");
    setProductNameToDeactivate("");
    setAttachment(null);

    const fileInput =
      document.getElementById(
        "code-request-attachment",
      ) as HTMLInputElement | null;

    if (fileInput) {
      fileInput.value = "";
    }
  }

  async function handleSubmit(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (!session?.access_token) {
      setErrorMessage(
        "No se encontró una sesión activa.",
      );
      return;
    }

    if (!classificationCode) {
      setErrorMessage(
        "Debes seleccionar una clasificación.",
      );
      return;
    }

    if (!detailedDescription.trim()) {
      setErrorMessage(
        "Debes ingresar la descripción detallada.",
      );
      return;
    }

    if (
      requestType === "Desactivación" &&
      !productCodeToDeactivate.trim()
    ) {
      setErrorMessage(
        "Debes indicar el código que deseas desactivar.",
      );
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const formData = new FormData();

      formData.append(
        "requester_area",
        "Abastecimiento y Logística",
      );

      formData.append(
        "request_type",
        requestType,
      );

      formData.append(
        "request_category",
        "Producto",
      );

      formData.append(
        "classification_code",
        classificationCode,
      );

      formData.append(
        "detailed_description",
        detailedDescription.trim(),
      );

      if (
        requestType === "Desactivación"
      ) {
        formData.append(
          "product_code_to_deactivate",
          productCodeToDeactivate.trim(),
        );

        formData.append(
          "product_name_to_deactivate",
          productNameToDeactivate.trim(),
        );
      }

      if (attachment) {
        formData.append(
          "attachment",
          attachment,
        );
      }

      const response = await fetch(
        "/api/sistema-gestion-calidad/codificacion/solicitudes",
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${session.access_token}`,
          },
          body: formData,
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "No se pudo crear la solicitud.",
        );
      }

      const requestNumber =
        result.request?.request_number ??
        "";

      setSuccessMessage(
        requestNumber
          ? `Solicitud ${requestNumber} creada correctamente.`
          : "Solicitud creada correctamente.",
      );

      resetForm();
    } catch (error) {
      setErrorMessage(
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
        <div className="mt-6 max-w-4xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            AL · Abastecimiento · Solicitud de código
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-[#07076b]">
            Solicitud de código
          </h1>

          <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
            Solicita la creación o desactivación de
            códigos para materias primas, insumos,
            productos y demás elementos administrados
            en el maestro oficial de CLAP.
          </p>
        </div>
      </section>

      {errorMessage && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700">
            {errorMessage}
          </p>
        </div>
      )}

      {successMessage && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-700">
            {successMessage}
          </p>

          <p className="mt-1 text-sm text-emerald-700">
            La solicitud quedó pendiente para gestión
            por Codificación.
          </p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="max-w-4xl space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Información de la solicitud
          </h2>

          <p className="mt-1 text-sm leading-6 text-gray-500">
            El solicitante, correo y cargo se toman
            automáticamente del usuario autenticado.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Proceso solicitante">
            <input
              value="Abastecimiento y Logística"
              disabled
              className={`${inputClassName} cursor-not-allowed bg-gray-50 text-gray-500`}
            />
          </Field>

          <Field label="Tipo de solicitud *">
            <select
              value={requestType}
              onChange={(event) => {
                const value =
                  event.target
                    .value as RequestType;

                setRequestType(value);
                setErrorMessage("");

                if (value === "Creación") {
                  setProductCodeToDeactivate("");
                  setProductNameToDeactivate("");
                }
              }}
              className={inputClassName}
            >
              <option value="Creación">
                Creación
              </option>

              <option value="Desactivación">
                Desactivación
              </option>
            </select>
          </Field>
        </div>

        <Field label="Clasificación *">
          <select
            value={classificationCode}
            onChange={(event) =>
              setClassificationCode(
                event.target.value,
              )
            }
            disabled={isLoading}
            className={inputClassName}
          >
            <option value="">
              {isLoading
                ? "Cargando clasificaciones..."
                : "Selecciona una clasificación"}
            </option>

            {categories.map(
              (category) => (
                <option
                  key={category.id}
                  value={category.code}
                >
                  {category.code} ·{" "}
                  {category.name}
                </option>
              ),
            )}
          </select>
        </Field>

        {requestType ===
          "Desactivación" && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="Código a desactivar *">
              <input
                value={
                  productCodeToDeactivate
                }
                onChange={(event) =>
                  setProductCodeToDeactivate(
                    event.target.value,
                  )
                }
                className={inputClassName}
                placeholder="Ej. PTF-FM-EN-..."
              />
            </Field>

            <Field label="Nombre del producto">
              <input
                value={
                  productNameToDeactivate
                }
                onChange={(event) =>
                  setProductNameToDeactivate(
                    event.target.value,
                  )
                }
                className={inputClassName}
                placeholder="Nombre actual del producto"
              />
            </Field>
          </div>
        )}

        <Field label="Descripción detallada *">
          <textarea
            value={detailedDescription}
            onChange={(event) =>
              setDetailedDescription(
                event.target.value,
              )
            }
            rows={5}
            className={inputClassName}
            placeholder={
              requestType === "Creación"
                ? "Describe claramente el material, insumo o producto que necesitas codificar."
                : "Explica el motivo de la desactivación."
            }
          />
        </Field>

        <Field label="Adjunto">
          <input
            id="code-request-attachment"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
            onChange={(event) =>
              setAttachment(
                event.target.files?.[0] ??
                  null,
              )
            }
            className={inputClassName}
          />

          <p className="mt-2 text-xs text-gray-500">
            PDF, JPG, PNG o WebP. Máximo 10 MB.
          </p>
        </Field>

        <div className="flex justify-end border-t border-gray-100 pt-5">
          <button
            type="submit"
            disabled={
              isSaving ||
              isLoading ||
              categories.length === 0
            }
            className="rounded-xl bg-[#07076b] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSaving
              ? "Enviando solicitud..."
              : "Enviar solicitud"}
          </button>
        </div>
      </form>
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
