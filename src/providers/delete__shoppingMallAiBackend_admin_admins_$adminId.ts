import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft deletes an admin account by setting its deleted_at timestamp.
 *
 * This operation logically removes an administrator account (adminId) by
 * marking the deleted_at field, making it inaccessible to authentication or
 * business operations but preserving data for audit and compliance. Only
 * privileged super-admin or compliance admins may erase other admin accounts.
 * Attempts to remove higher-privilege or critical system admin accounts are
 * rejected. Actual privilege logic is a placeholder, as privilege levels are
 * not present in the Prisma schema. Self-deletion is prohibited by default. No
 * data is physically erased.
 *
 * @param props - The request context
 * @param props.admin - The currently authenticated admin performing the
 *   operation
 * @param props.adminId - Unique identifier of the admin account to erase
 * @returns Void
 * @throws {Error} If the admin account does not exist, is already deleted, or
 *   if attempted from a non-privileged context
 */
export async function delete__shoppingMallAiBackend_admin_admins_$adminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, adminId } = props;

  // Fetch the target account
  const target =
    await MyGlobal.prisma.shopping_mall_ai_backend_admins.findFirst({
      where: { id: adminId },
    });
  if (!target) throw new Error("Admin account not found");
  if (target.deleted_at !== null && target.deleted_at !== undefined)
    throw new Error("Admin already deleted");
  // Prevent self-deletion (policy: disallow unless business rules specify otherwise)
  if (admin.id === adminId)
    throw new Error("Not allowed to delete own admin account");
  // Placeholder for privilege-check: No role/privilege field, so cannot enforce higher/same-privilege checks

  // Perform soft delete (set deleted_at to now in ISO string)
  await MyGlobal.prisma.shopping_mall_ai_backend_admins.update({
    where: { id: adminId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  // (Optionally, log the operation for audit—see shopping_mall_ai_backend_admin_audit_logs model)
}
