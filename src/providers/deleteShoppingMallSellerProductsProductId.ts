import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, productId } = props;
  // 1. Fetch product
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: productId },
  });
  if (!product) {
    throw new HttpException("Product not found.", 404);
  }
  // 2. Check if already deleted
  if (product.deleted_at !== null) {
    throw new HttpException("Product is already deleted.", 409);
  }
  // 3. Ownership check
  if (product.shopping_mall_seller_id !== seller.id) {
    throw new HttpException("Unauthorized: You do not own this product.", 403);
  }
  // 4. Prevent deletion if product belongs to active orders
  const activeOrderItems =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: {
        shopping_mall_product_id: productId,
        // Only consider non-deleted/non-cancelled order item statuses as active
        status: {
          notIn: ["cancelled", "returned", "deleted"],
        },
        deleted_at: null,
      },
    });
  if (activeOrderItems) {
    throw new HttpException(
      "Cannot delete product: it is included in active or reserved orders.",
      409,
    );
  }
  // 5. Do soft-delete by updating deleted_at
  await MyGlobal.prisma.shopping_mall_products.update({
    where: { id: productId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
