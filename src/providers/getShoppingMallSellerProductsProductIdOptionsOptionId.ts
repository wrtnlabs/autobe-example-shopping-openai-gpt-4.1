import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOption";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerProductsProductIdOptionsOptionId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductOption> {
  // Find option with correct product+option ID
  const option = await MyGlobal.prisma.shopping_mall_product_options.findUnique(
    {
      where: { id: props.optionId },
    },
  );
  if (!option || option.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Product option not found for given product", 404);
  }
  // Join through product to verify seller ownership
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: option.shopping_mall_product_id },
    select: { shopping_mall_seller_id: true },
  });
  if (!product || product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: You do not own this product", 403);
  }
  return {
    id: option.id,
    shopping_mall_product_id: option.shopping_mall_product_id,
    name: option.name,
    required: option.required,
    position: option.position,
    created_at: toISOStringSafe(option.created_at),
    updated_at: toISOStringSafe(option.updated_at),
    deleted_at:
      option.deleted_at !== undefined && option.deleted_at !== null
        ? toISOStringSafe(option.deleted_at)
        : undefined,
  };
}
