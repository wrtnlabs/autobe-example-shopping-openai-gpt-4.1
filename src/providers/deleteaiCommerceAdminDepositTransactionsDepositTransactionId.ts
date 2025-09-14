import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft-delete (logically remove) a deposit transaction by UUID for compliance
 * and audit purposes.
 *
 * This endpoint marks a deposit transaction as logically deleted (soft-delete)
 * by updating the deleted_at field in the ai_commerce_deposit_transactions
 * table. Physical deletion is strictly forbidden for audit and compliance
 * requirements. Only active admins can perform this operation. If the
 * transaction does not exist or is already soft deleted, an error is thrown.
 *
 * @param props - Request parameters
 * @param props.admin - Authenticated admin context (must be an active admin)
 * @param props.depositTransactionId - UUID of the deposit transaction to be
 *   soft-deleted
 * @returns Void
 * @throws {Error} If the deposit transaction does not exist or is already soft
 *   deleted
 */
export async function deleteaiCommerceAdminDepositTransactionsDepositTransactionId(props: {
  admin: AdminPayload;
  depositTransactionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch the transaction, ensure it exists and is not already deleted
  const transaction =
    await MyGlobal.prisma.ai_commerce_deposit_transactions.findFirst({
      where: {
        id: props.depositTransactionId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!transaction) {
    throw new Error("Deposit transaction not found or already deleted");
  }
  // Prepare ISO string timestamps for audit-safe update
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  // Soft-delete (set deleted_at to now)
  await MyGlobal.prisma.ai_commerce_deposit_transactions.update({
    where: { id: props.depositTransactionId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
