import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerOrdersOrderIdAfterSaleServicesAfterSaleServiceId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  afterSaleServiceId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, orderId, afterSaleServiceId } = props;

  // Find after-sale service, including its order
  const afterSale =
    await MyGlobal.prisma.shopping_mall_after_sale_services.findFirst({
      where: {
        id: afterSaleServiceId,
        shopping_mall_order_id: orderId,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_order_id: true,
        status: true,
        order: {
          select: {
            id: true,
            shopping_mall_customer_id: true,
          },
        },
      },
    });

  if (!afterSale) {
    throw new HttpException(
      "After-sales service not found or already deleted",
      404,
    );
  }

  // Check ownership
  if (
    !afterSale.order ||
    afterSale.order.shopping_mall_customer_id !== customer.id
  ) {
    throw new HttpException(
      "You are not authorized to delete this after-sales service",
      403,
    );
  }

  // Lock-out statuses (business rule)
  const forbiddenStatuses = ["completed", "locked", "escalated"];
  if (forbiddenStatuses.includes(afterSale.status)) {
    throw new HttpException(
      "This after-sales service is already resolved, locked or escalated and cannot be deleted",
      400,
    );
  }

  // Soft delete (update deleted_at)
  await MyGlobal.prisma.shopping_mall_after_sale_services.update({
    where: { id: afterSaleServiceId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
