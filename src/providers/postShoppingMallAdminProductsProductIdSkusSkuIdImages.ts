import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCatalogImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogImage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminProductsProductIdSkusSkuIdImages(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
  body: IShoppingMallCatalogImage.ICreate;
}): Promise<IShoppingMallCatalogImage> {
  const { admin, productId, skuId, body } = props;

  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: productId,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findFirst({
    where: {
      id: skuId,
      shopping_mall_product_id: productId,
      deleted_at: null,
    },
  });
  if (!sku) {
    throw new HttpException("SKU not found or does not belong to product", 404);
  }

  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_catalog_images.create({
    data: {
      id: v4(),
      shopping_mall_product_id: productId,
      shopping_mall_product_sku_id: skuId,
      url: body.url,
      alt_text: body.alt_text ?? undefined,
      display_order: body.display_order,
      created_at: now,
    },
  });

  return {
    id: created.id,
    shopping_mall_product_id: (created.shopping_mall_product_id ??
      undefined) satisfies string | undefined as string | undefined,
    shopping_mall_product_sku_id: (created.shopping_mall_product_sku_id ??
      undefined) satisfies string | undefined as string | undefined,
    url: created.url,
    alt_text: created.alt_text ?? undefined,
    display_order: created.display_order,
    created_at: toISOStringSafe(created.created_at),
  };
}
