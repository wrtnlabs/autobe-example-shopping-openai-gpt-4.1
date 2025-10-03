import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminOrdersOrderIdPaymentsPaymentId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  paymentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find payment strictly matching orderId/paymentId, not already deleted
  const payment = await MyGlobal.prisma.shopping_mall_payments.findFirst({
    where: {
      id: props.paymentId,
      shopping_mall_order_id: props.orderId,
      deleted_at: null,
    },
  });
  if (!payment) {
    throw new HttpException("Payment not found", 404);
  }

  // 2. Check not settled/finalized: status==="paid" or confirmed_at exists
  if (
    payment.status === "paid" ||
    (payment.confirmed_at !== null && payment.confirmed_at !== undefined)
  ) {
    throw new HttpException("Cannot delete settled/reconciled payment", 409);
  }

  // 3. Soft-delete payment (set deleted_at to now)
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_payments.update({
    where: { id: props.paymentId },
    data: { deleted_at: now },
  });
}
