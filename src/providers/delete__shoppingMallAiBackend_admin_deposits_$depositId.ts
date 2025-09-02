import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete (logical deletion) of a deposit ledger by deposit ID.
 *
 * This privileged operation sets the deleted_at timestamp on the record,
 * excluding it from active business operations but keeping it available for
 * internal audit, compliance evidence, and regulatory review. Soft-deleted
 * deposit ledgers are not permanently removed and can be recovered for
 * investigation or reporting as necessary. Application logic and business
 * processes respect the deleted_at field to ignore soft-deleted records except
 * when accessing audit logs or legal evidence.
 *
 * This operation is typically performed by admin or finance teams for data
 * governance, fraud investigation, business need, or regulatory requirements,
 * with every action strictly logged. Use this endpoint instead of permanent
 * delete except where explicit irrecoverable data removal is necessary under
 * compliance direction.
 *
 * Any attempt to delete an already soft-deleted or non-existent ledger returns
 * a business error.
 *
 * @param props - Object containing:
 *
 *   - Admin: AdminPayload for admin authentication
 *   - DepositId: Unique identifier of the deposit ledger to soft delete (UUID)
 *
 * @returns Void
 * @throws {Error} If the deposit ledger is not found or already deleted
 */
export async function delete__shoppingMallAiBackend_admin_deposits_$depositId(props: {
  admin: AdminPayload;
  depositId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, depositId } = props;
  // Authorization: admin role presence required (enforced by controller/decorator)
  const deposit =
    await MyGlobal.prisma.shopping_mall_ai_backend_deposits.findFirst({
      where: {
        id: depositId,
        deleted_at: null,
      },
    });
  if (!deposit) {
    throw new Error("Deposit ledger not found or already deleted");
  }
  // Update: mark as soft deleted by setting deleted_at
  await MyGlobal.prisma.shopping_mall_ai_backend_deposits.update({
    where: { id: depositId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
