import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently (soft) deletes a payment transaction record by ID (admin only).
 *
 * This operation marks the given payment transaction as deleted by setting its
 * `deleted_at` and `updated_at` fields to the current timestamp, rather than
 * removing it from the database. Only available to admins and intended solely
 * for exceptional correction of erroneous transactions. Throws if the payment
 * transaction does not exist or is already deleted. No return value is
 * provided.
 *
 * Security: Only system administrators (admins) may perform this action. This
 * function enforces soft delete behavior as described in the schema.
 *
 * NOTE: Although the business description recommends audit logging for
 * compliance, there is no defined audit log table in the payment subsystem
 * schema. If such a table is added, this business operation should append an
 * audit record in addition to the update.
 *
 * @param props - Properties for operation.
 * @param props.admin - Authenticated admin performing the operation. Must be
 *   present for authorization.
 * @param props.paymentTransactionId - Unique identifier (UUID) of the payment
 *   transaction to delete. Must refer to an existing, not-yet-deleted record.
 * @returns Void
 * @throws {Error} If the specified transaction does not exist or is already
 *   deleted.
 */
export async function deleteaiCommerceAdminPaymentTransactionsPaymentTransactionId(props: {
  admin: AdminPayload;
  paymentTransactionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { paymentTransactionId } = props;

  // Ensure the transaction exists and is not already deleted
  const transaction =
    await MyGlobal.prisma.ai_commerce_payment_transactions.findFirst({
      where: {
        id: paymentTransactionId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!transaction) {
    throw new Error("Payment transaction not found or already deleted");
  }

  const now = toISOStringSafe(new Date());

  // Perform the soft delete (update deleted_at and updated_at)
  await MyGlobal.prisma.ai_commerce_payment_transactions.update({
    where: { id: paymentTransactionId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });

  // NOTE: If the business requires audit logging for this action,
  // add logic to insert an audit record once a compliant audit log table is present in the payment schema.
}
