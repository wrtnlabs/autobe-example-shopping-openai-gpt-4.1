import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Delete a specific mileage transaction (admin only) from
 * ai_commerce_mileage_transactions
 *
 * This operation performs a soft delete (sets deleted_at) for a mileage
 * transaction, identified by mileageTransactionId. Only admin users may execute
 * this for audit, compliance, or exceptional business cases. Throws an error if
 * the transaction does not exist or is already deleted.
 *
 * @param props - Object containing all required parameters
 * @param props.admin - The authenticated admin payload (authorization enforced)
 * @param props.mileageTransactionId - The UUID of the mileage transaction to
 *   delete
 * @returns Void
 * @throws {Error} When the transaction does not exist or is already deleted
 */
export async function deleteaiCommerceAdminMileageTransactionsMileageTransactionId(props: {
  admin: AdminPayload;
  mileageTransactionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { mileageTransactionId } = props;
  // Find non-deleted transaction
  const found =
    await MyGlobal.prisma.ai_commerce_mileage_transactions.findFirst({
      where: {
        id: mileageTransactionId,
        deleted_at: null,
      },
    });
  if (!found)
    throw new Error("Mileage transaction not found or already deleted");
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.ai_commerce_mileage_transactions.update({
    where: { id: mileageTransactionId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
