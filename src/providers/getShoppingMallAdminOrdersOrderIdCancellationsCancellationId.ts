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

export async function getShoppingMallAdminOrdersOrderIdCancellationsCancellationId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  cancellationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderCancellation> {
  const { orderId, cancellationId } = props;
  const cancellation =
    await MyGlobal.prisma.shopping_mall_order_cancellations.findFirst({
      where: {
        id: cancellationId,
        shopping_mall_order_id: orderId,
      },
    });
  if (!cancellation) {
    throw new HttpException("Order cancellation not found", 404);
  }
  return {
    id: cancellation.id,
    shopping_mall_order_id: cancellation.shopping_mall_order_id,
    initiator_customer_id: cancellation.initiator_customer_id ?? null,
    initiator_seller_id: cancellation.initiator_seller_id ?? null,
    initiator_admin_id: cancellation.initiator_admin_id ?? null,
    reason_code: cancellation.reason_code,
    status: cancellation.status,
    explanation: cancellation.explanation ?? null,
    requested_at: toISOStringSafe(cancellation.requested_at),
    resolved_at:
      cancellation.resolved_at !== null
        ? toISOStringSafe(cancellation.resolved_at)
        : null,
    created_at: toISOStringSafe(cancellation.created_at),
    updated_at: toISOStringSafe(cancellation.updated_at),
  };
}
