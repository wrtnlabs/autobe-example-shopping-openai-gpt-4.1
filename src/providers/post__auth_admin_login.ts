import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Authenticate admin using username/password and issue authorization tokens
 * (shopping_mall_ai_backend_admins table).
 *
 * This API endpoint implements credential-based login for admin users by
 * accepting username and password. It references the
 * shopping_mall_ai_backend_admins schema, where username uniquely identifies
 * each admin and password_hash stores a securely hashed credential.
 *
 * The operation validates the provided credentials, confirms that the admin
 * account is active (is_active=true), not deleted (deleted_at is null), and if
 * authentication is successful, updates last_login_at for activity monitoring
 * and audit. It then generates and returns new access and refresh JWT tokens
 * with session metadata.
 *
 * Failed login attempts for suspended, deactivated, or non-existent accounts
 * are denied with appropriate business error codes, maintaining compliance and
 * evidence. All credential handling adheres to backend storage and transmission
 * security, never exposing hashes or plain text. The authentication supports
 * standard business login workflows, including error handling for duplicates,
 * concurrent sessions, and lockout policies as defined in business rules.
 *
 * This operation is to be used in tandem with join (registration) and refresh
 * endpoints, forming the core of the admin authentication system for secure API
 * management.
 *
 * @param props - Request properties
 * @param props.body - Admin login credentials (username, password). Password is
 *   securely validated against stored password_hash.
 * @returns Authorization token pair and admin account details for authenticated
 *   admin session, including roles and permissions.
 * @throws {Error} When the username does not exist
 * @throws {Error} When the credentials are invalid
 * @throws {Error} When the account is inactive or suspended
 */
export async function post__auth_admin_login(props: {
  body: IShoppingMallAiBackendAdmin.ILogin;
}): Promise<IShoppingMallAiBackendAdmin.IAuthorized> {
  const { username, password } = props.body;
  // 1. Find the admin by username and ensure not deleted
  const admin = await MyGlobal.prisma.shopping_mall_ai_backend_admins.findFirst(
    {
      where: {
        username,
        deleted_at: null,
      },
    },
  );
  if (!admin) throw new Error("Invalid credentials: user not found");
  // 2. Check is_active
  if (admin.is_active !== true) throw new Error("Account is not active");
  // 3. Verify password
  const valid = await MyGlobal.password.verify(password, admin.password_hash);
  if (!valid) throw new Error("Invalid credentials: bad password");
  // 4. Update last_login_at
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_ai_backend_admins.update({
    where: { id: admin.id },
    data: { last_login_at: now },
  });
  // 5. Refetch the updated admin data
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_admins.findUniqueOrThrow({
      where: { id: admin.id },
    });
  // 6. Create JWT tokens using global 'jwt' utility (not MyGlobal.jwt!)
  const accessExpires = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour from now
  const refreshExpires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 days from now
  const accessToken = jwt.sign(
    { id: updated.id, type: "admin" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    { id: updated.id, type: "admin", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Build DTO output
  return {
    admin: {
      id: updated.id,
      username: updated.username,
      name: updated.name,
      email: updated.email,
      phone_number: updated.phone_number ?? null,
      is_active: updated.is_active,
      last_login_at: updated.last_login_at
        ? toISOStringSafe(updated.last_login_at)
        : null,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      deleted_at: updated.deleted_at
        ? toISOStringSafe(updated.deleted_at)
        : null,
    },
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(accessExpires * 1000)),
      refreshable_until: toISOStringSafe(new Date(refreshExpires * 1000)),
    },
  };
}
