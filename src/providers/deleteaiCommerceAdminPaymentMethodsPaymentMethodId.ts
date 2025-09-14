import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently deletes a payment method by its UUID from the
 * ai_commerce_payment_methods table.
 *
 * Only system administrators (admins) can execute this operation. The deletion
 * is a hard delete—removing the payment method fully from the database, not a
 * soft delete—so the payment method and its configuration are permanently
 * removed.
 *
 * Referential integrity must be observed; attempting to delete a non-existent
 * payment methodId will result in an error. This function does not update
 * dependent payment records, but allows deletion when no such policy blocks.
 *
 * @param props - Parameters for the deletion operation
 * @param props.admin - Authenticated admin performing the operation
 *   (authorization enforced)
 * @param props.paymentMethodId - UUID identifying the payment method to delete
 * @returns Promise<void> (no return content)
 * @throws {Error} If the payment method does not exist
 */
export async function deleteaiCommerceAdminPaymentMethodsPaymentMethodId(props: {
  admin: AdminPayload;
  paymentMethodId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { paymentMethodId } = props;

  // Step 1: Check for existence; throw controlled error if not found
  const paymentMethod =
    await MyGlobal.prisma.ai_commerce_payment_methods.findFirst({
      where: { id: paymentMethodId },
    });
  if (!paymentMethod) {
    throw new Error("Payment method not found");
  }

  // Step 2: Hard delete - this removes the record permanently (not soft delete)
  await MyGlobal.prisma.ai_commerce_payment_methods.delete({
    where: { id: paymentMethodId },
  });
}
