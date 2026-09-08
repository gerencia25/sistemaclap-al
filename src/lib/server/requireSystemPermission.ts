import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type AuthorizedSystemUser = {
  id: string;
  auth_user_id: string | null;
  employee_id: string | null;
  full_name: string;
  email: string;
  role_id: string | null;
  status: string;
  is_super_admin: boolean;
};

export class ApiAuthorizationError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiAuthorizationError";
    this.status = status;
  }
}

function getBearerToken(request: Request) {
  const authorization =
    request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const [scheme, token] =
    authorization.split(" ");

  if (
    scheme?.toLowerCase() !== "bearer" ||
    !token
  ) {
    return null;
  }

  return token;
}


// =========================================================
// USUARIO CLAP ACTIVO
//
// Valida:
// 1. Sesión Supabase
// 2. Existencia en system_users
// 3. Estado Activo
//
// No exige un permiso particular.
// =========================================================

export async function requireActiveSystemUser(
  request: Request,
): Promise<AuthorizedSystemUser> {
  const accessToken =
    getBearerToken(request);

  if (!accessToken) {
    throw new ApiAuthorizationError(
      "No se encontró una sesión válida.",
      401,
    );
  }

  const {
    data: { user: authUser },
    error: authError,
  } = await supabaseAdmin.auth.getUser(
    accessToken,
  );

  if (
    authError ||
    !authUser
  ) {
    throw new ApiAuthorizationError(
      "La sesión no es válida o ya expiró.",
      401,
    );
  }

  let systemUser:
    | AuthorizedSystemUser
    | null = null;


  // =======================================================
  // BUSCAR PRIMERO POR auth_user_id
  // =======================================================

  const {
    data: userByAuthId,
    error: userByAuthIdError,
  } = await supabaseAdmin
    .from("system_users")
    .select(
      `
        id,
        auth_user_id,
        employee_id,
        full_name,
        email,
        role_id,
        status,
        is_super_admin
      `,
    )
    .eq(
      "auth_user_id",
      authUser.id,
    )
    .maybeSingle();

  if (userByAuthIdError) {
    throw new Error(
      `Error consultando usuario CLAP: ${userByAuthIdError.message}`,
    );
  }

  if (userByAuthId) {
    systemUser =
      userByAuthId as AuthorizedSystemUser;
  }


  // =======================================================
  // COMPATIBILIDAD CON USUARIOS ANTIGUOS
  //
  // Algunos usuarios todavía pueden no tener auth_user_id
  // enlazado. En ese caso buscamos por correo.
  // =======================================================

  if (
    !systemUser &&
    authUser.email
  ) {
    const {
      data: userByEmail,
      error: userByEmailError,
    } = await supabaseAdmin
      .from("system_users")
      .select(
        `
          id,
          auth_user_id,
          employee_id,
          full_name,
          email,
          role_id,
          status,
          is_super_admin
        `,
      )
      .eq(
        "email",
        authUser.email
          .trim()
          .toLowerCase(),
      )
      .maybeSingle();

    if (userByEmailError) {
      throw new Error(
        `Error consultando usuario CLAP: ${userByEmailError.message}`,
      );
    }

    if (userByEmail) {
      systemUser =
        userByEmail as AuthorizedSystemUser;
    }
  }


  // =======================================================
  // VALIDAR USUARIO CLAP
  // =======================================================

  if (!systemUser) {
    throw new ApiAuthorizationError(
      "El usuario autenticado no existe en CLAP.",
      403,
    );
  }

  if (
    systemUser.status !== "Activo"
  ) {
    throw new ApiAuthorizationError(
      "El usuario CLAP se encuentra inactivo.",
      403,
    );
  }

  return systemUser;
}


// =========================================================
// USUARIO CLAP + PERMISO ESPECÍFICO
// =========================================================

export async function requireSystemPermission(
  request: Request,
  permissionCode: string,
): Promise<AuthorizedSystemUser> {

  // Primero aplicamos toda la validación común.
  const systemUser =
    await requireActiveSystemUser(
      request,
    );


  // =======================================================
  // SUPERADMINISTRADOR
  // =======================================================

  if (
    systemUser.is_super_admin
  ) {
    return systemUser;
  }


  // =======================================================
  // ROL
  // =======================================================

  if (!systemUser.role_id) {
    throw new ApiAuthorizationError(
      "El usuario no tiene un rol asignado.",
      403,
    );
  }


  // =======================================================
  // PERMISO
  // =======================================================

  const {
    data: permission,
    error: permissionError,
  } = await supabaseAdmin
    .from("system_permissions")
    .select(
      "id, permission_code",
    )
    .eq(
      "permission_code",
      permissionCode,
    )
    .eq(
      "status",
      "Activo",
    )
    .maybeSingle();

  if (permissionError) {
    throw new Error(
      `Error consultando permiso: ${permissionError.message}`,
    );
  }

  if (!permission) {
    throw new ApiAuthorizationError(
      `El permiso ${permissionCode} no está configurado en CLAP.`,
      403,
    );
  }


  // =======================================================
  // PERMISO DEL ROL
  // =======================================================

  const {
    data: rolePermission,
    error: rolePermissionError,
  } = await supabaseAdmin
    .from(
      "system_role_permissions",
    )
    .select(
      "permission_id",
    )
    .eq(
      "role_id",
      systemUser.role_id,
    )
    .eq(
      "permission_id",
      permission.id,
    )
    .maybeSingle();

  if (rolePermissionError) {
    throw new Error(
      `Error validando permiso del rol: ${rolePermissionError.message}`,
    );
  }

  if (!rolePermission) {
    throw new ApiAuthorizationError(
      "No tienes permisos para realizar esta operación.",
      403,
    );
  }

  return systemUser;
}