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

export async function postShoppingMallAdminProductsProductIdImages(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallCatalogImage.ICreate;
}): Promise<IShoppingMallCatalogImage> {
  // Ensure the target product exists
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_catalog_images.create({
    data: {
      id: v4(),
      shopping_mall_product_id: props.body.shopping_mall_product_id,
      shopping_mall_product_sku_id:
        props.body.shopping_mall_product_sku_id ?? undefined,
      url: props.body.url,
      alt_text:
        props.body.alt_text === undefined || props.body.alt_text === null
          ? undefined
          : props.body.alt_text,
      display_order: props.body.display_order,
      created_at: now,
    },
  });
  return {
    id: created.id,
    shopping_mall_product_id:
      created.shopping_mall_product_id === null
        ? undefined
        : (created.shopping_mall_product_id satisfies string as string),
    shopping_mall_product_sku_id:
      created.shopping_mall_product_sku_id ?? undefined,
    url: created.url,
    alt_text: created.alt_text ?? undefined,
    display_order: created.display_order,
    created_at: toISOStringSafe(created.created_at),
  };
}
