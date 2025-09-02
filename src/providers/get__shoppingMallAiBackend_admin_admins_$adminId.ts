import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get admin account details for a given adminId.
 *
 * Retrieve full detail on an admin account by its unique identifier (adminId).
 * Returns all relevant fields, such as username, real name, email, phone
 * number, account status, last login, audit/update timestamps, and role
 * assignment references. Intended for admin account viewing in privileged
 * management interfaces or for audit trails. This call does not expose password
 * hashes or sensitive authentication secrets. May be restricted by business
 * logic to only high-privilege roles for security reasons. The primary key for
 * search is adminId (UUID).
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin payload
 * @param props.adminId - UUID of the admin account to retrieve
 * @returns Full admin account details for the given adminId
 * @throws {Error} When requesting another admin's detail (self-access only for
 *   now)
 * @throws {Error} When the admin cannot be found or is inactive/deleted
 */
export async function get__shoppingMallAiBackend_admin_admins_$adminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendAdmin> {
  const { admin, adminId } = props;

  // Authorization: Only allow self-access for admin detail (for more advanced role stratification, update this section as needed)
  if (admin.id !== adminId) {
    throw new Error("Forbidden: You can only access your own admin details");
  }

  const found = await MyGlobal.prisma.shopping_mall_ai_backend_admins.findFirst(
    {
      where: { id: adminId, is_active: true, deleted_at: null },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        phone_number: true,
        is_active: true,
        last_login_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true, // include for audit purposes; will be null here but explicit
      },
    },
  );
  if (!found) throw new Error("Admin not found or not active");

  return {
    id: found.id,
    username: found.username,
    name: found.name,
    email: found.email,
    phone_number: found.phone_number ?? null,
    is_active: found.is_active,
    last_login_at: found.last_login_at
      ? toISOStringSafe(found.last_login_at)
      : null,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
    deleted_at: found.deleted_at ? toISOStringSafe(found.deleted_at) : null,
  };
}
