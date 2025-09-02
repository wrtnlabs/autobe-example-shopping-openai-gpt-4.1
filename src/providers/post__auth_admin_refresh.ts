import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Renew admin authentication tokens using a valid refresh token
 * (shopping_mall_ai_backend_admins table).
 *
 * This API endpoint implements authentication token renewal for admin users. It
 * validates a refresh token by verifying its signature and payload, locates the
 * corresponding admin by ID, and ensures that the admin is active and not
 * deleted. If valid, it issues new access and refresh JWT tokens with the same
 * payload structure as the original tokens, and returns the up-to-date admin
 * details (excluding sensitive data) and the new tokens in the required DTO
 * structure. All datetime fields are returned as branded ISO8601 strings per
 * system convention.
 *
 * @param props - Request properties
 * @returns Up-to-date admin info and new token pair compliant with DTO. Throws
 *   Error on any invalid/expired/unauthorized attempt.
 * @throws {Error} When refresh token is invalid, expired, admin is not active,
 *   or admin record is deleted
 * @field body - The request body containing the refresh token string
 */
export async function post__auth_admin_refresh(props: {
  body: IShoppingMallAiBackendAdmin.IRefresh;
}): Promise<IShoppingMallAiBackendAdmin.IAuthorized> {
  const { refresh_token } = props.body;

  // Step 1: Validate and decode the refresh token
  let decoded: unknown;
  try {
    decoded = jwt.verify(refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new Error("Invalid or expired refresh token");
  }

  // Step 2: Ensure decoded token has correct shape and type
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    !("id" in decoded) ||
    !("type" in decoded) ||
    (decoded as any).type !== "admin" ||
    typeof (decoded as any).id !== "string"
  ) {
    throw new Error("Invalid refresh token");
  }
  const adminId = (decoded as { id: string; type: string }).id;

  // Step 3: Lookup admin by id, check eligibility
  const dbAdmin =
    await MyGlobal.prisma.shopping_mall_ai_backend_admins.findUnique({
      where: { id: adminId },
    });
  if (!dbAdmin || !dbAdmin.is_active || dbAdmin.deleted_at !== null) {
    throw new Error("Admin not found or not eligible for token refresh");
  }

  // Step 4: Compose up-to-date admin DTO (never expose password_hash)
  const admin: IShoppingMallAiBackendAdmin = {
    id: dbAdmin.id,
    username: dbAdmin.username,
    name: dbAdmin.name,
    email: dbAdmin.email,
    phone_number: dbAdmin.phone_number ?? null,
    is_active: dbAdmin.is_active,
    last_login_at: dbAdmin.last_login_at
      ? toISOStringSafe(dbAdmin.last_login_at)
      : null,
    created_at: toISOStringSafe(dbAdmin.created_at),
    updated_at: toISOStringSafe(dbAdmin.updated_at),
    deleted_at: dbAdmin.deleted_at ? toISOStringSafe(dbAdmin.deleted_at) : null,
  };

  // Step 5: Generate new access and refresh JWT tokens with identical payload structure
  const accessExpSec = 60 * 60; // 1 hour
  const refreshExpSec = 60 * 60 * 24 * 7; // 7 days
  const now = Date.now();
  const expired_at = toISOStringSafe(new Date(now + accessExpSec * 1000));
  const refreshable_until = toISOStringSafe(
    new Date(now + refreshExpSec * 1000),
  );

  const payload = { id: admin.id, type: "admin" };

  const access = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: accessExpSec,
    issuer: "autobe",
  });
  const refresh = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: refreshExpSec,
    issuer: "autobe",
  });

  const token: IAuthorizationToken = {
    access,
    refresh,
    expired_at,
    refreshable_until,
  };

  // Return the up-to-date admin info and the new token set
  return {
    admin,
    token,
  };
}
