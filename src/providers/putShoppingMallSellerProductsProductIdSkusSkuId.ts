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

export async function putShoppingMallSellerProductsProductIdSkusSkuId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSku.IUpdate;
}): Promise<IShoppingMallProductSku> {
  const { seller, productId, skuId, body } = props;
  // Step 1: Fetch SKU and parent product for ownership validation
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findUnique({
    where: { id: skuId },
    include: {
      product: {
        select: {
          id: true,
          shopping_mall_seller_id: true,
        },
      },
    },
  });
  if (!sku || sku.shopping_mall_product_id !== productId) {
    throw new HttpException("SKU not found for this product", 404);
  }
  if (sku.product.shopping_mall_seller_id !== seller.id) {
    throw new HttpException("Unauthorized to update this SKU", 403);
  }

  // Step 2: Enforce name uniqueness (if name is supplied and changed)
  if (body.name && body.name !== sku.name) {
    const exists = await MyGlobal.prisma.shopping_mall_product_skus.findFirst({
      where: {
        shopping_mall_product_id: productId,
        name: body.name,
        id: { not: skuId },
      },
    });
    if (exists) {
      throw new HttpException("SKU name must be unique per product", 409);
    }
  }

  // Step 3: If status deactivation, check for pending orders using this SKU
  if (body.status && body.status !== "active") {
    const hasPending =
      await MyGlobal.prisma.shopping_mall_order_items.findFirst({
        where: {
          shopping_mall_product_sku_id: skuId,
          deleted_at: null,
          order: {
            deleted_at: null,
            status: { in: ["pending", "processing", "paid"] },
          },
        },
      });
    if (hasPending) {
      throw new HttpException(
        "Cannot deactivate SKU with active/pending orders",
        409,
      );
    }
  }

  // Step 4: Perform update (only provided fields, plus updated_at)
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_product_skus.update({
    where: { id: skuId },
    data: {
      sku_code: body.sku_code ?? undefined,
      name: body.name ?? undefined,
      price: body.price ?? undefined,
      status: body.status ?? undefined,
      low_stock_threshold: body.low_stock_threshold,
      main_image_url: body.main_image_url,
      updated_at: now,
    },
  });

  // Step 5: Return updated SKU formatted per DTO
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
        : (updated.low_stock_threshold ?? undefined),
    main_image_url:
      typeof updated.main_image_url === "string"
        ? updated.main_image_url
        : (updated.main_image_url ?? undefined),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
