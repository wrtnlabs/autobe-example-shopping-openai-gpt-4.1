import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderCancellation";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Create a new order cancellation request (ai_commerce_order_cancellations).
 *
 * Allows a seller to file a cancellation request for an order in which they are
 * a participant. This function enforces all business authorization logic,
 * preventing unauthorized or duplicate requests. Creates a new cancellation
 * entry in ai_commerce_order_cancellations and returns the DTO conforming
 * object.
 *
 * @param props - The function arguments
 * @param props.seller - The authenticated seller initiating the cancellation
 * @param props.orderId - The order to cancel (must be associated with seller)
 * @param props.body - Cancellation creation request: includes the reason and
 *   optional status
 * @returns The newly created order cancellation record
 * @throws {Error} If the seller is not allowed to cancel the given order or if
 *   a duplicate active cancellation exists
 */
export async function postaiCommerceSellerOrdersOrderIdCancellations(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderCancellation.ICreate;
}): Promise<IAiCommerceOrderCancellation> {
  const { seller, orderId, body } = props;

  // 1. Find current, valid seller row (mapping buyer_id → seller.id for product check)
  const sellerRow = await MyGlobal.prisma.ai_commerce_seller.findFirst({
    where: {
      buyer_id: seller.id,
      deleted_at: null,
      status: { in: ["active", "under_review", "suspended"] },
    },
    select: { id: true },
  });
  if (!sellerRow) throw new Error("Seller not found or not active");

  // 2. Ensure order exists and is not deleted
  const order = await MyGlobal.prisma.ai_commerce_orders.findFirst({
    where: {
      id: orderId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!order) throw new Error("Order not found");

  // 3. Seller must own at least one order item in this order
  const itemCount = await MyGlobal.prisma.ai_commerce_order_items.count({
    where: {
      order_id: orderId,
      seller_id: sellerRow.id,
    },
  });
  if (itemCount === 0) throw new Error("Seller not authorized for this order");

  // 4. Prevent duplicate active cancellation (requested|processing)
  const dup = await MyGlobal.prisma.ai_commerce_order_cancellations.findFirst({
    where: {
      order_id: orderId,
      actor_id: seller.id,
      status: { in: ["requested", "processing"] },
    },
    select: { id: true },
  });
  if (dup) throw new Error("Duplicate cancellation request");

  // 5. Prepare timestamps (ISO string) and create new cancellation entry
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const cancellation =
    await MyGlobal.prisma.ai_commerce_order_cancellations.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        order_id: orderId,
        actor_id: seller.id,
        cancellation_code: v4(), // Generate unique code
        reason: body.reason ?? undefined,
        status: body.status ?? "requested",
        requested_at: now,
        approved_at: null, // Not yet approved
        finalized_at: null, // Not yet finalized
      },
    });

  // 6. Format and return DTO strictly following IAiCommerceOrderCancellation type
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
