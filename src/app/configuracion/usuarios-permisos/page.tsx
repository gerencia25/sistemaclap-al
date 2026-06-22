"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type SystemModule = {
  id: string;
  module_code: string;
  name: string;
  description: string | null;
  route: string | null;
  status: string;
};

type SystemPermission = {
  id: string;
  module_id: string;
  permission_code: string;
  name: string;
  description: string | null;
  action: string;
  status: string;
};

type SystemRole = {
  id: string;
  role_code: string;
  name: string;
  description: string | null;
  status: string;
  is_system_role: boolean;
};

type SystemRolePermission = {
  id: string;
  role_id: string;
  permission_id: string;
};

type SystemUser = {
  id: string;
  employee_id: string | null;
  full_name: string;
  email: string;
  role_id: string | null;
  status: string;
  is_super_admin: boolean;
  last_login_at: string | null;
};

type Employee = {
  id: string;
  full_name: string;
  email: string | null;
  area: string;
  position: string;
  employment_status: string;
};

type UserForm = {
  employee_id: string;
  full_name: string;
  email: string;
  role_id: string;
  status: string;
  is_super_admin: boolean;
};

type RoleForm = {
  name: string;
  description: string;
  status: string;
};

const emptyUserForm: UserForm = {
  employee_id: "",
  full_name: "",
  email: "",
  role_id: "",
  status: "Activo",
  is_super_admin: false,
};

const emptyRoleForm: RoleForm = {
  name: "",
  description: "",
  status: "Activo",
};

const tabs = ["Usuarios", "Roles", "Permisos por rol"] as const;

function getStatusStyles(status: string) {
  if (status === "Activo") return "bg-emerald-50 text-emerald-700";
  if (status === "Bloqueado") return "bg-red-50 text-red-700";
  return "bg-gray-100 text-gray-700";
}

export default function UsuariosPermisosPage() {
  const [activeTab, setActiveTab] =
    useState<(typeof tabs)[number]>("Usuarios");

  const [modules, setModules] = useState<SystemModule[]>([]);
  const [permissions, setPermissions] = useState<SystemPermission[]>([]);
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [rolePermissions, setRolePermissions] = useState<SystemRolePermission[]>(
    []
  );
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userSearch, setUserSearch] = useState("");
  const [roleSearch, setRoleSearch] = useState("");

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

  const [userForm, setUserForm] = useState<UserForm>(emptyUserForm);
  const [roleForm, setRoleForm] = useState<RoleForm>(emptyRoleForm);

  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>(
    []
  );

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedRoleId && roles.length > 0) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  useEffect(() => {
    if (!selectedRoleId) {
      setSelectedPermissionIds([]);
      return;
    }

    const currentPermissions = rolePermissions
      .filter((item) => item.role_id === selectedRoleId)
      .map((item) => item.permission_id);

    setSelectedPermissionIds(currentPermissions);
  }, [selectedRoleId, rolePermissions]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = userSearch.trim().toLowerCase();

    return users.filter((user) => {
      const roleName = getRoleName(user.role_id).toLowerCase();

      return (
        !normalizedSearch ||
        user.full_name.toLowerCase().includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch) ||
        roleName.includes(normalizedSearch) ||
        user.status.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [users, userSearch, roles]);

  const filteredRoles = useMemo(() => {
    const normalizedSearch = roleSearch.trim().toLowerCase();

    return roles.filter((role) => {
      return (
        !normalizedSearch ||
        role.role_code.toLowerCase().includes(normalizedSearch) ||
        role.name.toLowerCase().includes(normalizedSearch) ||
        (role.description ?? "").toLowerCase().includes(normalizedSearch)
      );
    });
  }, [roles, roleSearch]);

  const activeUsers = users.filter((user) => user.status === "Activo").length;
  const activeRoles = roles.filter((role) => role.status === "Activo").length;

  async function fetchData() {
    setLoading(true);

    const { data: modulesData, error: modulesError } = await supabase
      .from("system_modules")
      .select("*")
      .order("name", { ascending: true });

    if (modulesError) {
      alert(`Error cargando módulos: ${modulesError.message}`);
      setLoading(false);
      return;
    }

    const { data: permissionsData, error: permissionsError } = await supabase
      .from("system_permissions")
      .select("*")
      .order("permission_code", { ascending: true });

    if (permissionsError) {
      alert(`Error cargando permisos: ${permissionsError.message}`);
      setLoading(false);
      return;
    }

    const { data: rolesData, error: rolesError } = await supabase
      .from("system_roles")
      .select("*")
      .order("name", { ascending: true });

    if (rolesError) {
      alert(`Error cargando roles: ${rolesError.message}`);
      setLoading(false);
      return;
    }

    const { data: rolePermissionsData, error: rolePermissionsError } =
      await supabase.from("system_role_permissions").select("*");

    if (rolePermissionsError) {
      alert(`Error cargando permisos por rol: ${rolePermissionsError.message}`);
      setLoading(false);
      return;
    }

    const { data: usersData, error: usersError } = await supabase
      .from("system_users")
      .select("*")
      .order("full_name", { ascending: true });

    if (usersError) {
      alert(`Error cargando usuarios: ${usersError.message}`);
      setLoading(false);
      return;
    }

    const { data: employeesData, error: employeesError } = await supabase
      .from("employees")
      .select("id, full_name, email, area, position, employment_status")
      .eq("employment_status", "Activo")
      .order("full_name", { ascending: true });

    if (employeesError) {
      alert(`Error cargando empleados: ${employeesError.message}`);
      setLoading(false);
      return;
    }

    setModules((modulesData ?? []) as SystemModule[]);
    setPermissions((permissionsData ?? []) as SystemPermission[]);
    setRoles((rolesData ?? []) as SystemRole[]);
    setRolePermissions((rolePermissionsData ?? []) as SystemRolePermission[]);
    setUsers((usersData ?? []) as SystemUser[]);
    setEmployees((employeesData ?? []) as Employee[]);

    setLoading(false);
  }

  async function generateRoleCode() {
    const { data, error } = await supabase
      .from("system_roles")
      .select("role_code")
      .ilike("role_code", "ROL-%")
      .order("role_code", { ascending: false })
      .limit(1);

    if (error) throw new Error(error.message);

    const lastCode = data?.[0]?.role_code as string | undefined;
    const match = lastCode?.match(/ROL-(\d+)/);
    const nextNumber = match ? Number(match[1]) + 1 : 1;

    return `ROL-${String(nextNumber).padStart(6, "0")}`;
  }

  function getRoleName(roleId: string | null) {
    if (!roleId) return "Sin rol";
    return roles.find((role) => role.id === roleId)?.name ?? "Sin rol";
  }

  function getModuleName(moduleId: string) {
    return modules.find((module) => module.id === moduleId)?.name ?? "Módulo";
  }

  function openCreateUserModal() {
    setEditingUserId(null);
    setUserForm({
      ...emptyUserForm,
      role_id: roles[0]?.id ?? "",
    });
    setIsUserModalOpen(true);
  }

  function openEditUserModal(user: SystemUser) {
    setEditingUserId(user.id);
    setUserForm({
      employee_id: user.employee_id ?? "",
      full_name: user.full_name,
      email: user.email,
      role_id: user.role_id ?? "",
      status: user.status,
      is_super_admin: user.is_super_admin,
    });
    setIsUserModalOpen(true);
  }

  function openCreateRoleModal() {
    setEditingRoleId(null);
    setRoleForm(emptyRoleForm);
    setIsRoleModalOpen(true);
  }

  function openEditRoleModal(role: SystemRole) {
    setEditingRoleId(role.id);
    setRoleForm({
      name: role.name,
      description: role.description ?? "",
      status: role.status,
    });
    setIsRoleModalOpen(true);
  }

  function handleEmployeeSelect(employeeId: string) {
    const employee = employees.find((item) => item.id === employeeId);

    if (!employee) {
      setUserForm({
        ...userForm,
        employee_id: "",
        full_name: "",
        email: "",
      });
      return;
    }

    setUserForm({
      ...userForm,
      employee_id: employee.id,
      full_name: employee.full_name,
      email: employee.email ?? "",
    });
  }

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userForm.full_name.trim() || !userForm.email.trim()) {
      alert("El nombre y el correo son obligatorios.");
      return;
    }

    setSaving(true);

    const payload = {
      employee_id: userForm.employee_id || null,
      full_name: userForm.full_name.trim(),
      email: userForm.email.trim().toLowerCase(),
      role_id: userForm.role_id || null,
      status: userForm.status,
      is_super_admin: userForm.is_super_admin,
      updated_at: new Date().toISOString(),
    };

    if (editingUserId) {
      const { error } = await supabase
        .from("system_users")
        .update(payload)
        .eq("id", editingUserId);

      if (error) {
        setSaving(false);
        alert(`Error actualizando usuario: ${error.message}`);
        return;
      }
    } else {
      const { error } = await supabase.from("system_users").insert([payload]);

      if (error) {
        setSaving(false);
        alert(`Error creando usuario: ${error.message}`);
        return;
      }
    }

    await fetchData();
    setSaving(false);
    setIsUserModalOpen(false);
  }

  async function saveRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!roleForm.name.trim()) {
      alert("El nombre del rol es obligatorio.");
      return;
    }

    setSaving(true);

    const payload = {
      name: roleForm.name.trim(),
      description: roleForm.description.trim() || null,
      status: roleForm.status,
      updated_at: new Date().toISOString(),
    };

    if (editingRoleId) {
      const { error } = await supabase
        .from("system_roles")
        .update(payload)
        .eq("id", editingRoleId);

      if (error) {
        setSaving(false);
        alert(`Error actualizando rol: ${error.message}`);
        return;
      }
    } else {
      let roleCode = "";

      try {
        roleCode = await generateRoleCode();
      } catch (error) {
        setSaving(false);
        alert(
          error instanceof Error
            ? `Error generando código de rol: ${error.message}`
            : "Error generando código de rol."
        );
        return;
      }

      const { error } = await supabase.from("system_roles").insert([
        {
          role_code: roleCode,
          is_system_role: false,
          ...payload,
        },
      ]);

      if (error) {
        setSaving(false);
        alert(`Error creando rol: ${error.message}`);
        return;
      }
    }

    await fetchData();
    setSaving(false);
    setIsRoleModalOpen(false);
  }

  function togglePermission(permissionId: string) {
    setSelectedPermissionIds((current) => {
      if (current.includes(permissionId)) {
        return current.filter((id) => id !== permissionId);
      }

      return [...current, permissionId];
    });
  }

  async function saveRolePermissions() {
    if (!selectedRoleId) {
      alert("Selecciona un rol.");
      return;
    }

    setSaving(true);

    const { error: deleteError } = await supabase
      .from("system_role_permissions")
      .delete()
      .eq("role_id", selectedRoleId);

    if (deleteError) {
      setSaving(false);
      alert(`Error limpiando permisos del rol: ${deleteError.message}`);
      return;
    }

    if (selectedPermissionIds.length > 0) {
      const rows = selectedPermissionIds.map((permissionId) => ({
        role_id: selectedRoleId,
        permission_id: permissionId,
      }));

      const { error: insertError } = await supabase
        .from("system_role_permissions")
        .insert(rows);

      if (insertError) {
        setSaving(false);
        alert(`Error guardando permisos del rol: ${insertError.message}`);
        return;
      }
    }

    await fetchData();
    setSaving(false);
    alert("Permisos actualizados correctamente.");
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Configuración · Usuarios y permisos
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
            Usuarios y permisos
          </h1>

          <p className="mt-3 max-w-4xl text-base leading-7 text-gray-600">
            Administra usuarios del sistema, roles y permisos por módulo. Esta
            pantalla prepara la seguridad del ERP antes de activar el control de
            acceso real.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={openCreateUserModal}
            className="rounded-full bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#05054f]"
          >
            Nuevo usuario
          </button>

          <button
            type="button"
            onClick={openCreateRoleModal}
            className="rounded-full border border-[#07076b] px-5 py-3 text-sm font-semibold text-[#07076b] transition hover:bg-[#07076b] hover:text-white"
          >
            Nuevo rol
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Usuarios</p>
          <p className="mt-2 text-3xl font-bold text-[#07076b]">
            {users.length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Usuarios activos</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">
            {activeUsers}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Roles</p>
          <p className="mt-2 text-3xl font-bold text-[#07076b]">
            {roles.length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Permisos</p>
          <p className="mt-2 text-3xl font-bold text-[#07076b]">
            {permissions.length}
          </p>
        </div>
      </section>

      <section className="flex flex-wrap gap-3 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
              activeTab === tab
                ? "bg-[#07076b] text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab}
          </button>
        ))}
      </section>

      {activeTab === "Usuarios" && (
        <section className="space-y-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <label className="text-sm font-medium text-gray-700">
              Buscar usuarios
            </label>
            <input
              type="text"
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Nombre, correo, rol o estado"
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Usuario
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Rol
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Tipo
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Estado
                    </th>
                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-10 text-center text-sm text-gray-500"
                      >
                        Cargando usuarios...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-10 text-center text-sm text-gray-500"
                      >
                        No se encontraron usuarios.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-gray-900">
                            {user.full_name}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {user.email}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-700">
                          {getRoleName(user.role_id)}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              user.is_super_admin
                                ? "bg-purple-50 text-purple-700"
                                : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {user.is_super_admin
                              ? "Super administrador"
                              : "Usuario"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusStyles(
                              user.status
                            )}`}
                          >
                            {user.status}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => openEditUserModal(user)}
                            className="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-[#07076b] transition hover:border-[#07076b] hover:bg-[#07076b] hover:text-white"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {activeTab === "Roles" && (
        <section className="space-y-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <label className="text-sm font-medium text-gray-700">
              Buscar roles
            </label>
            <input
              type="text"
              value={roleSearch}
              onChange={(event) => setRoleSearch(event.target.value)}
              placeholder="Código, nombre o descripción"
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Código
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Rol
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Tipo
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Estado
                    </th>
                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-10 text-center text-sm text-gray-500"
                      >
                        Cargando roles...
                      </td>
                    </tr>
                  ) : filteredRoles.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-10 text-center text-sm text-gray-500"
                      >
                        No se encontraron roles.
                      </td>
                    </tr>
                  ) : (
                    filteredRoles.map((role) => (
                      <tr key={role.id} className="hover:bg-gray-50">
                        <td className="px-5 py-4 text-sm font-bold text-[#07076b]">
                          {role.role_code}
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-gray-900">
                            {role.name}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {role.description ?? "Sin descripción"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              role.is_system_role
                                ? "bg-blue-50 text-blue-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {role.is_system_role ? "Sistema" : "Personalizado"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusStyles(
                              role.status
                            )}`}
                          >
                            {role.status}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => openEditRoleModal(role)}
                            className="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-[#07076b] transition hover:border-[#07076b] hover:bg-[#07076b] hover:text-white"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {activeTab === "Permisos por rol" && (
        <section className="space-y-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <label className="text-sm font-medium text-gray-700">
              Seleccionar rol
            </label>
            <select
              value={selectedRoleId}
              onChange={(event) => setSelectedRoleId(event.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            {modules.map((module) => {
              const modulePermissions = permissions.filter(
                (permission) =>
                  permission.module_id === module.id &&
                  permission.status === "Activo"
              );

              if (modulePermissions.length === 0) return null;

              return (
                <div
                  key={module.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div>
                    <h3 className="text-lg font-bold text-[#07076b]">
                      {module.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {module.description ?? "Permisos del módulo."}
                    </p>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {modulePermissions.map((permission) => (
                      <label
                        key={permission.id}
                        className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-100 p-4 transition hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPermissionIds.includes(
                            permission.id
                          )}
                          onChange={() => togglePermission(permission.id)}
                          className="mt-1"
                        />

                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {permission.name}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {permission.permission_code}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-gray-500">
                            {permission.description ?? "Sin descripción"}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={saving || !selectedRoleId}
              onClick={saveRolePermissions}
              className="rounded-full bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#05054f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Guardando permisos..." : "Guardar permisos del rol"}
            </button>
          </div>
        </section>
      )}

      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex justify-between gap-4 border-b border-gray-100 pb-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
                  {editingUserId ? "Editar usuario" : "Nuevo usuario"}
                </p>
                <h2 className="mt-2 text-2xl font-bold text-[#07076b]">
                  {editingUserId ? "Actualizar usuario" : "Crear usuario"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={saveUser} className="mt-6 space-y-5">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Empleado relacionado
                </label>
                <select
                  value={userForm.employee_id}
                  onChange={(event) => handleEmployeeSelect(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                >
                  <option value="">Sin empleado relacionado</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.full_name} · {employee.position}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    value={userForm.full_name}
                    onChange={(event) =>
                      setUserForm({
                        ...userForm,
                        full_name: event.target.value,
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Correo *
                  </label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(event) =>
                      setUserForm({ ...userForm, email: event.target.value })
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Rol
                  </label>
                  <select
                    value={userForm.role_id}
                    onChange={(event) =>
                      setUserForm({ ...userForm, role_id: event.target.value })
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                  >
                    <option value="">Sin rol</option>
                    {roles
                      .filter((role) => role.status === "Activo")
                      .map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Estado
                  </label>
                  <select
                    value={userForm.status}
                    onChange={(event) =>
                      setUserForm({ ...userForm, status: event.target.value })
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                    <option value="Bloqueado">Bloqueado</option>
                  </select>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-100 p-4">
                <input
                  type="checkbox"
                  checked={userForm.is_super_admin}
                  onChange={(event) =>
                    setUserForm({
                      ...userForm,
                      is_super_admin: event.target.checked,
                    })
                  }
                />
                <span className="text-sm font-medium text-gray-700">
                  Marcar como super administrador
                </span>
              </label>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
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
                    : editingUserId
                    ? "Actualizar usuario"
                    : "Guardar usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex justify-between gap-4 border-b border-gray-100 pb-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
                  {editingRoleId ? "Editar rol" : "Nuevo rol"}
                </p>
                <h2 className="mt-2 text-2xl font-bold text-[#07076b]">
                  {editingRoleId ? "Actualizar rol" : "Crear rol"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={saveRole} className="mt-6 space-y-5">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Nombre del rol *
                </label>
                <input
                  type="text"
                  value={roleForm.name}
                  onChange={(event) =>
                    setRoleForm({ ...roleForm, name: event.target.value })
                  }
                  placeholder="Ej: Calidad, Logística, Gerencia..."
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Descripción
                </label>
                <textarea
                  value={roleForm.description}
                  onChange={(event) =>
                    setRoleForm({
                      ...roleForm,
                      description: event.target.value,
                    })
                  }
                  rows={4}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Estado
                </label>
                <select
                  value={roleForm.status}
                  onChange={(event) =>
                    setRoleForm({ ...roleForm, status: event.target.value })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
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
                    : editingRoleId
                    ? "Actualizar rol"
                    : "Guardar rol"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
