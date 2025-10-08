import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerOrdersOrderIdCancellationsCancellationId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  cancellationId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderCancellation.IUpdate;
}): Promise<IShoppingMallOrderCancellation> {
  // Fetch cancellation and validate - deleted_at does NOT exist in this model
  const cancellation =
    await MyGlobal.prisma.shopping_mall_order_cancellations.findUnique({
      where: { id: props.cancellationId },
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        status: true,
        shopping_mall_order_id: true,
        initiator_customer_id: true,
        initiator_seller_id: true,
        initiator_admin_id: true,
        reason_code: true,
        explanation: true,
        requested_at: true,
        resolved_at: true,
      },
    });
  if (!cancellation) {
    throw new HttpException("Cancellation not found", 404);
  }
  if (cancellation.shopping_mall_order_id !== props.orderId) {
    throw new HttpException("Cancellation does not belong to this order", 404);
  }
  if (cancellation.initiator_customer_id !== props.customer.id) {
    throw new HttpException(
      "Unauthorized: Only the requestor can update this cancellation",
      403,
    );
  }
  // Business logic for valid status transitions can be added here.

  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.shopping_mall_order_cancellations.update({
      where: { id: props.cancellationId },
      data: {
        reason_code: props.body.reason_code,
        status: props.body.status,
        explanation: props.body.explanation ?? null,
        updated_at: now,
      },
    });

  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    initiator_customer_id: updated.initiator_customer_id ?? null,
    initiator_seller_id: updated.initiator_seller_id ?? null,
    initiator_admin_id: updated.initiator_admin_id ?? null,
    reason_code: updated.reason_code,
    status: updated.status,
    explanation: updated.explanation ?? null,
    requested_at: toISOStringSafe(updated.requested_at),
    resolved_at: updated.resolved_at
      ? toISOStringSafe(updated.resolved_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
