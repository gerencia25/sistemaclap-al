export type DepartmentCode =
  | "JD"
  | "SC"
  | "DF"
  | "DC"
  | "DD"
  | "DT"
  | "DO"
  | "TH"
  | "CO";

export type NavigationItemType =
  | "home"
  | "department"
  | "section"
  | "page";

export type NavigationStatus = "active" | "construction";

export type ClapNavigationItem = {
  id: string;
  code: string;
  label: string;
  shortLabel?: string;
  href: string;
  parentId: string | null;

  departmentCode: DepartmentCode | null;

  type: NavigationItemType;
  status: NavigationStatus;

  permission?: string;
  description?: string;
};

export const CLAP_NAVIGATION: ClapNavigationItem[] = [
  {
    id: "inicio",
    code: "INICIO",
    label: "Inicio",
    href: "/",
    parentId: null,
    departmentCode: null,
    type: "home",
    status: "active",
  },

  {
    id: "jd",
    code: "JD",
    label: "Junta Directiva",
    href: "/junta-directiva",
    parentId: "inicio",
    departmentCode: "JD",
    type: "department",
    status: "construction",
    permission: "JD_VIEW",
    description:
      "Gestión de solicitudes y procesos correspondientes a Junta Directiva.",
  },

  {
    id: "sc",
    code: "SC",
    label: "Sistema de Gestión de la Calidad",
    shortLabel: "Calidad",
    href: "/sistema-gestion-calidad",
    parentId: "inicio",
    departmentCode: "SC",
    type: "department",
    status: "construction",
    permission: "SC_VIEW",
    description:
      "Gestión documental, codificación y administración del Sistema de Gestión de la Calidad.",
  },

  {
    id: "df",
    code: "DF",
    label: "Dirección Financiera",
    href: "/direccion-financiera",
    parentId: "inicio",
    departmentCode: "DF",
    type: "department",
    status: "construction",
    permission: "DF_VIEW",
    description:
      "Gestión financiera, aprobaciones y procesos administrativos.",
  },

  {
    id: "dc",
    code: "DC",
    label: "Dirección Comercial",
    href: "/comercial",
    parentId: "inicio",
    departmentCode: "DC",
    type: "department",
    status: "active",
    permission: "DC_VIEW",
    description:
      "Cotizaciones, pedidos, clientes y procesos comerciales.",
  },

  {
    id: "dd",
    code: "DD",
    label: "Dirección Diseño y Desarrollo",
    href: "/diseno-desarrollo",
    parentId: "inicio",
    departmentCode: "DD",
    type: "department",
    status: "construction",
    permission: "DD_VIEW",
    description:
      "Diseño, desarrollo, viabilidad y solicitudes asociadas a nuevos productos.",
  },

  {
    id: "dt",
    code: "DT",
    label: "Dirección Técnica",
    href: "/direccion-tecnica",
    parentId: "inicio",
    departmentCode: "DT",
    type: "department",
    status: "construction",
    permission: "DT_VIEW",
    description:
      "Aseguramiento de calidad, fichas técnicas e inspecciones.",
  },

  {
    id: "do",
    code: "DO",
    label: "Dirección Operaciones",
    href: "/operaciones",
    parentId: "inicio",
    departmentCode: "DO",
    type: "department",
    status: "construction",
    permission: "DO_VIEW",
    description:
      "Planeación, abastecimiento, logística y procesos productivos.",
  },

    {
    id: "do-pl",
    code: "PL",
    label: "Planeación",
    href: "/operaciones/planeacion",
    parentId: "do",
    departmentCode: "DO",
    type: "section",
    status: "construction",
    permission: "DO_PL_VIEW",
    description:
      "Recepción de pedidos, planeación de necesidades y programación de producción.",
  },

    {
    id: "do-pl-recepcion-pedidos",
    code: "PED",
    label: "Recepción de pedidos",
    href: "/operaciones/planeacion/recepcion-pedidos",
    parentId: "do-pl",
    departmentCode: "DO",
    type: "page",
    status: "construction",
    permission: "DO_PL_PEDIDOS_VIEW",
    description:
      "Recepción y revisión de pedidos comerciales para su posterior planeación.",
  },

  {
    id: "do-pl-solicitud-produccion",
    code: "SPROD",
    label: "Solicitud de producción",
    href: "/operaciones/planeacion/solicitud-produccion",
    parentId: "do-pl",
    departmentCode: "DO",
    type: "page",
    status: "construction",
    permission: "DO_PL_SOLICITUD_PRODUCCION_VIEW",
    description:
      "Generación y seguimiento de solicitudes hacia los procesos productivos.",
  },

  {
    id: "do-pl-procesos-complementarios",
    code: "SPC",
    label: "Solicitud de procesos complementarios",
    shortLabel: "Procesos complementarios",
    href: "/operaciones/planeacion/procesos-complementarios",
    parentId: "do-pl",
    departmentCode: "DO",
    type: "page",
    status: "construction",
    permission: "DO_PL_PROCESOS_COMPLEMENTARIOS_VIEW",
    description:
      "Solicitudes de marca, mezcla, empaque, conteo y ensamble requeridas para completar los pedidos.",
  },

  {
    id: "do-pl-cronograma-produccion",
    code: "CRONO",
    label: "Cronograma de producción",
    href: "/operaciones/planeacion/cronograma-produccion",
    parentId: "do-pl",
    departmentCode: "DO",
    type: "page",
    status: "construction",
    permission: "DO_PL_CRONOGRAMA_VIEW",
    description:
      "Programación de órdenes y actividades productivas previamente generadas.",
  },

  {
    id: "do-ab",
    code: "AB",
    label: "Abastecimiento",
    href: "/operaciones/abastecimiento",
    parentId: "do",
    departmentCode: "DO",
    type: "section",
    status: "construction",
    permission: "DO_AB_VIEW",
    description:
      "Compras, abastecimiento, inventarios y gestión de bodegas.",
  },

  {
    id: "do-lg",
    code: "LG",
    label: "Logística",
    href: "/operaciones/logistica",
    parentId: "do",
    departmentCode: "DO",
    type: "section",
    status: "construction",
    permission: "DO_LG_VIEW",
    description:
      "Programación y ejecución de despachos.",
  },

  {
    id: "do-in",
    code: "IN",
    label: "Inyección",
    href: "/operaciones/inyeccion",
    parentId: "do",
    departmentCode: "DO",
    type: "section",
    status: "construction",
    permission: "DO_IN_VIEW",
    description:
      "Ejecución y seguimiento de órdenes del proceso de inyección.",
  },

  {
    id: "do-ex",
    code: "EX",
    label: "Extrusión",
    href: "/operaciones/extrusion",
    parentId: "do",
    departmentCode: "DO",
    type: "section",
    status: "construction",
    permission: "DO_EX_VIEW",
    description:
      "Ejecución y seguimiento de órdenes del proceso de extrusión.",
  },

  {
    id: "do-sp",
    code: "SP",
    label: "Soplado",
    href: "/operaciones/soplado",
    parentId: "do",
    departmentCode: "DO",
    type: "section",
    status: "construction",
    permission: "DO_SP_VIEW",
    description:
      "Ejecución y seguimiento de órdenes del proceso de soplado.",
  },

  {
    id: "do-me",
    code: "ME",
    label: "Marca y Ensamble",
    href: "/operaciones/marca-ensamble",
    parentId: "do",
    departmentCode: "DO",
    type: "section",
    status: "construction",
    permission: "DO_ME_VIEW",
    description:
      "Marca, empaque, conteo, ensamble y demás operaciones asociadas.",
  },

  {
    id: "do-mz",
    code: "MZ",
    label: "Mezclas",
    href: "/operaciones/mezclas",
    parentId: "do",
    departmentCode: "DO",
    type: "section",
    status: "construction",
    permission: "DO_MZ_VIEW",
    description:
      "Preparación y control de mezclas requeridas por los procesos productivos.",
  },

  {
    id: "do-ml",
    code: "ML",
    label: "Molino",
    href: "/operaciones/molino",
    parentId: "do",
    departmentCode: "DO",
    type: "section",
    status: "construction",
    permission: "DO_ML_VIEW",
    description:
      "Gestión del proceso de molino y material recuperado.",
  },

  {
    id: "do-mt",
    code: "MT",
    label: "Mantenimiento & IT",
    href: "/operaciones/mantenimiento",
    parentId: "do",
    departmentCode: "DO",
    type: "section",
    status: "construction",
    permission: "DO_MT_VIEW",
    description:
      "Mantenimiento de máquinas, infraestructura tecnológica y procesos asociados.",
  },

  {
    id: "th",
    code: "TH",
    label: "Talento Humano",
    href: "/talento-humano",
    parentId: "inicio",
    departmentCode: "TH",
    type: "department",
    status: "construction",
    permission: "TH_VIEW",
    description:
      "Gestión de personal y procesos relacionados con Talento Humano.",
  },

  {
    id: "co",
    code: "CO",
    label: "Configuración",
    href: "/configuracion",
    parentId: "inicio",
    departmentCode: "CO",
    type: "department",
    status: "active",
    permission: "CO_VIEW",
    description:
      "Administración de usuarios, permisos y parámetros generales de CLAP.",
  },
];

export const CLAP_DEPARTMENTS = CLAP_NAVIGATION.filter(
  (item) => item.type === "department"
);

function normalizePath(path: string) {
  if (!path) return "/";

  const cleanPath = path.split("?")[0].split("#")[0];

  if (cleanPath === "/") return "/";

  return cleanPath.endsWith("/")
    ? cleanPath.slice(0, -1)
    : cleanPath;
}

export function getNavigationItemById(id: string) {
  return CLAP_NAVIGATION.find((item) => item.id === id);
}

export function getNavigationItemByHref(href: string) {
  const normalizedHref = normalizePath(href);

  return CLAP_NAVIGATION.find(
    (item) => normalizePath(item.href) === normalizedHref
  );
}

export function getDepartmentByCode(code: DepartmentCode) {
  return CLAP_DEPARTMENTS.find(
    (department) => department.departmentCode === code
  );
}

export function getNavigationChildren(parentId: string) {
  return CLAP_NAVIGATION.filter(
    (item) => item.parentId === parentId
  );
}

export function getNavigationParent(itemId: string) {
  const item = getNavigationItemById(itemId);

  if (!item?.parentId) return undefined;

  return getNavigationItemById(item.parentId);
}

export function getNavigationAncestors(itemId: string) {
  const ancestors: ClapNavigationItem[] = [];
  const visited = new Set<string>();

  let current = getNavigationItemById(itemId);

  while (current?.parentId) {
    if (visited.has(current.id)) {
      break;
    }

    visited.add(current.id);

    const parent = getNavigationItemById(current.parentId);

    if (!parent) {
      break;
    }

    ancestors.unshift(parent);
    current = parent;
  }

  return ancestors;
}

export function getBreadcrumbItems(itemId: string) {
  const current = getNavigationItemById(itemId);

  if (!current) return [];

  return [
    ...getNavigationAncestors(itemId),
    current,
  ];
}

export function getBestNavigationItemByPath(pathname: string) {
  const normalizedPath = normalizePath(pathname);

  const exactMatch = getNavigationItemByHref(normalizedPath);

  if (exactMatch) {
    return exactMatch;
  }

  return CLAP_NAVIGATION
    .filter((item) => item.href !== "/")
    .filter((item) => {
      const itemPath = normalizePath(item.href);

      return normalizedPath.startsWith(`${itemPath}/`);
    })
    .sort((a, b) => b.href.length - a.href.length)[0];
}

export function getBreadcrumbItemsByPath(pathname: string) {
  const item = getBestNavigationItemByPath(pathname);

  if (!item) return [];

  return getBreadcrumbItems(item.id);
}