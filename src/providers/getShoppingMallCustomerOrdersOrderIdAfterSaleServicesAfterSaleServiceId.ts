import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerOrdersOrderIdAfterSaleServicesAfterSaleServiceId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  afterSaleServiceId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAfterSaleService> {
  // Find after-sale service by id and orderId and ensure not soft-deleted
  const afterSale =
    await MyGlobal.prisma.shopping_mall_after_sale_services.findFirst({
      where: {
        id: props.afterSaleServiceId,
        shopping_mall_order_id: props.orderId,
        deleted_at: null,
      },
    });
  if (!afterSale) {
    throw new HttpException("After-sale service record not found", 404);
  }
  // Find the order and validate it belongs to the customer and is not soft-deleted
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: props.orderId,
      deleted_at: null,
    },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Unauthorized: Not your order", 403);
  }
  return {
    id: afterSale.id,
    shopping_mall_order_id: afterSale.shopping_mall_order_id,
    shopping_mall_delivery_id: afterSale.shopping_mall_delivery_id ?? undefined,
    case_type: afterSale.case_type,
    status: afterSale.status,
    reason: afterSale.reason ?? undefined,
    evidence_snapshot: afterSale.evidence_snapshot ?? undefined,
    resolution_message: afterSale.resolution_message ?? undefined,
    created_at: toISOStringSafe(afterSale.created_at),
    updated_at: toISOStringSafe(afterSale.updated_at),
    deleted_at: afterSale.deleted_at
      ? toISOStringSafe(afterSale.deleted_at)
      : undefined,
  };
}
