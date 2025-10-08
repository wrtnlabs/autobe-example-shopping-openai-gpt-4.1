import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefund";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminOrdersOrderIdRefundsRefundId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  refundId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderRefund> {
  const refund = await MyGlobal.prisma.shopping_mall_order_refunds.findFirst({
    where: {
      id: props.refundId,
      shopping_mall_order_id: props.orderId,
    },
  });
  if (!refund) {
    throw new HttpException("Refund not found for this order", 404);
  }
  return {
    id: refund.id,
    shopping_mall_order_id: refund.shopping_mall_order_id,
    refunded_payment_id: refund.refunded_payment_id ?? undefined,
    initiator_customer_id: refund.initiator_customer_id ?? undefined,
    initiator_admin_id: refund.initiator_admin_id ?? undefined,
    reason_code: refund.reason_code,
    status: refund.status,
    refund_amount: refund.refund_amount,
    currency: refund.currency,
    requested_at: toISOStringSafe(refund.requested_at),
    settled_at: refund.settled_at
      ? toISOStringSafe(refund.settled_at)
      : undefined,
    explanation: refund.explanation ?? undefined,
    created_at: toISOStringSafe(refund.created_at),
    updated_at: toISOStringSafe(refund.updated_at),
  };
}
