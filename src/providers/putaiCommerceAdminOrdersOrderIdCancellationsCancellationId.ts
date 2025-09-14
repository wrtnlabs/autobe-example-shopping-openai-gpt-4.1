import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderCancellation";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an order cancellation request (ai_commerce_order_cancellations).
 *
 * Permits a system administrator to update the status or reason of a specific
 * order cancellation, enforcing update restrictions for finalized/closed
 * states, validating the association to the requested order, and returning the
 * fully updated cancellation record. Input follows
 * IAiCommerceOrderCancellation.IUpdate; only the fields explicitly allowed by
 * schema are updatable. All date-type values are returned as branded ISO
 * strings.
 *
 * @param props - Parameters for update operation
 * @param props.admin - Authenticated admin (system administrator)
 * @param props.orderId - UUID of the target order
 * @param props.cancellationId - UUID of the target cancellation record
 * @param props.body - Update payload (fields: status, reason)
 * @returns The fully updated IAiCommerceOrderCancellation object
 * @throws {Error} If the order cancellation does not exist for the given
 *   orderId/cancellationId, or if attempting to update a finalized
 *   cancellation
 */
export async function putaiCommerceAdminOrdersOrderIdCancellationsCancellationId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  cancellationId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderCancellation.IUpdate;
}): Promise<IAiCommerceOrderCancellation> {
  const { admin, orderId, cancellationId, body } = props;

  // Find the existing cancellation record scoped to this order
  const cancellation =
    await MyGlobal.prisma.ai_commerce_order_cancellations.findFirstOrThrow({
      where: {
        id: cancellationId,
        order_id: orderId,
      },
    });

  // Deny updates if current status is finalized (business rule: status === 'completed')
  if (cancellation.status === "completed") {
    throw new Error(
      "Cannot update an already finalized (completed) cancellation.",
    );
  }

  // Update only the permitted fields
  const updated = await MyGlobal.prisma.ai_commerce_order_cancellations.update({
    where: { id: cancellationId },
    data: {
      status: body.status ?? undefined,
      reason: body.reason ?? undefined,
    },
  });

  return {
    id: updated.id,
    order_id: updated.order_id,
    actor_id: updated.actor_id,
    cancellation_code: updated.cancellation_code,
    reason: updated.reason ?? undefined,
    status: updated.status,
    requested_at: toISOStringSafe(updated.requested_at),
    approved_at:
      updated.approved_at !== null && updated.approved_at !== undefined
        ? toISOStringSafe(updated.approved_at)
        : undefined,
    finalized_at:
      updated.finalized_at !== null && updated.finalized_at !== undefined
        ? toISOStringSafe(updated.finalized_at)
        : undefined,
  };
}
