import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminOrdersOrderIdCancellationsCancellationId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  cancellationId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderCancellation.IUpdate;
}): Promise<IShoppingMallOrderCancellation> {
  const { orderId, cancellationId, body } = props;

  // 1. Find existing cancellation, ensure correct order
  const cancellation =
    await MyGlobal.prisma.shopping_mall_order_cancellations.findFirst({
      where: {
        id: cancellationId,
        shopping_mall_order_id: orderId,
      },
    });
  if (!cancellation)
    throw new HttpException("Cancellation request not found", 404);

  // 2. Status transition: cannot revert completed
  if (cancellation.status === "completed" && body.status !== "completed") {
    throw new HttpException(
      "Cannot revert a completed cancellation to a previous status.",
      400,
    );
  }

  // 3. Set resolved_at if moving to 'approved'/'denied' and not previously resolved
  let resolvedAt: (string & tags.Format<"date-time">) | null =
    cancellation.resolved_at ? toISOStringSafe(cancellation.resolved_at) : null;
  if (
    (body.status === "approved" || body.status === "denied") &&
    !cancellation.resolved_at
  ) {
    resolvedAt = toISOStringSafe(new Date());
  }

  const updated =
    await MyGlobal.prisma.shopping_mall_order_cancellations.update({
      where: { id: cancellationId },
      data: {
        reason_code: body.reason_code,
        status: body.status,
        explanation: body.explanation ?? undefined,
        resolved_at: resolvedAt,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    initiator_customer_id: updated.initiator_customer_id ?? undefined,
    initiator_seller_id: updated.initiator_seller_id ?? undefined,
    initiator_admin_id: updated.initiator_admin_id ?? undefined,
    reason_code: updated.reason_code,
    status: updated.status,
    explanation: updated.explanation ?? undefined,
    requested_at: toISOStringSafe(updated.requested_at),
    resolved_at: updated.resolved_at
      ? toISOStringSafe(updated.resolved_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
