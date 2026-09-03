"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Employee = {
  id: string;
  employee_code: string;
  document_type: string;
  document_number: string;
  first_name: string;
  last_name: string;
  full_name: string;
  area_id: string | null;
  position_id: string | null;
  area: string;
  position: string;
  direct_manager_id: string | null;
  email: string | null;
  phone: string | null;
  hire_date: string | null;
  contract_type: string | null;
  employment_status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type EmployeeRequest = {
  id: string;
  request_number: string;

  requester_area: string;
  requester_name: string;
  requester_position: string;
  requester_email: string;

  request_reason: string | null;

  area_id: string | null;
  position_id: string | null;
  area: string;
  position: string;

  requested_quantity: number;
  contract_type: string | null;

  detailed_description: string | null;

  status: string;

  closure_type: string | null;
  closure_reason: string | null;

  completed_at: string | null;
};

type CompanyArea = {
  id: string;
  name: string;
  status: string;
};

type CompanyPosition = {
  id: string;
  area_id: string;
  name: string;
  reports_to_position_id: string | null;
  status: string;
};

type EmployeeForm = {
  document_type: string;
  document_number: string;
  first_name: string;
  last_name: string;
  area_id: string;
  position_id: string;
  direct_manager_id: string;
  email: string;
  phone: string;
  hire_date: string;
  contract_type: string;
  initial_salary: string;
  employment_status: string;
  notes: string;
};

type SalaryHistoryEntry = {
  id: string;
  employee_id: string;
  employment_period_id: string | null;
  monthly_salary: number;
  effective_from: string;
  effective_to: string | null;
  change_reason: string | null;

  status?: "Aplicable" | "Cancelado";

  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  cancelled_by_user_id?: string | null;

  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

type SalaryHistoryEmployee = {
  id: string;
  employee_code: string;
  full_name: string;
  document_type: string;
  document_number: string;
  area: string;
  position: string;
  hire_date: string | null;
  employment_status: string;
};

const emptyForm: EmployeeForm = {
  document_type: "Cédula de ciudadanía",
  document_number: "",
  first_name: "",
  last_name: "",
  area_id: "",
  position_id: "",
  direct_manager_id: "",
  email: "",
  phone: "",
  hire_date: "",
  contract_type: "",
  initial_salary: "",
  employment_status: "Activo",
  notes: "",
};

const documentTypes = [
  "Cédula de ciudadanía",
  "Cédula de extranjería",
  "Pasaporte",
  "Permiso especial de permanencia",
  "Otro",
];

const contractTypes = [
  "Término indefinido",
  "Término fijo",
  "Obra o labor",
  "Prestación de servicios",
  "Aprendizaje",
  "Temporal",
  "Otro",
];

const employmentStatuses = [
  "Activo",
  "Inactivo",
  "Retirado",
  "Suspendido",
];

const editableEmploymentStatuses = [
  "Activo",
  "Inactivo",
  "Suspendido",
];

const terminationTypes = [
  "Renuncia voluntaria",
  "Terminación de contrato",
  "Despido",
  "Finalización de obra o labor",
  "Mutuo acuerdo",
  "Pensión",
  "Otro",
];

function formatDate(date: string | null) {
  if (!date) return "Sin fecha";

  const [year, month, day] = date.split("-");

  if (!year || !month || !day) {
    return "Sin fecha";
  }

  return `${Number(day)}/${Number(month)}/${year}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function getTodayISO() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function PersonalBaseDatosClient() {
  const searchParams = useSearchParams();
  const requestId = searchParams.get("requestId");

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companyAreas, setCompanyAreas] = useState<CompanyArea[]>([]);
  const [companyPositions, setCompanyPositions] = useState<CompanyPosition[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("Todos");

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(
    null
  );

  const [linkedRequest, setLinkedRequest] = useState<EmployeeRequest | null>(
    null
  );

  const [linkedRequestFulfilledCount, setLinkedRequestFulfilledCount] =
    useState(0);

  // =======================================================
  // HISTORIAL SALARIAL
  // =======================================================

  const [salaryModalEmployee, setSalaryModalEmployee] =
    useState<SalaryHistoryEmployee | null>(null);

  const [salaryHistory, setSalaryHistory] = useState<SalaryHistoryEntry[]>([]);

  const [salaryLoading, setSalaryLoading] = useState(false);
  const [salarySaving, setSalarySaving] = useState(false);

  const [newSalary, setNewSalary] = useState("");
  const [salaryEffectiveFrom, setSalaryEffectiveFrom] = useState("");
  const [salaryChangeReason, setSalaryChangeReason] = useState("");

  // =======================================================
  // RETIRO DE EMPLEADO
  // =======================================================

  const [retirementEmployee, setRetirementEmployee] =
    useState<Employee | null>(null);

  const [retirementDate, setRetirementDate] = useState("");
  const [terminationType, setTerminationType] = useState("");
  const [terminationReason, setTerminationReason] = useState("");

  const [retirementSaving, setRetirementSaving] = useState(false);

  // =======================================================

  const [form, setForm] = useState<EmployeeForm>(emptyForm);

  const todayISO = getTodayISO();

  const currentSalaryEntry =
    salaryModalEmployee?.employment_status !== "Retirado"
      ? salaryHistory.find(
          (entry) =>
            entry.status !== "Cancelado" &&
            entry.effective_from <= todayISO &&
            (entry.effective_to === null ||
              entry.effective_to >= todayISO)
        ) ?? null
      : null;

  const lastApplicableSalaryEntry =
    salaryHistory.find(
      (entry) =>
        entry.status !== "Cancelado" &&
        entry.effective_from <= todayISO
    ) ?? null;

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (requestId && !loading) {
      fetchLinkedRequest(requestId);
    }
  }, [requestId, loading]);

  const areaFilterOptions = useMemo(() => {
    const uniqueAreas = Array.from(
      new Set(
        employees
          .map((employee) => employee.area)
          .filter(Boolean)
      )
    );

    return uniqueAreas.sort();
  }, [employees]);

  const filteredPositions = useMemo(() => {
    return companyPositions.filter(
      (position) =>
        position.area_id === form.area_id &&
        position.status === "Activo"
    );
  }, [companyPositions, form.area_id]);

  const selectedArea = useMemo(() => {
    return companyAreas.find((area) => area.id === form.area_id) ?? null;
  }, [companyAreas, form.area_id]);

  const selectedPosition = useMemo(() => {
    return (
      companyPositions.find(
        (position) => position.id === form.position_id
      ) ?? null
    );
  }, [companyPositions, form.position_id]);

  const eligibleManagers = useMemo(() => {
    if (!selectedPosition?.reports_to_position_id) {
      return [];
    }

    return employees.filter(
      (employee) =>
        employee.id !== editingEmployeeId &&
        employee.employment_status === "Activo" &&
        employee.position_id === selectedPosition.reports_to_position_id
    );
  }, [
    employees,
    editingEmployeeId,
    selectedPosition?.reports_to_position_id,
  ]);

  useEffect(() => {
    if (!form.position_id) {
      setForm((current) => ({
        ...current,
        direct_manager_id: "",
      }));

      return;
    }

    if (!selectedPosition?.reports_to_position_id) {
      setForm((current) => ({
        ...current,
        direct_manager_id: "",
      }));

      return;
    }

    if (eligibleManagers.length === 1) {
      setForm((current) => ({
        ...current,
        direct_manager_id: eligibleManagers[0].id,
      }));

      return;
    }

    setForm((current) => {
      const currentManagerStillValid = eligibleManagers.some(
        (employee) => employee.id === current.direct_manager_id
      );

      return currentManagerStillValid
        ? current
        : {
            ...current,
            direct_manager_id: "",
          };
    });
  }, [
    form.position_id,
    selectedPosition?.reports_to_position_id,
    eligibleManagers,
  ]);

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesSearch =
        !normalizedSearch ||
        employee.employee_code
          .toLowerCase()
          .includes(normalizedSearch) ||
        employee.full_name
          .toLowerCase()
          .includes(normalizedSearch) ||
        employee.document_number
          .toLowerCase()
          .includes(normalizedSearch) ||
        employee.area
          .toLowerCase()
          .includes(normalizedSearch) ||
        employee.position
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesArea =
        areaFilter === "Todos" ||
        employee.area === areaFilter;

      const matchesStatus =
        statusFilter === "Todos" ||
        employee.employment_status === statusFilter;

      return matchesSearch && matchesArea && matchesStatus;
    });
  }, [
    employees,
    search,
    areaFilter,
    statusFilter,
  ]);

  const activeEmployees = employees.filter(
    (employee) => employee.employment_status === "Activo"
  ).length;

  const inactiveEmployees = employees.length - activeEmployees;

  // =======================================================
  // CARGA DE DATOS
  // =======================================================

  async function fetchEmployees() {
    setLoading(true);

    const {
      data: employeesData,
      error: employeesError,
    } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (employeesError) {
      alert(
        `Error cargando personal: ${employeesError.message}`
      );

      setLoading(false);
      return;
    }

    const {
      data: areasData,
      error: areasError,
    } = await supabase
      .from("company_areas")
      .select("id, name, status")
      .order("name", {
        ascending: true,
      });

    if (areasError) {
      alert(
        `Error cargando áreas: ${areasError.message}`
      );

      setLoading(false);
      return;
    }

    const {
      data: positionsData,
      error: positionsError,
    } = await supabase
      .from("company_positions")
      .select(
        "id, area_id, name, reports_to_position_id, status"
      )
      .order("name", {
        ascending: true,
      });

    if (positionsError) {
      alert(
        `Error cargando cargos: ${positionsError.message}`
      );

      setLoading(false);
      return;
    }

    setEmployees(
      (employeesData ?? []) as Employee[]
    );

    setCompanyAreas(
      (areasData ?? []) as CompanyArea[]
    );

    setCompanyPositions(
      (positionsData ?? []) as CompanyPosition[]
    );

    setLoading(false);
  }

  function resolveAreaId(
    areaId: string | null,
    areaName: string
  ) {
    if (areaId) {
      return areaId;
    }

    return (
      companyAreas.find(
        (area) => area.name === areaName
      )?.id ?? ""
    );
  }

  function resolvePositionId(
    positionId: string | null,
    positionName: string,
    areaId: string
  ) {
    if (positionId) {
      return positionId;
    }

    return (
      companyPositions.find(
        (position) =>
          position.name === positionName &&
          (!areaId ||
            position.area_id === areaId)
      )?.id ?? ""
    );
  }

  async function fetchLinkedRequest(
    id: string
  ) {
    const { data, error } =
      await supabase
        .from("employee_requests")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
      alert(
        `Error cargando la solicitud de personal: ${error.message}`
      );

      return;
    }

    const request = data as EmployeeRequest;

    if (request.status !== "En gestión") {
      alert(
        `La solicitud ${request.request_number} no está en estado En gestión.`
      );

      return;
    }

    const {
      count,
      error: countError,
    } = await supabase
      .from("employee_request_fulfillments")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "request_id",
        request.id
      );

    if (countError) {
      alert(
        `Error consultando la cobertura de la solicitud: ${countError.message}`
      );

      return;
    }

    const fulfilledCount = count ?? 0;

    if (
      fulfilledCount >=
      request.requested_quantity
    ) {
      alert(
        `La solicitud ${request.request_number} ya tiene cubierta la cantidad solicitada.`
      );

      return;
    }

    const resolvedAreaId =
      resolveAreaId(
        request.area_id,
        request.area
      );

    const resolvedPositionId =
      resolvePositionId(
        request.position_id,
        request.position,
        resolvedAreaId
      );

    setLinkedRequest(request);

    setLinkedRequestFulfilledCount(
      fulfilledCount
    );

    setEditingEmployeeId(null);

    setForm({
      document_type:
        "Cédula de ciudadanía",

      document_number: "",

      first_name: "",
      last_name: "",

      area_id:
        resolvedAreaId,

      position_id:
        resolvedPositionId,

      direct_manager_id: "",

      email: "",
      phone: "",

      hire_date: "",

      contract_type:
        request.contract_type ?? "",

      initial_salary: "",

      employment_status:
        "Activo",

      notes: "",
    });

    setIsModalOpen(true);
  }

  function getManagerName(
    managerId: string | null
  ) {
    if (!managerId) {
      return "Sin jefe directo";
    }

    const manager =
      employees.find(
        (employee) =>
          employee.id === managerId
      );

    return (
      manager?.full_name ??
      "Sin jefe directo"
    );
  }

  // =======================================================
  // HISTORIAL SALARIAL
  // =======================================================

  async function openSalaryHistory(
    employee: Employee
  ) {
    setSalaryLoading(true);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (
      sessionError ||
      !session?.access_token
    ) {
      setSalaryLoading(false);

      alert(
        "No se encontró una sesión válida. Inicia sesión nuevamente."
      );

      return;
    }

    const response = await fetch(
      `/api/talento-humano/personal/salarios?employeeId=${employee.id}`,
      {
        method: "GET",

        headers: {
          Authorization:
            `Bearer ${session.access_token}`,
        },
      }
    );

    const responseBody =
      await response.json();

    if (!response.ok) {
      setSalaryLoading(false);

      alert(
        responseBody?.error ??
          "No fue posible consultar el historial salarial."
      );

      return;
    }

    setSalaryModalEmployee(
      responseBody.data
        .employee as SalaryHistoryEmployee
    );

    setSalaryHistory(
      (
        responseBody.data
          .salary_history ?? []
      ) as SalaryHistoryEntry[]
    );

    setNewSalary("");
    setSalaryEffectiveFrom("");
    setSalaryChangeReason("");

    setSalaryLoading(false);
  }

  function closeSalaryModal() {
    setSalaryModalEmployee(null);
    setSalaryHistory([]);

    setNewSalary("");
    setSalaryEffectiveFrom("");
    setSalaryChangeReason("");
  }

  async function refreshSalaryHistory(
    employeeId: string
  ) {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (
      sessionError ||
      !session?.access_token
    ) {
      throw new Error(
        "No se encontró una sesión válida."
      );
    }

    const response = await fetch(
      `/api/talento-humano/personal/salarios?employeeId=${employeeId}`,
      {
        headers: {
          Authorization:
            `Bearer ${session.access_token}`,
        },
      }
    );

    const responseBody =
      await response.json();

    if (!response.ok) {
      throw new Error(
        responseBody?.error ??
          "No fue posible actualizar el historial salarial."
      );
    }

    setSalaryModalEmployee(
      responseBody.data
        .employee as SalaryHistoryEmployee
    );

    setSalaryHistory(
      (
        responseBody.data
          .salary_history ?? []
      ) as SalaryHistoryEntry[]
    );
  }

  async function registerSalaryChange() {
    if (!salaryModalEmployee) {
      return;
    }

    if (
      salaryModalEmployee.employment_status ===
      "Retirado"
    ) {
      alert(
        "No se pueden registrar cambios salariales para un empleado retirado."
      );

      return;
    }

    const salary =
      Number(newSalary);

    if (
      !Number.isFinite(salary) ||
      salary <= 0
    ) {
      alert(
        "Ingresa un nuevo salario válido."
      );

      return;
    }

    if (!salaryEffectiveFrom) {
      alert(
        "Selecciona la fecha desde la cual aplica el nuevo salario."
      );

      return;
    }

    if (!salaryChangeReason.trim()) {
      alert(
        "Debes indicar el motivo del cambio salarial."
      );

      return;
    }

    const confirmChange =
      confirm(
        `¿Deseas registrar el cambio salarial de ${salaryModalEmployee.full_name}?`
      );

    if (!confirmChange) {
      return;
    }

    setSalarySaving(true);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (
      sessionError ||
      !session?.access_token
    ) {
      setSalarySaving(false);

      alert(
        "No se encontró una sesión válida. Inicia sesión nuevamente."
      );

      return;
    }

    const response = await fetch(
      "/api/talento-humano/personal/salarios",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${session.access_token}`,
        },

        body: JSON.stringify({
          employee_id:
            salaryModalEmployee.id,

          new_monthly_salary:
            salary,

          effective_from:
            salaryEffectiveFrom,

          change_reason:
            salaryChangeReason.trim(),
        }),
      }
    );

    const responseBody =
      await response.json();

    if (!response.ok) {
      setSalarySaving(false);

      alert(
        responseBody?.error ??
          "No fue posible registrar el cambio salarial."
      );

      return;
    }

    try {
      await refreshSalaryHistory(
        salaryModalEmployee.id
      );
    } catch (error) {
      setSalarySaving(false);

      alert(
        error instanceof Error
          ? error.message
          : "El salario cambió, pero no fue posible refrescar el historial."
      );

      return;
    }

    setNewSalary("");
    setSalaryEffectiveFrom("");
    setSalaryChangeReason("");

    setSalarySaving(false);

    alert(
      "Cambio salarial registrado correctamente."
    );
  }

  // =======================================================
  // RETIRO DE EMPLEADO
  // =======================================================

  function openRetirementModal(
    employee: Employee
  ) {
    if (
      employee.employment_status ===
      "Retirado"
    ) {
      alert(
        "Este empleado ya se encuentra retirado."
      );

      return;
    }

    setRetirementEmployee(employee);

    setRetirementDate(
      getTodayISO()
    );

    setTerminationType("");
    setTerminationReason("");
  }

  function closeRetirementModal() {
    setRetirementEmployee(null);

    setRetirementDate("");
    setTerminationType("");
    setTerminationReason("");

    setRetirementSaving(false);
  }

  async function retireEmployee() {
    if (!retirementEmployee) {
      return;
    }

    if (!retirementDate) {
      alert(
        "Selecciona la fecha de retiro."
      );

      return;
    }

    if (
      retirementDate >
      todayISO
    ) {
      alert(
        "La fecha de retiro no puede ser futura."
      );

      return;
    }

    if (!terminationType) {
      alert(
        "Selecciona el tipo de retiro."
      );

      return;
    }

    if (!terminationReason.trim()) {
      alert(
        "Debes indicar el motivo del retiro."
      );

      return;
    }

    const confirmed =
      confirm(
        `¿Confirmas el retiro de ${retirementEmployee.full_name}?\n\n` +
          `Esta operación cerrará su periodo laboral, cerrará el salario aplicable ` +
          `y cancelará los salarios futuros programados.\n\n` +
          `El histórico no será eliminado.`
      );

    if (!confirmed) {
      return;
    }

    setRetirementSaving(true);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (
      sessionError ||
      !session?.access_token
    ) {
      setRetirementSaving(false);

      alert(
        "No se encontró una sesión válida. Inicia sesión nuevamente."
      );

      return;
    }

    const response = await fetch(
      "/api/talento-humano/personal/retirar",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${session.access_token}`,
        },

        body: JSON.stringify({
          employee_id:
            retirementEmployee.id,

          retirement_date:
            retirementDate,

          termination_type:
            terminationType,

          termination_reason:
            terminationReason.trim(),
        }),
      }
    );

    const responseBody =
      await response.json();

    if (!response.ok) {
      setRetirementSaving(false);

      alert(
        responseBody?.error ??
          "No fue posible retirar al empleado."
      );

      return;
    }

    const result =
      responseBody?.data;

    await fetchEmployees();

    setRetirementSaving(false);
    closeRetirementModal();

    alert(
      `Empleado retirado correctamente.\n\n` +
        `${result?.employee_code ?? ""} · ${result?.full_name ?? ""}\n\n` +
        `Periodo laboral cerrado: ${formatDate(
          result?.employment_end ?? null
        )}\n` +
        `Salarios futuros cancelados: ${
          result?.cancelled_future_salaries ?? 0
        }`
    );
  }

  // =======================================================
  // CREAR / EDITAR EMPLEADO
  // =======================================================

  function openCreateModal() {
    setEditingEmployeeId(null);
    setLinkedRequest(null);

    setLinkedRequestFulfilledCount(0);

    setForm(emptyForm);

    setIsModalOpen(true);
  }

  function openEditModal(
    employee: Employee
  ) {
    const resolvedAreaId =
      resolveAreaId(
        employee.area_id,
        employee.area
      );

    const resolvedPositionId =
      resolvePositionId(
        employee.position_id,
        employee.position,
        resolvedAreaId
      );

    setEditingEmployeeId(
      employee.id
    );

    setLinkedRequest(null);

    setLinkedRequestFulfilledCount(0);

    setForm({
      document_type:
        employee.document_type,

      document_number:
        employee.document_number,

      first_name:
        employee.first_name,

      last_name:
        employee.last_name,

      area_id:
        resolvedAreaId,

      position_id:
        resolvedPositionId,

      direct_manager_id:
        employee.direct_manager_id ??
        "",

      email:
        employee.email ?? "",

      phone:
        employee.phone ?? "",

      hire_date:
        employee.hire_date ?? "",

      contract_type:
        employee.contract_type ?? "",

      initial_salary: "",

      employment_status:
        employee.employment_status,

      notes:
        employee.notes ?? "",
    });

    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);

    setEditingEmployeeId(null);
    setLinkedRequest(null);

    setLinkedRequestFulfilledCount(0);

    setForm(emptyForm);
  }

  async function handleSubmit(
  event: FormEvent<HTMLFormElement>
) {
  event.preventDefault();

  const firstName =
    form.first_name.trim();

  const lastName =
    form.last_name.trim();

  // =====================================================
  // VALIDACIONES GENERALES
  // =====================================================

  if (
    !form.document_type ||
    !form.document_number.trim() ||
    !firstName ||
    !lastName ||
    !form.area_id ||
    !form.position_id ||
    (
      !editingEmployeeId &&
      !form.hire_date
    ) ||
    (
      !editingEmployeeId &&
      !form.initial_salary
    )
  ) {
    alert(
      "Completa los campos obligatorios."
    );

    return;
  }

  // =====================================================
  // VALIDAR SALARIO INICIAL SOLO AL CREAR
  // =====================================================

  if (!editingEmployeeId) {
    const initialSalary =
      Number(
        form.initial_salary
      );

    if (
      !Number.isFinite(
        initialSalary
      ) ||
      initialSalary <= 0
    ) {
      alert(
        "Ingresa un salario inicial válido."
      );

      return;
    }
  }

  // =====================================================
  // VALIDAR ÁREA Y CARGO
  // =====================================================

  if (
    !selectedArea ||
    !selectedPosition
  ) {
    alert(
      "Selecciona un área y cargo válidos."
    );

    return;
  }

  // =====================================================
  // VALIDAR JEFE DIRECTO
  // =====================================================

  if (
    editingEmployeeId &&
    form.direct_manager_id ===
      editingEmployeeId
  ) {
    alert(
      "Un empleado no puede ser su propio jefe directo."
    );

    return;
  }

  setSaving(true);

  // =====================================================
  // EDITAR EMPLEADO
  // =====================================================

  if (editingEmployeeId) {
    const {
      data: { session },
      error: sessionError,
    } =
      await supabase.auth.getSession();

    if (
      sessionError ||
      !session?.access_token
    ) {
      setSaving(false);

      alert(
        "No se encontró una sesión válida. Inicia sesión nuevamente."
      );

      return;
    }

    const response =
      await fetch(
        "/api/talento-humano/personal/editar",
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${session.access_token}`,
          },

          body: JSON.stringify({
            employee_id:
              editingEmployeeId,

            document_type:
              form.document_type,

            document_number:
              form.document_number.trim(),

            first_name:
              firstName,

            last_name:
              lastName,

            area_id:
              form.area_id,

            position_id:
              form.position_id,

            direct_manager_id:
              form.direct_manager_id ||
              null,

            email:
              form.email.trim() ||
              null,

            phone:
              form.phone.trim() ||
              null,

            hire_date:
              form.hire_date ||
              null,

            contract_type:
              form.contract_type ||
              null,

            employment_status:
              form.employment_status,

            notes:
              form.notes.trim() ||
              null,
          }),
        }
      );

    const responseBody =
      await response.json();

    if (!response.ok) {
      setSaving(false);

      alert(
        responseBody?.error ??
          "No fue posible actualizar el empleado."
      );

      return;
    }

    alert(
      `Empleado actualizado correctamente.\n\n` +
        `${
          responseBody?.data?.employee_code ??
          ""
        } · ${
          responseBody?.data?.full_name ??
          ""
        }`
    );
  }

  // =====================================================
  // CREAR EMPLEADO
  // =====================================================

  else {
    const {
      data: { session },
      error: sessionError,
    } =
      await supabase.auth.getSession();

    if (
      sessionError ||
      !session?.access_token
    ) {
      setSaving(false);

      alert(
        "No se encontró una sesión válida. Inicia sesión nuevamente."
      );

      return;
    }

    const response =
      await fetch(
        "/api/talento-humano/personal",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${session.access_token}`,
          },

          body: JSON.stringify({
            document_type:
              form.document_type,

            document_number:
              form.document_number.trim(),

            first_name:
              firstName,

            last_name:
              lastName,

            area_id:
              form.area_id,

            position_id:
              form.position_id,

            direct_manager_id:
              form.direct_manager_id ||
              null,

            email:
              form.email.trim() ||
              null,

            phone:
              form.phone.trim() ||
              null,

            hire_date:
              form.hire_date,

            contract_type:
              form.contract_type ||
              null,

            initial_salary:
              Number(
                form.initial_salary
              ),

            employment_status:
              form.employment_status,

            notes:
              form.notes.trim() ||
              null,

            request_id:
              linkedRequest?.id ??
              null,
          }),
        }
      );

    const responseBody =
      await response.json();

    if (!response.ok) {
      setSaving(false);

      alert(
        responseBody?.error ??
          "No fue posible registrar el empleado."
      );

      return;
    }

    const result =
      responseBody?.data;

    const notification =
      responseBody?.notification;

    const emailWarning =
      notification?.required &&
      notification?.sent === false
        ? notification?.warning ||
          "No fue posible enviar el correo de cierre al solicitante."
        : null;

    // ===================================================
    // EMPLEADO VINCULADO A SOLICITUD
    // ===================================================

    if (linkedRequest) {
      const fulfilledCount =
        Number(
          result?.fulfilled_count ??
            0
        );

      const requestedQuantity =
        Number(
          result?.requested_quantity ??
            0
        );

      // =================================================
      // SOLICITUD COMPLETA
      // =================================================

      if (
        result?.request_status ===
        "Cubierta"
      ) {
        let message =
          `Persona registrada correctamente.\n\n` +
          `Empleado: ${
            result?.employee_code ??
            ""
          } · ${
            result?.full_name ??
            ""
          }\n` +
          `Cobertura de ${linkedRequest.request_number}: ` +
          `${fulfilledCount} de ${requestedQuantity}.\n\n` +
          `La solicitud quedó Cubierta · Completa.`;

        if (emailWarning) {
          message +=
            `\n\n⚠️ IMPORTANTE:\n` +
            `El empleado y la solicitud quedaron guardados correctamente, ` +
            `pero no fue posible enviar el correo final al solicitante.\n\n` +
            `${emailWarning}\n\n` +
            `NO vuelvas a registrar a esta persona.`;
        } else {
          message +=
            `\n\nEl correo final fue enviado al solicitante.`;
        }

        alert(message);
      }

      // =================================================
      // SOLICITUD TODAVÍA EN GESTIÓN
      // =================================================

      else {
        alert(
          `Persona registrada correctamente.\n\n` +
            `Empleado: ${
              result?.employee_code ??
              ""
            } · ${
              result?.full_name ??
              ""
            }\n` +
            `Cobertura de ${linkedRequest.request_number}: ` +
            `${fulfilledCount} de ${requestedQuantity}.\n\n` +
            `La solicitud continúa En gestión.`
        );
      }
    }

    // ===================================================
    // EMPLEADO CREADO SIN SOLICITUD
    // ===================================================

    else {
      alert(
        `Empleado registrado correctamente.\n\n` +
          `${
            result?.employee_code ??
            ""
          } · ${
            result?.full_name ??
            ""
          }`
      );
    }
  }

  // =====================================================
  // ACTUALIZAR PANTALLA
  // =====================================================

  await fetchEmployees();

  setSaving(false);

  closeModal();
}

  // =======================================================
  // UI
  // =======================================================

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Talento Humano · Personal · Base de datos
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
            Base de datos de personal
          </h1>

          <p className="mt-3 max-w-4xl text-base leading-7 text-gray-600">
            Administra el maestro de empleados de la organización, su área,
            cargo, jefe directo, datos de contacto y estado laboral.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-full bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#05054f]"
        >
          Nuevo empleado
        </button>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Total empleados
          </p>

          <p className="mt-2 text-3xl font-bold text-[#07076b]">
            {employees.length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Activos
          </p>

          <p className="mt-2 text-3xl font-bold text-emerald-700">
            {activeEmployees}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Inactivos / retirados
          </p>

          <p className="mt-2 text-3xl font-bold text-amber-700">
            {inactiveEmployees}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Buscar
            </label>

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Código, nombre, documento, área o cargo"
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Área
            </label>

            <select
              value={areaFilter}
              onChange={(event) =>
                setAreaFilter(
                  event.target.value
                )
              }
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
            >
              <option value="Todos">
                Todas las áreas
              </option>

              {areaFilterOptions.map(
                (area) => (
                  <option
                    key={area}
                    value={area}
                  >
                    {area}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Estado
            </label>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
            >
              <option value="Todos">
                Todos los estados
              </option>

              {employmentStatuses.map(
                (status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status}
                  </option>
                )
              )}
            </select>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Código
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Empleado
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Documento
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Área / Cargo
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Jefe directo
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Contacto
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Estado
                </th>

                <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-10 text-center text-sm text-gray-500"
                  >
                    Cargando personal...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-10 text-center text-sm text-gray-500"
                  >
                    No se encontraron empleados con ese criterio.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(
                  (employee) => (
                    <tr
                      key={employee.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-5 py-4 text-sm font-semibold text-[#07076b]">
                        {employee.employee_code}
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-gray-900">
                          {employee.full_name}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          Ingreso:{" "}
                          {formatDate(
                            employee.hire_date
                          )}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-900">
                          {employee.document_number}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {employee.document_type}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-gray-900">
                          {employee.area}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {employee.position}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-700">
                        {getManagerName(
                          employee.direct_manager_id
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-900">
                          {employee.email ??
                            "Sin correo"}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {employee.phone ??
                            "Sin teléfono"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            employee.employment_status ===
                            "Activo"
                              ? "bg-emerald-50 text-emerald-700"
                              : employee.employment_status ===
                                "Retirado"
                              ? "bg-gray-100 text-gray-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {employee.employment_status}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openSalaryHistory(
                                employee
                              )
                            }
                            disabled={salaryLoading}
                            className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-semibold text-violet-700 transition hover:border-violet-600 hover:bg-violet-600 hover:text-white disabled:opacity-60"
                          >
                            {salaryLoading
                              ? "Cargando..."
                              : "Historial salarial"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openEditModal(
                                employee
                              )
                            }
                            className="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-[#07076b] transition hover:border-[#07076b] hover:bg-[#07076b] hover:text-white"
                          >
                            Editar
                          </button>

                          {employee.employment_status !==
                            "Retirado" && (
                            <button
                              type="button"
                              onClick={() =>
                                openRetirementModal(
                                  employee
                                )
                              }
                              className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 transition hover:border-red-600 hover:bg-red-600 hover:text-white"
                            >
                              Retirar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ===================================================
          MODAL CREAR / EDITAR EMPLEADO
          =================================================== */}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
          <div className="w-full max-w-5xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex flex-col justify-between gap-4 border-b border-gray-100 pb-5 md:flex-row md:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
                  {editingEmployeeId
                    ? "Editar empleado"
                    : linkedRequest
                    ? `Solicitud ${linkedRequest.request_number}`
                    : "Nuevo empleado"}
                </p>

                <h2 className="mt-2 text-2xl font-bold text-[#07076b]">
                  {editingEmployeeId
                    ? "Actualizar empleado"
                    : linkedRequest
                    ? "Registrar persona contratada"
                    : "Registrar empleado"}
                </h2>

                {linkedRequest && (
                  <div className="mt-3 rounded-2xl border border-violet-100 bg-violet-50 p-4">
                    <p className="text-sm font-semibold text-violet-800">
                      Persona contratada para{" "}
                      {linkedRequest.request_number}
                    </p>

                    <p className="mt-1 text-sm leading-6 text-violet-700">
                      Cobertura actual:{" "}
                      <span className="font-bold">
                        {linkedRequestFulfilledCount} de{" "}
                        {linkedRequest.requested_quantity}
                      </span>
                      . El área y el cargo fueron precargados desde la
                      solicitud de personal.
                    </p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-6 space-y-8"
            >
              <section>
                <h3 className="text-base font-semibold text-gray-900">
                  Información básica
                </h3>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Tipo de documento *
                    </label>

                    <select
                      value={form.document_type}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          document_type:
                            event.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                    >
                      {documentTypes.map(
                        (type) => (
                          <option
                            key={type}
                            value={type}
                          >
                            {type}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Número de documento *
                    </label>

                    <input
                      type="text"
                      value={form.document_number}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          document_number:
                            event.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Nombres *
                    </label>

                    <input
                      type="text"
                      value={form.first_name}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          first_name:
                            event.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Apellidos *
                    </label>

                    <input
                      type="text"
                      value={form.last_name}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          last_name:
                            event.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                    />
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-base font-semibold text-gray-900">
                  Información laboral
                </h3>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Área *
                    </label>

                    <select
                      value={form.area_id}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          area_id:
                            event.target.value,
                          position_id: "",
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                    >
                      <option value="">
                        Seleccionar área
                      </option>

                      {companyAreas
                        .filter(
                          (area) =>
                            area.status ===
                            "Activa"
                        )
                        .map((area) => (
                          <option
                            key={area.id}
                            value={area.id}
                          >
                            {area.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Cargo *
                    </label>

                    <select
                      value={form.position_id}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          position_id:
                            event.target.value,
                        })
                      }
                      disabled={!form.area_id}
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b] disabled:cursor-not-allowed disabled:bg-gray-50"
                    >
                      <option value="">
                        {form.area_id
                          ? "Seleccionar cargo"
                          : "Primero selecciona un área"}
                      </option>

                      {filteredPositions.map(
                        (position) => (
                          <option
                            key={position.id}
                            value={position.id}
                          >
                            {position.name}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Jefe directo
                    </label>

                    <select
                      value={form.direct_manager_id}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          direct_manager_id:
                            event.target.value,
                        })
                      }
                      disabled={
                        !form.position_id ||
                        !selectedPosition?.reports_to_position_id ||
                        eligibleManagers.length <= 1
                      }
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b] disabled:cursor-not-allowed disabled:bg-gray-50"
                    >
                      {!form.position_id ? (
                        <option value="">
                          Primero selecciona un cargo
                        </option>
                      ) : !selectedPosition?.reports_to_position_id ? (
                        <option value="">
                          Este cargo no tiene jefe superior
                        </option>
                      ) : eligibleManagers.length === 0 ? (
                        <option value="">
                          No hay un empleado activo ocupando el cargo superior
                        </option>
                      ) : eligibleManagers.length === 1 ? (
                        <option
                          value={
                            eligibleManagers[0].id
                          }
                        >
                          {eligibleManagers[0].full_name} ·{" "}
                          {eligibleManagers[0].position}
                        </option>
                      ) : (
                        <>
                          <option value="">
                            Seleccionar jefe directo
                          </option>

                          {eligibleManagers.map(
                            (employee) => (
                              <option
                                key={employee.id}
                                value={employee.id}
                              >
                                {employee.full_name} ·{" "}
                                {employee.position}
                              </option>
                            )
                          )}
                        </>
                      )}
                    </select>

                    {selectedPosition?.reports_to_position_id && (
                      <p className="mt-2 text-xs text-gray-500">
                        El jefe directo se determina según la jerarquía
                        configurada para el cargo.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Fecha de ingreso *
                    </label>

                    <input
                      type="date"
                      value={form.hire_date}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          hire_date:
                            event.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Tipo de contrato
                    </label>

                    <select
                      value={form.contract_type}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          contract_type:
                            event.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                    >
                      <option value="">
                        Seleccionar
                      </option>

                      {contractTypes.map(
                        (type) => (
                          <option
                            key={type}
                            value={type}
                          >
                            {type}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {!editingEmployeeId && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Salario mensual inicial *
                      </label>

                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={form.initial_salary}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            initial_salary:
                              event.target.value,
                          })
                        }
                        placeholder="Ej. 1800000"
                        className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                      />

                      <p className="mt-2 text-xs text-gray-500">
                        Este valor será el primer registro del historial
                        salarial del empleado.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Estado laboral
                    </label>

                    <select
                      value={form.employment_status}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          employment_status:
                            event.target.value,
                        })
                      }
                      disabled={
                        Boolean(editingEmployeeId) &&
                        form.employment_status ===
                          "Retirado"
                      }
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b] disabled:cursor-not-allowed disabled:bg-gray-50"
                    >
                      {editingEmployeeId &&
                      form.employment_status ===
                        "Retirado" ? (
                        <option value="Retirado">
                          Retirado
                        </option>
                      ) : (
                        editableEmploymentStatuses.map(
                          (status) => (
                            <option
                              key={status}
                              value={status}
                            >
                              {status}
                            </option>
                          )
                        )
                      )}
                    </select>

                    {editingEmployeeId &&
                      form.employment_status ===
                        "Retirado" && (
                        <p className="mt-2 text-xs text-gray-500">
                          Un empleado retirado no puede reactivarse desde
                          edición. La recontratación tendrá su propio flujo.
                        </p>
                      )}
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-base font-semibold text-gray-900">
                  Contacto y observaciones
                </h3>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Correo
                    </label>

                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          email:
                            event.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Teléfono
                    </label>

                    <input
                      type="text"
                      value={form.phone}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          phone:
                            event.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">
                      Observaciones
                    </label>

                    <textarea
                      value={form.notes}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          notes:
                            event.target.value,
                        })
                      }
                      rows={4}
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                    />
                  </div>
                </div>
              </section>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#05054f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Guardando..."
                    : editingEmployeeId
                    ? "Actualizar empleado"
                    : linkedRequest
                    ? "Registrar persona contratada"
                    : "Guardar empleado"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================
          MODAL HISTORIAL SALARIAL
          =================================================== */}

      {salaryModalEmployee && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
          <div className="w-full max-w-5xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex flex-col justify-between gap-4 border-b border-gray-100 pb-5 md:flex-row md:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
                  Talento Humano · Historial salarial
                </p>

                <h2 className="mt-2 text-2xl font-bold text-[#07076b]">
                  {salaryModalEmployee.full_name}
                </h2>

                <p className="mt-2 text-sm text-gray-600">
                  {salaryModalEmployee.employee_code} ·{" "}
                  {salaryModalEmployee.area} ·{" "}
                  {salaryModalEmployee.position}
                </p>
              </div>

              <button
                type="button"
                onClick={closeSalaryModal}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>

            <div
              className={`mt-6 grid grid-cols-1 gap-5 ${
                salaryModalEmployee.employment_status === "Retirado"
                  ? ""
                  : "lg:grid-cols-[1.25fr_0.75fr]"
              }`}
            >
              <section className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      Historial salarial
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      Registro histórico de salarios y vigencias.
                    </p>
                  </div>

                  {currentSalaryEntry && (
                    <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-right">
                      <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                        Salario vigente
                      </p>

                      <p className="mt-1 text-xl font-bold text-emerald-800">
                        {formatCurrency(
                          Number(
                            currentSalaryEntry.monthly_salary
                          )
                        )}
                      </p>
                    </div>
                  )}

                  {salaryModalEmployee.employment_status ===
                    "Retirado" &&
                    lastApplicableSalaryEntry && (
                      <div className="rounded-2xl bg-gray-100 px-4 py-3 text-right">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-600">
                          Último salario
                        </p>

                        <p className="mt-1 text-xl font-bold text-gray-800">
                          {formatCurrency(
                            Number(
                              lastApplicableSalaryEntry.monthly_salary
                            )
                          )}
                        </p>
                      </div>
                    )}
                </div>

                <div className="mt-5 overflow-hidden rounded-2xl border border-gray-100">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Desde
                          </th>

                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Hasta / Estado
                          </th>

                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Salario
                          </th>

                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Motivo
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-100 bg-white">
                        {salaryHistory.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-4 py-8 text-center text-sm text-gray-500"
                            >
                              Este empleado no tiene historial salarial
                              registrado.
                            </td>
                          </tr>
                        ) : (
                          salaryHistory.map(
                            (entry) => (
                              <tr key={entry.id}>
                                <td className="px-4 py-4 text-sm text-gray-700">
                                  {formatDate(
                                    entry.effective_from
                                  )}
                                </td>

                                <td className="px-4 py-4 text-sm text-gray-700">
                                  {entry.status ===
                                  "Cancelado" ? (
                                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                                      Cancelado
                                    </span>
                                  ) : entry.effective_to ? (
                                    formatDate(
                                      entry.effective_to
                                    )
                                  ) : entry.effective_from >
                                    todayISO ? (
                                    <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                                      Programado
                                    </span>
                                  ) : (
                                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                      Vigente
                                    </span>
                                  )}
                                </td>

                                <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                                  {formatCurrency(
                                    Number(
                                      entry.monthly_salary
                                    )
                                  )}
                                </td>

                                <td className="px-4 py-4 text-sm text-gray-600">
                                  <p>
                                    {entry.change_reason ??
                                      "Sin motivo registrado"}
                                  </p>

                                  {entry.status ===
                                    "Cancelado" &&
                                    entry.cancellation_reason && (
                                      <p className="mt-2 text-xs leading-5 text-red-600">
                                        Cancelación:{" "}
                                        {
                                          entry.cancellation_reason
                                        }
                                      </p>
                                    )}
                                </td>
                              </tr>
                            )
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              {salaryModalEmployee.employment_status !==
                "Retirado" && (
                <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                  <h3 className="text-base font-semibold text-gray-900">
                    Registrar cambio salarial
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    El salario vigente anterior se cerrará automáticamente un
                    día antes de la nueva vigencia.
                  </p>

                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Nuevo salario mensual *
                      </label>

                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={newSalary}
                        onChange={(event) =>
                          setNewSalary(
                            event.target.value
                          )
                        }
                        placeholder="Ej. 2300000"
                        className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Vigente desde *
                      </label>

                      <input
                        type="date"
                        value={salaryEffectiveFrom}
                        onChange={(event) =>
                          setSalaryEffectiveFrom(
                            event.target.value
                          )
                        }
                        className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Motivo del cambio *
                      </label>

                      <textarea
                        rows={4}
                        value={salaryChangeReason}
                        onChange={(event) =>
                          setSalaryChangeReason(
                            event.target.value
                          )
                        }
                        placeholder="Ej. Incremento salarial anual"
                        className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={salarySaving}
                      onClick={registerSalaryChange}
                      className="w-full rounded-full bg-[#07076b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#05054f] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {salarySaving
                        ? "Registrando..."
                        : "Registrar cambio salarial"}
                    </button>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          MODAL RETIRAR EMPLEADO
          =================================================== */}

      {retirementEmployee && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex flex-col justify-between gap-4 border-b border-gray-100 pb-5 md:flex-row md:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-red-500">
                  Talento Humano · Retiro de personal
                </p>

                <h2 className="mt-2 text-2xl font-bold text-[#07076b]">
                  Retirar empleado
                </h2>

                <p className="mt-2 text-sm text-gray-600">
                  {retirementEmployee.employee_code} ·{" "}
                  {retirementEmployee.full_name}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {retirementEmployee.area} ·{" "}
                  {retirementEmployee.position}
                </p>
              </div>

              <button
                type="button"
                onClick={closeRetirementModal}
                disabled={retirementSaving}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800">
                Esta acción cierra el vínculo laboral
              </p>

              <p className="mt-2 text-sm leading-6 text-red-700">
                CLAP cerrará el periodo laboral y el salario aplicable a la
                fecha del retiro. Los salarios futuros programados se marcarán
                como cancelados, pero no se eliminarán del histórico.
              </p>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Fecha de retiro *
                </label>

                <input
                  type="date"
                  value={retirementDate}
                  max={todayISO}
                  onChange={(event) =>
                    setRetirementDate(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                />

                <p className="mt-2 text-xs text-gray-500">
                  No se permiten fechas futuras.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Tipo de retiro *
                </label>

                <select
                  value={terminationType}
                  onChange={(event) =>
                    setTerminationType(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                >
                  <option value="">
                    Seleccionar tipo de retiro
                  </option>

                  {terminationTypes.map(
                    (type) => (
                      <option
                        key={type}
                        value={type}
                      >
                        {type}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Motivo / detalle del retiro *
                </label>

                <textarea
                  rows={5}
                  value={terminationReason}
                  onChange={(event) =>
                    setTerminationReason(
                      event.target.value
                    )
                  }
                  placeholder="Describe el motivo del retiro..."
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                />
              </div>
            </div>

            <div className="mt-7 flex flex-col-reverse justify-end gap-3 border-t border-gray-100 pt-5 sm:flex-row">
              <button
                type="button"
                onClick={closeRetirementModal}
                disabled={retirementSaving}
                className="rounded-full border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={retireEmployee}
                disabled={retirementSaving}
                className="rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {retirementSaving
                  ? "Procesando retiro..."
                  : "Confirmar retiro"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}