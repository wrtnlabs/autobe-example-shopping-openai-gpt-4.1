import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderCancellation";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Update an order cancellation request (ai_commerce_order_cancellations).
 *
 * This endpoint allows an authenticated seller to update status, reason, or
 * contextual fields of an order cancellation belonging to a specific order, but
 * only if the seller owns at least one item in that order, and only while the
 * cancellation has not been finalized. Business logic prevents modification
 * after finalization and ensures the operation is authorized. Only 'status' and
 * 'reason' fields may be updated; all other fields are immutable.
 *
 * @param props - Properties including seller authentication, orderId,
 *   cancellationId, and update body.
 * @param props.seller - Authenticated seller making the update (payload).
 * @param props.orderId - UUID for the order associated with the cancellation.
 * @param props.cancellationId - UUID for the cancellation record to update.
 * @param props.body - Update payload specifying new status and/or reason.
 * @returns The updated cancellation record as IAiCommerceOrderCancellation.
 * @throws {Error} If the cancellation is not found, the seller lacks
 *   permission, or the request is invalid.
 */
export async function putaiCommerceSellerOrdersOrderIdCancellationsCancellationId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  cancellationId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderCancellation.IUpdate;
}): Promise<IAiCommerceOrderCancellation> {
  const { seller, orderId, cancellationId, body } = props;

  // Fetch cancellation record and ensure it matches the specified order
  const cancellation =
    await MyGlobal.prisma.ai_commerce_order_cancellations.findUnique({
      where: { id: cancellationId },
    });
  if (!cancellation || cancellation.order_id !== orderId) {
    throw new Error("Order cancellation not found for this order.");
  }

  // Authorization: seller must own at least one item in this order
  const hasSellerItem = await MyGlobal.prisma.ai_commerce_order_items.findFirst(
    {
      where: {
        order_id: orderId,
        seller_id: seller.id,
      },
    },
  );
  if (!hasSellerItem) {
    throw new Error(
      "Forbidden: Seller has no items in this order and cannot update the cancellation.",
    );
  }

  // Prevent updates after finalization
  if (cancellation.finalized_at !== null) {
    throw new Error(
      "This cancellation has already been finalized and cannot be updated.",
    );
  }

  // Only allow updating status & reason
  const updateData = {
    ...(body.status !== undefined && { status: body.status }),
    ...(body.reason !== undefined && { reason: body.reason }),
  };

  const updated = await MyGlobal.prisma.ai_commerce_order_cancellations.update({
    where: { id: cancellationId },
    data: updateData,
  });

  // Format output as IAiCommerceOrderCancellation (with proper date string conversion and null/undefined handling)
  return {
    id: updated.id,
    order_id: updated.order_id,
    actor_id: updated.actor_id,
    cancellation_code: updated.cancellation_code,
    reason: updated.reason ?? undefined,
    status: updated.status,
    requested_at: toISOStringSafe(updated.requested_at),
    approved_at: updated.approved_at
      ? toISOStringSafe(updated.approved_at)
      : updated.approved_at === null
        ? null
        : undefined,
    finalized_at: updated.finalized_at
      ? toISOStringSafe(updated.finalized_at)
      : updated.finalized_at === null
        ? null
        : undefined,
  };
}
