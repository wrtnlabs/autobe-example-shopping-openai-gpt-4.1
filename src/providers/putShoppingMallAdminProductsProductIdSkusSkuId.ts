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

export async function putShoppingMallAdminProductsProductIdSkusSkuId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSku.IUpdate;
}): Promise<IShoppingMallProductSku> {
  const { productId, skuId, body } = props;

  // Step 1. Fetch and validate SKU existence and ownership.
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findUnique({
    where: { id: skuId },
  });
  if (!sku || sku.shopping_mall_product_id !== productId) {
    throw new HttpException(
      "SKU not found or does not belong to the specified product",
      404,
    );
  }

  // Step 2. Business rule: Validate name uniqueness (if name is changing).
  if (body.name !== undefined) {
    const existingWithName =
      await MyGlobal.prisma.shopping_mall_product_skus.findFirst({
        where: {
          shopping_mall_product_id: productId,
          name: body.name,
          id: { not: skuId },
        },
      });
    if (existingWithName) {
      throw new HttpException(
        "A SKU with the same name already exists under this product",
        409,
      );
    }
  }

  // Step 3. Business rule: Validate positive price if provided.
  if (body.price !== undefined && body.price <= 0) {
    throw new HttpException("Price must be a positive number", 400);
  }

  // Step 4. Update SKU: only changed fields, updated_at always.
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_product_skus.update({
    where: { id: skuId },
    data: {
      sku_code: body.sku_code ?? undefined,
      name: body.name ?? undefined,
      price: body.price ?? undefined,
      status: body.status ?? undefined,
      low_stock_threshold: body.low_stock_threshold ?? undefined,
      main_image_url: body.main_image_url ?? undefined,
      updated_at: now,
    },
  });

  // Step 5. Output API DTO, all fields mapped, proper null/undefined for optionals and dates
  return {
    id: updated.id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    sku_code: updated.sku_code,
    name: updated.name,
    price: updated.price,
    status: updated.status,
    low_stock_threshold:
      typeof updated.low_stock_threshold === "number"
        ? updated.low_stock_threshold
        : (updated.low_stock_threshold ?? null),
    main_image_url:
      typeof updated.main_image_url === "string"
        ? updated.main_image_url
        : (updated.main_image_url ?? null),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
