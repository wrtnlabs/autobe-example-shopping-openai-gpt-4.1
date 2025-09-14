import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderRefund";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a refund record for a specific order in ai_commerce_order_refunds.
 *
 * This endpoint creates a new refund request associated with the specified
 * order in the ai_commerce_order_refunds table. Only an authenticated admin may
 * use this operation via the AdminAuth decorator, and the actor_id in the body
 * must match the admin's own id.
 *
 * Business workflow validation is strictly enforced: a refund may only be
 * created if the referenced order exists and no prior refund exists for that
 * order. Duplicate refunds, orderId mismatches, or actor_id discrepancies
 * result in explicit errors. All date fields are handled as branded ISO8601
 * strings. This function never uses native Date typing or unsafe assertions.
 *
 * @param props.admin Authenticated admin user payload
 * @param props.orderId Target order UUID (ai_commerce_orders.id)
 * @param props.body Refund creation data (amount, currency, reason, actor_id)
 * @returns The created refund record with all contractually required fields
 *   populated according to IAiCommerceOrderRefund
 * @throws {Error} If order does not exist, if a refund already exists for that
 *   order, or if actor_id mismatch is detected
 */
export async function postaiCommerceAdminOrdersOrderIdRefunds(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderRefund.ICreate;
}): Promise<IAiCommerceOrderRefund> {
  const { admin, orderId, body } = props;

  // Step 1: Strict actor/admin validation
  if (body.actor_id !== admin.id) {
    throw new Error("Actor mismatch: actor_id must be admin.id");
  }

  // Step 2: Confirm order exists
  const order = await MyGlobal.prisma.ai_commerce_orders.findUnique({
    where: { id: orderId },
  });
  if (!order) {
    throw new Error("Order not found");
  }

  // Step 3: Enforce one refund per order
  const previousRefund =
    await MyGlobal.prisma.ai_commerce_order_refunds.findFirst({
      where: { order_id: orderId },
    });
  if (previousRefund) {
    throw new Error("Refund already exists for this order");
  }

  // Step 4: Generate unique identifiers and timestamps (all fields as branded strings, never Date)
  const refundId: string & tags.Format<"uuid"> = v4();
  const refundCode: string = v4();
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Step 5: Create refund record (compliant with all type contracts, immutable, functional)
  const created = await MyGlobal.prisma.ai_commerce_order_refunds.create({
    data: {
      id: refundId,
      order_id: orderId,
      actor_id: admin.id,
      refund_code: refundCode,
      reason: body.reason ?? undefined,
      status: "pending",
      amount: body.amount,
      currency: body.currency,
      requested_at: now,
      // resolved_at is omitted on creation (null/undefined)
    },
  });

  // Step 6: Normalize and return as IAiCommerceOrderRefund (all date fields string & tags.Format)
  return {
    id: created.id,
    order_id: created.order_id,
    actor_id: created.actor_id,
    refund_code: created.refund_code,
    reason: created.reason ?? undefined,
    status: created.status,
    amount: created.amount,
    currency: created.currency,
    requested_at: now,
    resolved_at: created.resolved_at ?? undefined,
  };
}
