import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Hard delete a specific payment record from the ai_commerce_payments subsystem
 * (irreversible).
 *
 * This endpoint deletes a payment by id from ai_commerce_payments, but only if
 * it is not settled (status !== 'paid'), not confirmed, and not linked to any
 * order. This operation is strictly admin-only and leaves no recoverable
 * record; use with extreme caution.
 *
 * @param props - Admin: Authenticated administrator credentials for the
 *   operation paymentId: Unique identifier for the payment record to delete
 * @returns Void
 * @throws {Error} If payment record does not exist for the provided id
 * @throws {Error} If payment is already settled (status === 'paid') or has
 *   confirmation timestamp
 * @throws {Error} If payment is linked in ai_commerce_order_payments (foreign
 *   key constraint)
 */
export async function deleteaiCommerceAdminPaymentsPaymentId(props: {
  admin: AdminPayload;
  paymentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find the payment record
  const payment = await MyGlobal.prisma.ai_commerce_payments.findFirst({
    where: { id: props.paymentId },
  });
  if (!payment) {
    throw new Error("No such payment transaction");
  }
  // 2. Business rules: payment cannot be deleted if settled or confirmed
  if (payment.status === "paid" || payment.confirmed_at !== null) {
    throw new Error("Cannot delete: payment is settled or confirmed");
  }
  // 3. Forbid if there is any order linking this payment
  const isLinked = await MyGlobal.prisma.ai_commerce_order_payments.findFirst({
    where: { payment_id: props.paymentId },
  });
  if (isLinked) {
    throw new Error(
      "Cannot delete: payment is linked to an order and cannot be erased",
    );
  }
  // 4. Perform hard delete
  await MyGlobal.prisma.ai_commerce_payments.delete({
    where: { id: props.paymentId },
  });
  // 5. Function returns void
}
