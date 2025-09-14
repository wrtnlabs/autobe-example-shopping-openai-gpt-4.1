import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderCancellation";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Retrieve a specific order cancellation record
 * (ai_commerce_order_cancellations).
 *
 * Retrieves the detail data of a cancellation request bound to an order,
 * validating buyer's permissions and correct association. Ensures that only the
 * buyer who owns the order can view the cancellation, and that the cancellation
 * actually matches the requested order.
 *
 * @param props - The function parameters.
 * @param props.buyer - The authenticated buyer's payload (must be the owner of
 *   the order).
 * @param props.orderId - The order's unique ID (UUID) to which the cancellation
 *   must belong.
 * @param props.cancellationId - The cancellation record's unique ID (UUID)
 *   being requested.
 * @returns The complete cancellation record, mapped to
 *   IAiCommerceOrderCancellation structure.
 * @throws {Error} If the cancellation doesn't exist or doesn't match the
 *   supplied order, or if the buyer is not authorized (is not the order
 *   owner).
 */
export async function getaiCommerceBuyerOrdersOrderIdCancellationsCancellationId(props: {
  buyer: BuyerPayload;
  orderId: string & tags.Format<"uuid">;
  cancellationId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceOrderCancellation> {
  const { buyer, orderId, cancellationId } = props;

  // Step 1: Find cancellation, required id/order match
  const cancellation =
    await MyGlobal.prisma.ai_commerce_order_cancellations.findFirst({
      where: {
        id: cancellationId,
        order_id: orderId,
      },
    });
  if (cancellation === null) {
    throw new Error("Cancellation record not found.");
  }

  // Step 2: Confirm order ownership by buyer
  const order = await MyGlobal.prisma.ai_commerce_orders.findUnique({
    where: { id: cancellation.order_id },
  });
  if (!order || order.buyer_id !== buyer.id) {
    throw new Error("Unauthorized: Buyer does not own the order.");
  }

  // Step 3: Map fields to DTO type (all date fields transformed)
  return {
    id: cancellation.id,
    order_id: cancellation.order_id,
    actor_id: cancellation.actor_id,
    cancellation_code: cancellation.cancellation_code,
    reason: cancellation.reason ?? undefined,
    status: cancellation.status,
    requested_at: toISOStringSafe(cancellation.requested_at),
    approved_at:
      cancellation.approved_at !== null &&
      cancellation.approved_at !== undefined
        ? toISOStringSafe(cancellation.approved_at)
        : undefined,
    finalized_at:
      cancellation.finalized_at !== null &&
      cancellation.finalized_at !== undefined
        ? toISOStringSafe(cancellation.finalized_at)
        : undefined,
  };
}
