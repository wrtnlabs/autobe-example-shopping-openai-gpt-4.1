import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Register a new admin account (shopping_mall_ai_backend_admins table) and
 * issue initial authorization tokens.
 *
 * This operation creates a new system administrator with unique username and
 * email, securely stores the given password hash, and immediately issues a JWT
 * token pair for authenticated API access. All field values are validated.
 * Uniqueness constraints are enforced at the application level for precision.
 *
 * @param props - Registration request containing required admin account fields
 *   (username, password_hash, name, email, is_active, optional phone_number).
 * @returns Authorization tokens and full registered admin profile.
 * @throws {Error} If an admin with the given username or email already exists.
 */
export async function post__auth_admin_join(props: {
  body: IShoppingMallAiBackendAdmin.ICreate;
}): Promise<IShoppingMallAiBackendAdmin.IAuthorized> {
  const { username, email, phone_number, password_hash, name, is_active } =
    props.body;

  // Enforce unique username and email (application-level for clear error)
  const existing =
    await MyGlobal.prisma.shopping_mall_ai_backend_admins.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });
  if (existing) {
    throw new Error("Admin with the given username or email already exists");
  }

  // System clocks (all in UTC ISO8601)
  const now = toISOStringSafe(new Date());
  const adminId = v4() as string & tags.Format<"uuid">;

  // Insert record
  const created = await MyGlobal.prisma.shopping_mall_ai_backend_admins.create({
    data: {
      id: adminId,
      username,
      password_hash,
      name,
      email,
      phone_number: phone_number ?? null,
      is_active,
      created_at: now,
      updated_at: now,
      last_login_at: null,
      deleted_at: null,
    },
  });

  // JWT claims
  // access: 1h expiry, refresh: 14d expiry (configurable if needed)
  const accessExp = new Date(Date.parse(now) + 60 * 60 * 1000); // +1 hour
  const refreshExp = new Date(Date.parse(now) + 14 * 24 * 60 * 60 * 1000); // +14 days

  // JWT payload (matches AdminPayload)
  const payload = { id: created.id, type: "admin" };

  const access = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "14d",
    issuer: "autobe",
  });

  return {
    admin: {
      id: created.id,
      username: created.username,
      name: created.name,
      email: created.email,
      phone_number: created.phone_number ?? null,
      is_active: created.is_active,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      last_login_at: null,
      deleted_at: null,
    },
    token: {
      access,
      refresh,
      expired_at: toISOStringSafe(accessExp),
      refreshable_until: toISOStringSafe(refreshExp),
    },
  };
}
