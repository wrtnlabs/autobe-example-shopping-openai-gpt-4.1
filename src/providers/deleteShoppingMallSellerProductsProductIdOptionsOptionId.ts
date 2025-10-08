import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerProductsProductIdOptionsOptionId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, productId, optionId } = props;

  // 1. Validate that option exists and belongs to specified product
  const option = await MyGlobal.prisma.shopping_mall_product_options.findFirst({
    where: {
      id: optionId,
      shopping_mall_product_id: productId,
    },
    select: {
      id: true,
      shopping_mall_product_id: true,
    },
  });
  if (!option) {
    throw new HttpException("Product option not found for given product", 404);
  }

  // 2. Validate that seller owns the product
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: {
      id: productId,
    },
    select: {
      shopping_mall_seller_id: true,
      id: true,
    },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  if (product.shopping_mall_seller_id !== seller.id) {
    throw new HttpException(
      "Unauthorized: Only the owning seller can delete this product's options.",
      403,
    );
  }

  // 3. Check if this option has any option_values
  const optionValueIds =
    await MyGlobal.prisma.shopping_mall_product_option_values.findMany({
      where: { shopping_mall_product_option_id: optionId },
      select: { id: true },
    });
  const relevantOptionValueIds = optionValueIds.map((v) => v.id);

  if (relevantOptionValueIds.length > 0) {
    // 3b. Check if any sku_option_value references these option_value IDs
    const skuOptionInUse =
      await MyGlobal.prisma.shopping_mall_product_sku_option_values.findFirst({
        where: {
          shopping_mall_product_option_value_id: { in: relevantOptionValueIds },
        },
        select: { id: true },
      });
    if (skuOptionInUse) {
      throw new HttpException(
        "Cannot delete: Option is assigned to one or more SKUs. Remove all linked SKUs first.",
        409,
      );
    }
  }

  // 4. Hard delete the option (will also delete its option_values due to relations)
  await MyGlobal.prisma.shopping_mall_product_options.delete({
    where: {
      id: optionId,
    },
  });

  // 5. Log the option removal for auditing
  await MyGlobal.prisma.shopping_mall_admin_action_logs.create({
    data: {
      id: v4(),
      shopping_mall_admin_id: seller.id, // Set seller.id even if technically not an "admin", for audit
      affected_product_id: productId,
      action_type: "delete_option",
      action_reason: "Seller deleted product option",
      domain: "product_option",
      created_at: toISOStringSafe(new Date()),
    },
  });
}
