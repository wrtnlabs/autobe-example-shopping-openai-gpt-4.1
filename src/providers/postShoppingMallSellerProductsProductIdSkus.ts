import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerProductsProductIdSkus(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSku.ICreate;
}): Promise<IShoppingMallProductSku> {
  // Step 1: Verify product exists and is owned by this seller
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId, deleted_at: null },
  });
  if (!product || product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException(
      "Unauthorized: Not owner of product or product missing",
      403,
    );
  }
  // Step 2: Check SKU code and name uniqueness within this product
  const duplicate = await MyGlobal.prisma.shopping_mall_product_skus.findFirst({
    where: {
      shopping_mall_product_id: props.productId,
      OR: [{ sku_code: props.body.sku_code }, { name: props.body.name }],
      deleted_at: null,
    },
  });
  if (duplicate) {
    throw new HttpException(
      "Duplicate sku_code or name for SKU in product",
      409,
    );
  }
  // Step 3: Check price is positive
  if (!(props.body.price > 0)) {
    throw new HttpException("SKU price must be positive", 400);
  }
  // Step 4: Create SKU
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_product_skus.create({
    data: {
      id: v4(),
      shopping_mall_product_id: props.productId,
      sku_code: props.body.sku_code,
      name: props.body.name,
      price: props.body.price,
      status: props.body.status,
      low_stock_threshold: props.body.low_stock_threshold ?? null,
      main_image_url: props.body.main_image_url ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: created.id,
    shopping_mall_product_id: created.shopping_mall_product_id,
    sku_code: created.sku_code,
    name: created.name,
    price: created.price,
    status: created.status,
    low_stock_threshold: created.low_stock_threshold ?? undefined,
    main_image_url: created.main_image_url ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
