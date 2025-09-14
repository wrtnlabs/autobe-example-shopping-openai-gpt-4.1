import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Hard delete a specific refund record from ai_commerce_order_refunds (admin
 * only).
 *
 * This operation permanently removes the specified refund (by refundId) from
 * the database, but only if it belongs to the given orderId. Admin credentials
 * are required. Refunds in immutable compliance states ('closed', 'settled',
 * 'compliance_hold') cannot be deleted for legal/data-integrity reasons. No
 * Date types are used. Operation is fully strict and immutable as required.
 *
 * @param props - Object containing admin authentication context, orderId, and
 *   refundId.
 * @param props.admin - Authenticated administrator payload.
 * @param props.orderId - UUID of the order the refund record must belong to.
 * @param props.refundId - UUID of the specific refund record to be permanently
 *   deleted.
 * @returns Promise<void>
 * @throws {Error} If refund does not exist, does not belong to order, or is in
 *   a protected state (closed, settled, compliance_hold).
 */
export async function deleteaiCommerceAdminOrdersOrderIdRefundsRefundId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  refundId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, orderId, refundId } = props;
  // Step 1: Fetch refund by id
  const refund = await MyGlobal.prisma.ai_commerce_order_refunds.findUnique({
    where: { id: refundId },
  });
  if (!refund)
    throw new Error("Refund record not found for the specified refundId");
  // Step 2: Ensure refund belongs to order
  if (refund.order_id !== orderId)
    throw new Error("Refund does not belong to the specified orderId");
  // Step 3: Validate refund status
  if (
    refund.status === "closed" ||
    refund.status === "settled" ||
    refund.status === "compliance_hold"
  ) {
    throw new Error(
      "Cannot delete refund in closed, settled, or compliance hold state",
    );
  }
  // Step 4: Hard delete
  await MyGlobal.prisma.ai_commerce_order_refunds.delete({
    where: { id: refundId },
  });
  // Step 5: (Optional) Add audit log if audit system is implemented
  // (Not implemented here due to no schema/context provided)
}
