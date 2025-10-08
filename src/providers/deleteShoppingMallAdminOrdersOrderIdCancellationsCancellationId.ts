import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminOrdersOrderIdCancellationsCancellationId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  cancellationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, orderId, cancellationId } = props;
  // Find cancellation: must match orderId, id
  const cancellation =
    await MyGlobal.prisma.shopping_mall_order_cancellations.findFirst({
      where: {
        id: cancellationId,
        shopping_mall_order_id: orderId,
      },
      select: {
        id: true,
        status: true,
      },
    });
  if (!cancellation) {
    throw new HttpException("Cancellation not found", 404);
  }
  if (cancellation.status !== "pending") {
    throw new HttpException(
      "Cannot delete cancellation in non-pending state",
      409,
    );
  }
  // Perform hard delete since deleted_at does not exist
  await MyGlobal.prisma.shopping_mall_order_cancellations.delete({
    where: {
      id: cancellationId,
    },
  });
}
