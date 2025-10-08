import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminProductsProductIdSkus(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSku.ICreate;
}): Promise<IShoppingMallProductSku> {
  // 1. Confirm product exists (admins can create SKU for any existing product)
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: { id: props.productId, deleted_at: null },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  // 2. sku_code uniqueness (globally, hard error if exists)
  const duplicateSkuCode =
    await MyGlobal.prisma.shopping_mall_product_skus.findFirst({
      where: { sku_code: props.body.sku_code },
      select: { id: true },
    });
  if (duplicateSkuCode) {
    throw new HttpException(
      "Duplicate sku_code. SKU code must be globally unique.",
      409,
    );
  }
  // 3. name uniqueness within the same product
  const duplicateName =
    await MyGlobal.prisma.shopping_mall_product_skus.findFirst({
      where: {
        shopping_mall_product_id: props.productId,
        name: props.body.name,
      },
      select: { id: true },
    });
  if (duplicateName) {
    throw new HttpException(
      "Duplicate SKU name in product. Name must be unique per product.",
      409,
    );
  }
  // 4. price must be positive
  if (props.body.price <= 0) {
    throw new HttpException("SKU price must be a positive value.", 400);
  }
  const now = toISOStringSafe(new Date());
  // 5. Insert new SKU
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
  // 6. Return DTO (convert all fields, match IShoppingMallProductSku)
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
      created.deleted_at != null
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
