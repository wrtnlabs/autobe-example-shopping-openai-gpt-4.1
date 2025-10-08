import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefund";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerOrdersOrderIdRefundsRefundId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  refundId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderRefund.IUpdate;
}): Promise<IShoppingMallOrderRefund> {
  // 1. Find the refund by refundId & orderId (not deleted)
  const refund = await MyGlobal.prisma.shopping_mall_order_refunds.findUnique({
    where: { id: props.refundId },
  });
  if (!refund || refund.shopping_mall_order_id !== props.orderId) {
    throw new HttpException("Refund not found for this order", 404);
  }
  // 2. Verify seller owns this order
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
  });
  if (!order || order.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("No permission to update this order's refund", 403);
  }
  // 3. Prevent invalid transitions: can't re-approve/deny settled/denied/completed (business status)
  const terminalStates = ["denied", "completed", "failed"];
  if (
    refund.status &&
    terminalStates.includes(String(refund.status).toLowerCase()) &&
    props.body.status &&
    String(refund.status).toLowerCase() !==
      String(props.body.status).toLowerCase()
  ) {
    throw new HttpException("Cannot transition from final state", 400);
  }
  // 4. Build update fields (support status, explanation, updated_at; ignore unknown fields)
  const updated = await MyGlobal.prisma.shopping_mall_order_refunds.update({
    where: { id: props.refundId },
    data: {
      ...(props.body.status !== undefined ? { status: props.body.status } : {}),
      ...(props.body.explanation !== undefined
        ? { explanation: props.body.explanation }
        : {}),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // 5. Return as IShoppingMallOrderRefund (all fields, correct types)
  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    refunded_payment_id: updated.refunded_payment_id ?? undefined,
    initiator_customer_id: updated.initiator_customer_id ?? undefined,
    initiator_admin_id: updated.initiator_admin_id ?? undefined,
    reason_code: updated.reason_code,
    status: updated.status,
    refund_amount: updated.refund_amount,
    currency: updated.currency,
    requested_at: toISOStringSafe(updated.requested_at),
    settled_at: updated.settled_at
      ? toISOStringSafe(updated.settled_at)
      : undefined,
    explanation: updated.explanation ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
