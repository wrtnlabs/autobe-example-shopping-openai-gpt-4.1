import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerOrdersOrderIdCancellationsCancellationId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  cancellationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const cancellation =
    await MyGlobal.prisma.shopping_mall_order_cancellations.findFirst({
      where: {
        id: props.cancellationId,
        shopping_mall_order_id: props.orderId,
      },
    });
  if (!cancellation) {
    throw new HttpException("Not found", 404);
  }
  if (cancellation.initiator_customer_id !== props.customer.id) {
    throw new HttpException(
      "Unauthorized: Only creator can delete this request",
      403,
    );
  }
  const finalized = [
    "approved",
    "denied",
    "completed",
    "resolved",
    "finalized",
    "closed",
  ];
  if (cancellation.status && finalized.includes(cancellation.status)) {
    throw new HttpException(
      "Cannot delete an already finalized cancellation",
      409,
    );
  }
  await MyGlobal.prisma.shopping_mall_order_cancellations.delete({
    where: { id: props.cancellationId },
  });
}
