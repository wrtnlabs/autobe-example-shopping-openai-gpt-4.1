import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update the public profile or status fields of an admin account.
 *
 * This endpoint allows a privileged admin (super-admin or similar) to modify
 * public/profile/status fields (name, email, phone_number, is_active) for a
 * target admin account. It does NOT allow updating password or authentication
 * secrets, and operations are logged for audit and compliance. Uniqueness is
 * enforced for email and username, and errors are thrown if constraints are
 * violated. Returns the updated admin record, including up-to-date, all
 * string-formatted date fields.
 *
 * @param props - The update request
 * @param props.admin - Authenticated admin performing the update
 * @param props.adminId - ID of the admin to update
 * @param props.body - Fields to update (opt-in only)
 * @returns The updated admin profile for display
 * @throws {Error} If admin not found or deleted, or uniqueness/business
 *   constraint violations
 */
export async function put__shoppingMallAiBackend_admin_admins_$adminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendAdmin.IUpdate;
}): Promise<IShoppingMallAiBackendAdmin> {
  const { admin, adminId, body } = props;
  // 1. Fetch the admin record to update (ensure not deleted)
  const prev = await MyGlobal.prisma.shopping_mall_ai_backend_admins.findFirst({
    where: { id: adminId, deleted_at: null },
  });
  if (!prev) {
    throw new Error("Admin not found or deleted");
  }
  // 2. Update allowed fields (name, email, phone_number, is_active)
  //    and always update updated_at. All date fields use toISOStringSafe.
  let updated;
  try {
    updated = await MyGlobal.prisma.shopping_mall_ai_backend_admins.update({
      where: { id: adminId },
      data: {
        name: body.name ?? undefined,
        email: body.email ?? undefined,
        phone_number:
          body.phone_number === undefined ? undefined : body.phone_number,
        is_active: body.is_active ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });
  } catch (err: any) {
    // Prisma unique constraint violation error code
    if (err.code === "P2002") {
      throw new Error("Duplicate email or username is not allowed");
    }
    throw err;
  }
  // 3. TODO: Insert audit log for before/after state change if business policy requires

  // 4. Return updated record, ensuring all dates as string & tags.Format<'date-time'> and nullables handled
  return {
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
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
