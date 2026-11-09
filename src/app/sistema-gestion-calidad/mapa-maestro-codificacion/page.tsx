"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/components/auth/AuthProvider";

type Category = {
  id: string;
  code: string;
  name: string;
};

type Group = {
  id: string;
  category_id: string;
  code: string;
  name: string;
};

type Subgroup = {
  id: string;
  group_id: string;
  code: string;
  name: string;
};

type Template = {
  id: string;
  category_code: string;
  group_code: string;
  subgroup_code: string;
  full_code?: string | null;
  name?: string | null;
  code_pattern?: string | null;
  name_pattern?: string | null;
  numeric_code_length?: number | null;
};

type TemplateField = {
  id: string;
  template_id: string;
  field_key: string;
  field_label: string;
  field_type: string;
  required: boolean;
  display_order: number;
  code_length?: number | null;
  contributes_to_code?: boolean | null;
  contributes_to_name?: boolean | null;
};

type ClassificationOption = {
  id: string;
  template_id: string;
  field_key: string;
  code: string;
  name: string;
};

type ConfigurationResponse = {
  categories?: Category[];
  groups?: Group[];
  subgroups?: Subgroup[];
  templates?: Template[];
  template_fields?: TemplateField[];
  options?: ClassificationOption[];
  error?: string;
};

type MasterRow = {
  category: Category;
  group: Group;
  subgroup: Subgroup;
  template: Template;
  fields: TemplateField[];
};

const inputClassName =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#07076b] focus:ring-2 focus:ring-[#07076b]/10";

function normalize(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("es");
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n")
  ) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

function buildNumericStructure(
  fields: TemplateField[],
) {
  const codeFields = fields
    .filter(
      (field) =>
        field.contributes_to_code !== false &&
        Number(field.code_length ?? 0) > 0,
    )
    .sort(
      (a, b) =>
        Number(a.display_order ?? 0) -
        Number(b.display_order ?? 0),
    );

  if (!codeFields.length) {
    return "Sin estructura configurada";
  }

  let offset = 0;

  return codeFields
    .map((field) => {
      const length = Number(
        field.code_length ?? 0,
      );

      const start = offset + 1;
      const end = offset + length;
      offset = end;

      return `${field.field_label} (${start}-${end})`;
    })
    .join(" · ");
}

function SummaryCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: number;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold tracking-tight text-[#07076b]">
        {value}
      </p>

      <p className="mt-1 text-xs leading-5 text-gray-400">
        {helper}
      </p>
    </div>
  );
}

export default function MapaMaestroCodificacionPage() {
  const { session } = useAuth();

  const [categories, setCategories] =
    useState<Category[]>([]);
  const [groups, setGroups] =
    useState<Group[]>([]);
  const [subgroups, setSubgroups] =
    useState<Subgroup[]>([]);
  const [templates, setTemplates] =
    useState<Template[]>([]);
  const [templateFields, setTemplateFields] =
    useState<TemplateField[]>([]);
  const [options, setOptions] =
    useState<ClassificationOption[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);
  const [errorMessage, setErrorMessage] =
    useState("");
  const [search, setSearch] =
    useState("");
  const [categoryFilter, setCategoryFilter] =
    useState("TODAS");
  const [expandedTemplates, setExpandedTemplates] =
    useState<Set<string>>(new Set());

  useEffect(() => {
    if (!session?.access_token) {
      return;
    }

    let active = true;

    async function loadData() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch(
          "/api/sistema-gestion-calidad/codificacion/configuracion",
          {
            headers: {
              Authorization:
                `Bearer ${session?.access_token ?? ""}`,
            },
            cache: "no-store",
          },
        );

        const payload =
          (await response.json()) as ConfigurationResponse;

        if (!response.ok) {
          throw new Error(
            payload.error ||
              "No se pudo cargar el mapa maestro de codificación.",
          );
        }

        if (!active) return;

        setCategories(payload.categories ?? []);
        setGroups(payload.groups ?? []);
        setSubgroups(payload.subgroups ?? []);
        setTemplates(payload.templates ?? []);
        setTemplateFields(
          payload.template_fields ?? [],
        );
        setOptions(payload.options ?? []);
      } catch (error) {
        if (!active) return;

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudo cargar el mapa maestro de codificación.",
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [session?.access_token]);

  const rows = useMemo<MasterRow[]>(() => {
    const categoryByCode = new Map(
      categories.map((category) => [
        category.code,
        category,
      ]),
    );

    const groupsByCategoryAndCode =
      new Map(
        groups.map((group) => [
          `${group.category_id}|${group.code}`,
          group,
        ]),
      );

    const subgroupByGroupAndCode =
      new Map(
        subgroups.map((subgroup) => [
          `${subgroup.group_id}|${subgroup.code}`,
          subgroup,
        ]),
      );

    return templates
      .map((template) => {
        const category =
          categoryByCode.get(
            template.category_code,
          );

        if (!category) return null;

        const group =
          groupsByCategoryAndCode.get(
            `${category.id}|${template.group_code}`,
          );

        if (!group) return null;

        const subgroup =
          subgroupByGroupAndCode.get(
            `${group.id}|${template.subgroup_code}`,
          );

        if (!subgroup) return null;

        const fields = templateFields
          .filter(
            (field) =>
              field.template_id ===
              template.id,
          )
          .sort(
            (a, b) =>
              Number(a.display_order ?? 0) -
              Number(b.display_order ?? 0),
          );

        return {
          category,
          group,
          subgroup,
          template,
          fields,
        };
      })
      .filter(
        (row): row is MasterRow =>
          Boolean(row),
      )
      .sort((a, b) =>
        (
          a.template.full_code ||
          `${a.category.code}-${a.group.code}-${a.subgroup.code}`
        ).localeCompare(
          b.template.full_code ||
            `${b.category.code}-${b.group.code}-${b.subgroup.code}`,
          "es",
        ),
      );
  }, [
    categories,
    groups,
    subgroups,
    templates,
    templateFields,
  ]);

  const visibleRows = useMemo(() => {
    const query = normalize(search);

    return rows.filter((row) => {
      if (
        categoryFilter !== "TODAS" &&
        row.category.code !== categoryFilter
      ) {
        return false;
      }

      if (!query) return true;

      const searchable = normalize(
        [
          row.category.code,
          row.category.name,
          row.group.code,
          row.group.name,
          row.subgroup.code,
          row.subgroup.name,
          row.template.full_code,
          row.template.name,
          ...row.fields.map(
            (field) => field.field_label,
          ),
        ].join(" "),
      );

      return searchable.includes(query);
    });
  }, [
    rows,
    search,
    categoryFilter,
  ]);

  const categoryGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        category: Category;
        groups: Map<
          string,
          {
            group: Group;
            rows: MasterRow[];
          }
        >;
      }
    >();

    for (const row of visibleRows) {
      if (!map.has(row.category.id)) {
        map.set(row.category.id, {
          category: row.category,
          groups: new Map(),
        });
      }

      const categoryEntry =
        map.get(row.category.id)!;

      if (
        !categoryEntry.groups.has(
          row.group.id,
        )
      ) {
        categoryEntry.groups.set(
          row.group.id,
          {
            group: row.group,
            rows: [],
          },
        );
      }

      categoryEntry.groups
        .get(row.group.id)!
        .rows.push(row);
    }

    return [...map.values()];
  }, [visibleRows]);

  const summary = useMemo(() => {
    return {
      categories:
        new Set(
          rows.map(
            (row) => row.category.id,
          ),
        ).size,
      groups:
        new Set(
          rows.map(
            (row) => row.group.id,
          ),
        ).size,
      subgroups: rows.length,
      classifications: rows.length,
    };
  }, [rows]);

  function toggleTemplate(
    templateId: string,
  ) {
    setExpandedTemplates((current) => {
      const next = new Set(current);

      if (next.has(templateId)) {
        next.delete(templateId);
      } else {
        next.add(templateId);
      }

      return next;
    });
  }

  function expandVisible() {
    setExpandedTemplates(
      new Set(
        visibleRows.map(
          (row) => row.template.id,
        ),
      ),
    );
  }

  function collapseAll() {
    setExpandedTemplates(new Set());
  }

  function exportCsv() {
    const headers = [
      "Categoría",
      "Nombre categoría",
      "Grupo",
      "Nombre grupo",
      "Subgrupo",
      "Nombre subgrupo",
      "Clasificación",
      "Nombre plantilla",
      "Longitud numérica",
      "Patrón código",
      "Campos de codificación",
    ];

    const lines = visibleRows.map(
      (row) => {
        const fullCode =
          row.template.full_code ||
          `${row.category.code}-${row.group.code}-${row.subgroup.code}`;

        return [
          row.category.code,
          row.category.name,
          row.group.code,
          row.group.name,
          row.subgroup.code,
          row.subgroup.name,
          fullCode,
          row.template.name ?? "",
          row.template.numeric_code_length ??
            "",
          row.template.code_pattern ??
            "",
          buildNumericStructure(
            row.fields,
          ),
        ]
          .map(escapeCsv)
          .join(",");
      },
    );

    const csv = [
      headers.map(escapeCsv).join(","),
      ...lines,
    ].join("\n");

    const blob = new Blob(
      ["\uFEFF", csv],
      {
        type: "text/csv;charset=utf-8",
      },
    );

    const url =
      URL.createObjectURL(blob);

    const anchor =
      document.createElement("a");

    anchor.href = url;
    anchor.download =
      "Mapa_Maestro_Codificacion_CLAP.csv";

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <section>


        <p className="mb-3 mt-6 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
          SC · Consulta oficial
        </p>

        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
              Mapa maestro de codificación
            </h1>

            <p className="mt-3 max-w-4xl text-base leading-7 text-gray-600">
              Consulta la estructura oficial vigente de
              categorías, grupos, subgrupos y
              clasificaciones utilizadas por CLAP para
              generar códigos de productos, materias
              primas, insumos, activos, alquileres y
              servicios.
            </p>
          </div>

          <button
            type="button"
            onClick={exportCsv}
            disabled={
              isLoading ||
              visibleRows.length === 0
            }
            className="shrink-0 rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            Exportar catálogo CSV
          </button>
        </div>
      </section>


      {errorMessage && (
        <section className="rounded-2xl border border-red-100 bg-red-50 p-5">
          <p className="font-semibold text-red-700">
            No se pudo cargar el mapa maestro
          </p>

          <p className="mt-1 text-sm text-red-600">
            {errorMessage}
          </p>
        </section>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Categorías"
          value={summary.categories}
          helper="Familias principales con plantilla activa"
        />

        <SummaryCard
          label="Grupos"
          value={summary.groups}
          helper="Grupos utilizados por clasificaciones vigentes"
        />

        <SummaryCard
          label="Subgrupos"
          value={summary.subgroups}
          helper="Subgrupos con estructura de código activa"
        />

        <SummaryCard
          label="Clasificaciones"
          value={summary.classifications}
          helper="Códigos de clasificación disponibles"
        />
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px_auto] lg:items-end">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Buscar en el mapa
            </label>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Ej: PTF, tapas, empaque, polímeros, ALQ..."
              className={
                inputClassName
              }
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Categoría
            </label>

            <select
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(
                  event.target.value,
                )
              }
              className={
                inputClassName
              }
            >
              <option value="TODAS">
                Todas las categorías
              </option>

              {[...categories]
                .sort((a, b) =>
                  a.code.localeCompare(
                    b.code,
                    "es",
                  ),
                )
                .map((category) => (
                  <option
                    key={category.id}
                    value={category.code}
                  >
                    {category.code} ·{" "}
                    {category.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={expandVisible}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-[#07076b] transition hover:border-[#07076b]/30 hover:bg-indigo-50"
            >
              Expandir
            </button>

            <button
              type="button"
              onClick={collapseAll}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
            >
              Contraer
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span className="rounded-full bg-gray-100 px-3 py-1.5">
            {visibleRows.length} clasificación
            {visibleRows.length === 1
              ? ""
              : "es"}{" "}
            visible
            {visibleRows.length === 1
              ? ""
              : "s"}
          </span>

          <span>
            Estructura general: Categoría · Grupo ·
            Subgrupo · Bloque numérico
          </span>
        </div>
      </section>

      {isLoading ? (
        <section className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Cargando mapa maestro de codificación...
          </p>
        </section>
      ) : categoryGroups.length === 0 ? (
        <section className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
          <p className="font-semibold text-gray-900">
            No encontramos clasificaciones con esos
            filtros.
          </p>

          <p className="mt-2 text-sm text-gray-500">
            Prueba con otro término de búsqueda o
            selecciona todas las categorías.
          </p>
        </section>
      ) : (
        <section className="space-y-5">
          {categoryGroups.map(
            ({
              category,
              groups: categoryGroupMap,
            }) => (
              <article
                key={category.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
              >
                <header className="flex flex-col gap-3 border-b border-gray-100 bg-slate-50/70 px-5 py-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#07076b] text-sm font-bold text-white">
                      {category.code}
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                        Categoría
                      </p>

                      <h2 className="mt-1 text-lg font-bold text-gray-900">
                        {category.code} ·{" "}
                        {category.name}
                      </h2>
                    </div>
                  </div>

                  <span className="w-fit rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-[#07076b]">
                    {[
                      ...categoryGroupMap.values(),
                    ].reduce(
                      (total, group) =>
                        total +
                        group.rows.length,
                      0,
                    )}{" "}
                    clasificaciones
                  </span>
                </header>

                <div className="divide-y divide-gray-100">
                  {[
                    ...categoryGroupMap.values(),
                  ].map(
                    ({
                      group,
                      rows: groupRows,
                    }) => (
                      <div
                        key={group.id}
                        className="p-5"
                      >
                        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                              Grupo
                            </p>

                            <h3 className="mt-1 font-semibold text-gray-900">
                              {category.code}-
                              {group.code} ·{" "}
                              {group.name}
                            </h3>
                          </div>

                          <p className="text-xs text-gray-400">
                            {groupRows.length} subgrupo
                            {groupRows.length === 1
                              ? ""
                              : "s"}{" "}
                            codificado
                            {groupRows.length === 1
                              ? ""
                              : "s"}
                          </p>
                        </div>

                        <div className="space-y-3">
                          {groupRows.map(
                            (row) => {
                              const fullCode =
                                row.template
                                  .full_code ||
                                `${row.category.code}-${row.group.code}-${row.subgroup.code}`;

                              const isExpanded =
                                expandedTemplates.has(
                                  row.template.id,
                                );

                              return (
                                <div
                                  key={
                                    row.template.id
                                  }
                                  className="overflow-hidden rounded-xl border border-gray-200"
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleTemplate(
                                        row
                                          .template
                                          .id,
                                      )
                                    }
                                    className="flex w-full flex-col gap-4 px-4 py-4 text-left transition hover:bg-gray-50 md:flex-row md:items-center md:justify-between"
                                  >
                                    <div className="flex min-w-0 items-start gap-4">
                                      <div className="flex h-10 min-w-24 shrink-0 items-center justify-center rounded-lg bg-indigo-50 px-3 font-mono text-sm font-bold text-[#07076b]">
                                        {
                                          fullCode
                                        }
                                      </div>

                                      <div className="min-w-0">
                                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                                          Subgrupo{" "}
                                          {
                                            row
                                              .subgroup
                                              .code
                                          }
                                        </p>

                                        <p className="mt-1 font-semibold text-gray-900">
                                          {
                                            row
                                              .subgroup
                                              .name
                                          }
                                        </p>

                                        {row
                                          .template
                                          .name && (
                                          <p className="mt-1 text-sm text-gray-500">
                                            {
                                              row
                                                .template
                                                .name
                                            }
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-3">
                                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                                        Activo
                                      </span>

                                      <span className="text-sm font-semibold text-[#07076b]">
                                        {isExpanded
                                          ? "Ocultar detalle ↑"
                                          : "Ver estructura ↓"}
                                      </span>
                                    </div>
                                  </button>

                                  {isExpanded && (
                                    <div className="border-t border-gray-100 bg-slate-50/50 p-4">
                                      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_1fr]">
                                        <div className="space-y-3">
                                          <div className="rounded-xl border border-gray-200 bg-white p-4">
                                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                                              Código de
                                              clasificación
                                            </p>

                                            <p className="mt-2 font-mono text-lg font-bold text-[#07076b]">
                                              {
                                                fullCode
                                              }
                                            </p>
                                          </div>

                                          <div className="rounded-xl border border-gray-200 bg-white p-4">
                                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                                              Bloque
                                              numérico
                                            </p>

                                            <p className="mt-2 text-2xl font-bold text-gray-900">
                                              {Number(
                                                row
                                                  .template
                                                  .numeric_code_length ??
                                                  0,
                                              ) ||
                                                "—"}
                                            </p>

                                            <p className="mt-1 text-xs text-gray-500">
                                              dígitos
                                              configurados
                                            </p>
                                          </div>

                                          {row
                                            .template
                                            .code_pattern && (
                                            <div className="rounded-xl border border-gray-200 bg-white p-4">
                                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                                                Patrón
                                              </p>

                                              <p className="mt-2 break-all font-mono text-sm text-gray-700">
                                                {
                                                  row
                                                    .template
                                                    .code_pattern
                                                }
                                              </p>
                                            </div>
                                          )}
                                        </div>

                                        <div>
                                          <div className="mb-3">
                                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                                              Estructura
                                              del bloque
                                              numérico
                                            </p>

                                            <p className="mt-1 text-sm leading-6 text-gray-600">
                                              {buildNumericStructure(
                                                row.fields,
                                              )}
                                            </p>
                                          </div>

                                          {row.fields
                                            .length ===
                                          0 ? (
                                            <div className="rounded-xl border border-dashed border-gray-200 bg-white p-5 text-sm text-gray-500">
                                              Esta
                                              clasificación
                                              no tiene campos
                                              dinámicos
                                              visibles.
                                            </div>
                                          ) : (
                                            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                              {row.fields.map(
                                                (
                                                  field,
                                                  index,
                                                ) => {
                                                  const fieldOptions =
                                                    options.filter(
                                                      (
                                                        option,
                                                      ) =>
                                                        option.template_id ===
                                                          row
                                                            .template
                                                            .id &&
                                                        option.field_key ===
                                                          field.field_key,
                                                    );

                                                  return (
                                                    <div
                                                      key={
                                                        field.id
                                                      }
                                                      className="rounded-xl border border-gray-200 bg-white p-4"
                                                    >
                                                      <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                          <p className="text-xs font-semibold text-gray-400">
                                                            Campo{" "}
                                                            {index +
                                                              1}
                                                          </p>

                                                          <p className="mt-1 font-semibold text-gray-900">
                                                            {
                                                              field.field_label
                                                            }
                                                          </p>
                                                        </div>

                                                        {Number(
                                                          field.code_length ??
                                                            0,
                                                        ) >
                                                          0 && (
                                                          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-[#07076b]">
                                                            {
                                                              field.code_length
                                                            }{" "}
                                                            díg.
                                                          </span>
                                                        )}
                                                      </div>

                                                      <div className="mt-3 flex flex-wrap gap-1.5">
                                                        {fieldOptions.length >
                                                        0 ? (
                                                          fieldOptions.map(
                                                            (
                                                              option,
                                                            ) => (
                                                              <span
                                                                key={
                                                                  option.id
                                                                }
                                                                className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600"
                                                              >
                                                                <span className="font-mono font-semibold text-[#07076b]">
                                                                  {
                                                                    option.code
                                                                  }
                                                                </span>{" "}
                                                                ·{" "}
                                                                {
                                                                  option.name
                                                                }
                                                              </span>
                                                            ),
                                                          )
                                                        ) : (
                                                          <span className="text-xs text-gray-400">
                                                            Sin
                                                            opciones
                                                            predeterminadas
                                                          </span>
                                                        )}
                                                      </div>
                                                    </div>
                                                  );
                                                },
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            },
                          )}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </article>
            ),
          )}
        </section>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-gray-900">
          Cómo leer un código CLAP
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              step: "1",
              title: "Categoría",
              text: "Identifica la familia principal: PTF, PTC, MPP, MPC, INS, ALQ, SER, entre otras.",
            },
            {
              step: "2",
              title: "Grupo",
              text: "Ubica el producto dentro de una familia funcional o industrial de la categoría.",
            },
            {
              step: "3",
              title: "Subgrupo",
              text: "Define la clasificación específica que determina qué atributos deben codificarse.",
            },
            {
              step: "4",
              title: "Bloque numérico",
              text: "Se genera con los atributos seleccionados en la plantilla vigente de esa clasificación.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-xl border border-gray-100 bg-slate-50 p-4"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#07076b] text-xs font-bold text-white">
                {item.step}
              </div>

              <p className="mt-3 font-semibold text-gray-900">
                {item.title}
              </p>

              <p className="mt-1 text-sm leading-6 text-gray-500">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
