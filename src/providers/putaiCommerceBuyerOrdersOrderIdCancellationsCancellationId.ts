import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderCancellation";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Update an order cancellation request (ai_commerce_order_cancellations).
 *
 * This endpoint allows an authenticated buyer to modify their own cancellation
 * record for a given order. Only the owning buyer (actor) can perform the
 * update, and only the fields 'status' and 'reason' can be changed. Business
 * validation ensures ownership and update integrity. All date and time values
 * are handled as string & tags.Format<'date-time'> and converted properly. No
 * native Date type or 'as' assertion is used.
 *
 * @param props - Buyer: BuyerPayload - Authenticated buyer object orderId: ID
 *   of the order associated with the cancellation cancellationId: ID of the
 *   cancellation record to update body: IUpdate DTO (status, reason updatable)
 * @returns The updated IAiCommerceOrderCancellation object
 * @throws {Error} If not found, unauthorized, or update is invalid
 */
export async function putaiCommerceBuyerOrdersOrderIdCancellationsCancellationId(props: {
  buyer: BuyerPayload;
  orderId: string & tags.Format<"uuid">;
  cancellationId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderCancellation.IUpdate;
}): Promise<IAiCommerceOrderCancellation> {
  const { buyer, orderId, cancellationId, body } = props;
  // Step 1: Find & authorize record
  const cancellation =
    await MyGlobal.prisma.ai_commerce_order_cancellations.findFirst({
      where: {
        id: cancellationId,
        order_id: orderId,
        actor_id: buyer.id,
      },
    });
  if (!cancellation) {
    throw new Error("Cancellation not found or not owned by buyer");
  }
  // Step 2: Update allowed fields only (no Date or as usage)
  const updated = await MyGlobal.prisma.ai_commerce_order_cancellations.update({
    where: { id: cancellationId },
    data: {
      status: typeof body.status !== "undefined" ? body.status : undefined,
      reason: typeof body.reason !== "undefined" ? body.reason : undefined,
    },
  });

  // Step 3: Return as strict IAiCommerceOrderCancellation (convert all dates to proper format, not Date)
  return {
    id: updated.id,
    order_id: updated.order_id,
    actor_id: updated.actor_id,
    cancellation_code: updated.cancellation_code,
    reason: typeof updated.reason !== "undefined" ? updated.reason : undefined,
    status: updated.status,
    requested_at: toISOStringSafe(updated.requested_at),
    approved_at:
      typeof updated.approved_at === "undefined" || updated.approved_at === null
        ? undefined
        : toISOStringSafe(updated.approved_at),
    finalized_at:
      typeof updated.finalized_at === "undefined" ||
      updated.finalized_at === null
        ? undefined
        : toISOStringSafe(updated.finalized_at),
  };
}
