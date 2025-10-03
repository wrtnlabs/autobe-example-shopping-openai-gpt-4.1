import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerOrdersOrderIdAfterSaleServicesAfterSaleServiceId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  afterSaleServiceId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, orderId, afterSaleServiceId } = props;

  // Find the after-sale service by ID and order ID
  const afterSale =
    await MyGlobal.prisma.shopping_mall_after_sale_services.findFirst({
      where: {
        id: afterSaleServiceId,
        shopping_mall_order_id: orderId,
        deleted_at: null,
      },
    });

  if (!afterSale) {
    throw new HttpException("After-sales service record not found.", 404);
  }

  // Fetch order_items for the order (with product->shopping_mall_seller_id)
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: { shopping_mall_order_id: orderId },
    include: {
      product: {
        select: { shopping_mall_seller_id: true },
      },
    },
  });

  // Check that seller owns at least one product in the order
  const sellerOwns = orderItems.some(
    (item) => item.product?.shopping_mall_seller_id === seller.id,
  );
  if (!sellerOwns) {
    throw new HttpException(
      "Unauthorized: You can only delete after-sales service for your own orders.",
      403,
    );
  }

  // Restrict by status
  if (
    afterSale.status === "completed" ||
    afterSale.status === "escalated" ||
    afterSale.status === "locked"
  ) {
    throw new HttpException(
      "Cannot delete after-sales service in completed, escalated, or locked state.",
      400,
    );
  }

  // Soft delete (set deleted_at)
  await MyGlobal.prisma.shopping_mall_after_sale_services.update({
    where: { id: afterSaleServiceId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
