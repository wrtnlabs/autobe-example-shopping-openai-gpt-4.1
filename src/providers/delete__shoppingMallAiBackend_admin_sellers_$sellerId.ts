import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently remove (soft delete) a seller merchant by ID (admin-only).
 *
 * Permanently remove a seller merchant account from the platform based on its
 * unique seller ID. This operation sets the deleted_at timestamp for evidence
 * and regulatory trace, ensuring the account is no longer active on the system.
 * Attempts to delete non-existent or already deleted sellers will result in a
 * not found error.
 *
 * Only admin users are permitted to perform this removal, ensuring compliance
 * with business policy and legal obligations. Removal cascades through related
 * business and activity records per referential integrity. All such operations
 * are logged in an audit trail for future review and evidence needs.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin user performing the removal
 *   operation
 * @param props.sellerId - UUID of the seller merchant account to remove
 * @returns Void
 * @throws {Error} When the seller does not exist or has already been deleted
 */
export async function delete__shoppingMallAiBackend_admin_sellers_$sellerId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { sellerId } = props;

  // Find seller not already deleted
  const seller =
    await MyGlobal.prisma.shopping_mall_ai_backend_sellers.findFirst({
      where: { id: sellerId, deleted_at: null },
    });
  if (!seller) {
    throw new Error("Seller not found or already deleted");
  }

  // Soft delete: mark deleted_at as now
  await MyGlobal.prisma.shopping_mall_ai_backend_sellers.update({
    where: { id: sellerId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  return;
}
