import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

export async function getShoppingMallProductsProductIdSkusSkuId(props: {
  productId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductSku> {
  // Lookup SKU by id, productId, status active, soft delete not set
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findFirst({
    where: {
      id: props.skuId,
      shopping_mall_product_id: props.productId,
      status: "active",
      deleted_at: null,
    },
  });
  if (!sku) {
    throw new HttpException("SKU not found", 404);
  }

  // Lookup parent product for is_active and soft delete
  const parentProduct = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      is_active: true,
      deleted_at: null,
    },
  });
  if (!parentProduct) {
    throw new HttpException("Parent product not found or inactive", 404);
  }

  return {
    id: sku.id,
    shopping_mall_product_id: sku.shopping_mall_product_id,
    sku_code: sku.sku_code,
    name: sku.name,
    price: sku.price,
    status: sku.status,
    low_stock_threshold: sku.low_stock_threshold ?? undefined,
    main_image_url: sku.main_image_url ?? undefined,
    created_at: toISOStringSafe(sku.created_at),
    updated_at: toISOStringSafe(sku.updated_at),
    deleted_at: sku.deleted_at ? toISOStringSafe(sku.deleted_at) : undefined,
  };
}
