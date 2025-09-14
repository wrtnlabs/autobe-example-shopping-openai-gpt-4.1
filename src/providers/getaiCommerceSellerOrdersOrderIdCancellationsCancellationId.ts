import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderCancellation";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Retrieve a specific order cancellation record
 * (ai_commerce_order_cancellations).
 *
 * Allows an authorized seller to fetch complete information for a particular
 * cancellation record in an order they are associated with. Checks that the
 * seller is related to the order (i.e., has at least one item in the order),
 * the cancellation exists, and matches the order. Throws errors on not found or
 * unauthorized access.
 *
 * @param props - Object containing all necessary parameters
 * @param props.seller - Authenticated seller for whom access is being checked
 * @param props.orderId - Order UUID associated with the cancellation
 * @param props.cancellationId - Cancellation record UUID
 * @returns Full cancellation record details for the order
 * @throws {Error} If the cancellation does not exist, is not for the specified
 *   order, or seller is not associated with the order
 */
export async function getaiCommerceSellerOrdersOrderIdCancellationsCancellationId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  cancellationId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceOrderCancellation> {
  const { seller, orderId, cancellationId } = props;

  const cancellation =
    await MyGlobal.prisma.ai_commerce_order_cancellations.findFirst({
      where: { id: cancellationId, order_id: orderId },
    });
  if (!cancellation) {
    throw new Error("Cancellation not found");
  }

  // Authorize seller: must have at least one order item with their seller_id for that order
  const hasSellerItem = await MyGlobal.prisma.ai_commerce_order_items.findFirst(
    {
      where: { order_id: orderId, seller_id: seller.id },
    },
  );
  if (!hasSellerItem) {
    throw new Error("Unauthorized: Seller does not have access to this order");
  }

  return {
    id: cancellation.id,
    order_id: cancellation.order_id,
    actor_id: cancellation.actor_id,
    cancellation_code: cancellation.cancellation_code,
    reason: cancellation.reason ?? undefined,
    status: cancellation.status,
    requested_at: toISOStringSafe(cancellation.requested_at),
    approved_at: cancellation.approved_at
      ? toISOStringSafe(cancellation.approved_at)
      : undefined,
    finalized_at: cancellation.finalized_at
      ? toISOStringSafe(cancellation.finalized_at)
      : undefined,
  };
}
