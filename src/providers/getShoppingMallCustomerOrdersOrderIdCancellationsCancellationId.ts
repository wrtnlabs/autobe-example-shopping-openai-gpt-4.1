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

export async function getShoppingMallCustomerOrdersOrderIdCancellationsCancellationId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  cancellationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderCancellation> {
  const { customer, orderId, cancellationId } = props;
  // Find cancellation, ensure it belongs to orderId
  const cancellation =
    await MyGlobal.prisma.shopping_mall_order_cancellations.findFirst({
      where: {
        id: cancellationId,
        shopping_mall_order_id: orderId,
        // deleted_at: null, // removed: does not exist in where input
      },
    });
  if (!cancellation) {
    throw new HttpException("Order cancellation not found", 404);
  }
  // Auth: Only allow access to own cancellation
  if (cancellation.initiator_customer_id !== customer.id) {
    throw new HttpException(
      "Forbidden: You may only view your own order cancellations.",
      403,
    );
  }
  // Map fields as per DTO; handle nullable/optional fields & date conversion
  return {
    id: cancellation.id,
    shopping_mall_order_id: cancellation.shopping_mall_order_id,
    initiator_customer_id: cancellation.initiator_customer_id ?? undefined,
    initiator_seller_id: cancellation.initiator_seller_id ?? undefined,
    initiator_admin_id: cancellation.initiator_admin_id ?? undefined,
    reason_code: cancellation.reason_code,
    status: cancellation.status,
    explanation: cancellation.explanation ?? undefined,
    requested_at: toISOStringSafe(cancellation.requested_at),
    resolved_at: cancellation.resolved_at
      ? toISOStringSafe(cancellation.resolved_at)
      : undefined,
    created_at: toISOStringSafe(cancellation.created_at),
    updated_at: toISOStringSafe(cancellation.updated_at),
  };
}
